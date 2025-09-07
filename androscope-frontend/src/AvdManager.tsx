import { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Button, List, ListItem, ListItemText, 
    ListItemSecondaryAction, Chip, CircularProgress, Alert, Grid,
    Card, CardContent, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, IconButton, Switch, FormControlLabel, Accordion,
    AccordionSummary, AccordionDetails
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RefreshIcon from '@mui/icons-material/Refresh';
import AppsIcon from '@mui/icons-material/Apps';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { emit } from '@tauri-apps/api/event';

interface AvdDevice {
    name: string;
    target: string;
    api_level: string;
    status: 'offline' | 'online' | 'launching';
    device_id?: string;
}

interface ImportedApk {
    id: string;
    name: string;
    package_name: string;
    file_path: string;
    size: number;
    auto_install: boolean;
    imported_at: string;
    last_installed?: string;
}

export const AvdManager = () => {
    const [avdList, setAvdList] = useState<AvdDevice[]>([]);
    const [connectedDevices, setConnectedDevices] = useState<AvdDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [launchingAvd, setLaunchingAvd] = useState<string | null>(null);
    
    // APK Management State
    const [importedApks, setImportedApks] = useState<ImportedApk[]>([]);
    const [apkDialog, setApkDialog] = useState(false);
    const [installingApk, setInstallingApk] = useState<string | null>(null);
    const [apkLoading, setApkLoading] = useState(false);

    const refreshAvdList = async () => {
        setLoading(true);
        try {
            // Get list of available AVDs
            const avds = await invoke<AvdDevice[]>('get_avd_list');
            setAvdList(avds);
            
            // Get list of connected devices
            const devices = await invoke<AvdDevice[]>('get_connected_devices');
            setConnectedDevices(devices);
            
            // Get list of imported APKs
            const apks = await invoke<ImportedApk[]>('get_imported_apks');
            setImportedApks(apks);
        } catch (error) {
            console.error('Failed to refresh AVD list:', error);
        } finally {
            setLoading(false);
        }
    };

    const importApk = async () => {
        console.log('importApk function called');
        try {
            console.log('About to call open dialog...');
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Android APK',
                    extensions: ['apk']
                }]
            });
            console.log('Dialog result:', selected);

            if (selected && typeof selected === 'string') {
                console.log('File selected:', selected);
                setApkLoading(true);
                const apk = await invoke<ImportedApk>('import_apk', { apkPath: selected });
                setImportedApks(prev => [...prev, apk]);
                setApkDialog(false);
            } else {
                console.log('No file selected or dialog cancelled');
            }
        } catch (error) {
            console.error('Failed to import APK:', error);
            alert('Error opening file dialog: ' + error);
        } finally {
            setApkLoading(false);
        }
    };

    const installApk = async (apkId: string) => {
        setInstallingApk(apkId);
        try {
            await invoke('install_imported_apk', { apkId });
            // Refresh to update last_installed timestamp
            refreshAvdList();
        } catch (error) {
            console.error('Failed to install APK:', error);
        } finally {
            setInstallingApk(null);
        }
    };

    const removeApk = async (apkId: string) => {
        try {
            await invoke('remove_imported_apk', { apkId });
            setImportedApks(prev => prev.filter(apk => apk.id !== apkId));
        } catch (error) {
            console.error('Failed to remove APK:', error);
        }
    };

    const toggleAutoInstall = async (apkId: string, autoInstall: boolean) => {
        try {
            await invoke('toggle_apk_auto_install', { apkId, autoInstall });
            setImportedApks(prev => prev.map(apk => 
                apk.id === apkId ? { ...apk, auto_install: autoInstall } : apk
            ));
        } catch (error) {
            console.error('Failed to toggle auto-install:', error);
        }
    };

    const launchAvd = async (avdName: string) => {
        setLaunchingAvd(avdName);
        try {
            await invoke('launch_avd', { avdName, coldBoot: true });
            // Refresh the list after a short delay to show the new device
            setTimeout(refreshAvdList, 3000);
        } catch (error) {
            console.error('Failed to launch AVD:', error);
        } finally {
            setLaunchingAvd(null);
        }
    };

    useEffect(() => {
        refreshAvdList();
        // Refresh every 5 seconds to check for new devices
        const interval = setInterval(refreshAvdList, 5000);
        return () => clearInterval(interval);
    }, []);

    // Emit connected devices whenever they change
    useEffect(() => {
        emit('connected_devices', { value: connectedDevices });
    }, [connectedDevices]);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PhoneAndroidIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ flexGrow: 1 }}>
                    Android Virtual Device Manager
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={refreshAvdList}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>

            {/* Connected Devices */}
            {connectedDevices.length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.dark' }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'success.light' }}>
                        🟢 Connected Devices ({connectedDevices.length})
                    </Typography>
                    <List dense>
                        {connectedDevices.map((device, index) => (
                            <ListItem key={index}>
                                <ListItemText
                                    primary={device.name || device.device_id}
                                    secondary={`API ${device.api_level} • ${device.target}`}
                                />
                                <ListItemSecondaryAction>
                                    <Chip 
                                        label="Online" 
                                        color="success" 
                                        size="small"
                                        variant="filled"
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Available AVDs */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    📱 Available Virtual Devices
                </Typography>
                
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : avdList.length === 0 ? (
                    <Alert severity="info">
                        No AVDs found. Create virtual devices in Android Studio first.
                    </Alert>
                ) : (
                    <List>
                        {avdList.map((avd, index) => (
                            <ListItem key={index} divider>
                                <ListItemText
                                    primary={avd.name}
                                    secondary={`${avd.target} • API Level ${avd.api_level}`}
                                />
                                <ListItemSecondaryAction>
                                    <Button
                                        variant="contained"
                                        startIcon={
                                            launchingAvd === avd.name ? 
                                            <CircularProgress size={16} /> : 
                                            <PlayArrowIcon />
                                        }
                                        onClick={() => launchAvd(avd.name)}
                                        disabled={launchingAvd === avd.name}
                                        sx={{ mr: 1 }}
                                    >
                                        {launchingAvd === avd.name ? 'Launching...' : 'Launch (Cold Boot)'}
                                    </Button>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            {/* APK Management Section */}
            <Paper sx={{ p: 2, mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AppsIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        📦 APK Management ({importedApks.length})
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setApkDialog(true)}
                        color="secondary"
                    >
                        Import APK
                    </Button>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>🎯 How it works:</strong> Import APKs here and they'll be automatically installed 
                    when you launch emulators (if auto-install is enabled). Perfect for DIVA, testing apps, etc!
                </Alert>

                {importedApks.length === 0 ? (
                    <Alert severity="warning">
                        <strong>📱 No APKs imported yet!</strong>
                        <br />Click "Import APK" to add DIVA, test apps, or any APKs you want to use.
                        <br />💡 <strong>Pro Tip:</strong> Download DIVA first: Save this link target as APK file:
                        <br />https://github.com/payatu/diva-android/releases/download/v0.4.1d/diva-beta.apk
                    </Alert>
                ) : (
                    <Grid container spacing={2}>
                        {importedApks.map((apk) => (
                            <Grid item xs={12} md={6} key={apk.id}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <AppsIcon sx={{ mr: 1, color: 'primary.main' }} />
                                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                                {apk.name}
                                            </Typography>

                                        </Box>
                                        
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            📦 {apk.package_name}
                                        </Typography>
                                        
                                        <Typography variant="caption" display="block" gutterBottom>
                                            💾 Size: {(apk.size / 1024 / 1024).toFixed(1)} MB
                                        </Typography>
                                        
                                        <Typography variant="caption" display="block" gutterBottom>
                                            📅 Imported: {new Date(apk.imported_at).toLocaleDateString()}
                                            {apk.last_installed && (
                                                <span> • Last installed: {new Date(apk.last_installed).toLocaleDateString()}</span>
                                            )}
                                        </Typography>



                                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={
                                                    installingApk === apk.id ? 
                                                    <CircularProgress size={16} /> : 
                                                    <InstallDesktopIcon />
                                                }
                                                onClick={() => installApk(apk.id)}
                                                disabled={installingApk === apk.id || connectedDevices.length === 0}
                                            >
                                                {installingApk === apk.id ? 'Installing...' : 'Install Now'}
                                            </Button>
                                            
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => removeApk(apk.id)}
                                                title="Remove APK"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>

                                        {connectedDevices.length === 0 && (
                                            <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                                                ⚠️ Launch an emulator first to install APKs
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Paper>

            {/* Import APK Dialog */}
            <Dialog open={apkDialog} onClose={() => setApkDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AppsIcon sx={{ mr: 1 }} />
                        Import APK File
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>📱 Import Process:</strong>
                        <br />1. Click "Browse & Import" to select an APK file from your computer
                        <br />2. The APK will be analyzed and stored in AndroScope
                        <br />3. Enable "Auto-Install" to automatically install it when emulators launch
                        <br />4. Use "Install Now" to install immediately on running emulators
                    </Alert>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1">📥 How to get DIVA APK</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" component="div">
                                <strong>Method 1: Direct Download</strong>
                                <br />1. Right-click this link and "Save Link As": 
                                <br /><code>https://github.com/payatu/diva-android/releases/download/v0.4.1d/diva-beta.apk</code>
                                <br />2. Save to your Downloads folder
                                <br />3. Come back and click "Browse & Import"
                                
                                <br /><br /><strong>Method 2: PowerShell Download</strong>
                                <br />1. Open PowerShell and run:
                                <br /><code>curl -o "$env:USERPROFILE\Downloads\diva-beta.apk" "https://github.com/payatu/diva-android/releases/download/v0.4.1d/diva-beta.apk"</code>
                                <br />2. APK will be saved to your Downloads folder
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApkDialog(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={apkLoading ? <CircularProgress size={16} /> : <FolderOpenIcon />}
                        onClick={importApk}
                        disabled={apkLoading}
                    >
                        {apkLoading ? 'Importing...' : 'Browse & Import'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    💡 Cold Boot launches the emulator with a fresh state, then auto-installs your imported APKs.
                    <br />🎯 Perfect workflow: Import DIVA → Launch emulator → Start cracking!
                </Typography>
            </Box>
        </Box>
    );
};