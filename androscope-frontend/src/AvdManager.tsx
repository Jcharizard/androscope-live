import { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Button, List, ListItem, ListItemText, 
    ListItemSecondaryAction, Chip, CircularProgress, Alert
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RefreshIcon from '@mui/icons-material/Refresh';
import { invoke } from '@tauri-apps/api/core';

interface AvdDevice {
    name: string;
    target: string;
    api_level: string;
    status: 'offline' | 'online' | 'launching';
    device_id?: string;
}

export const AvdManager = () => {
    const [avdList, setAvdList] = useState<AvdDevice[]>([]);
    const [connectedDevices, setConnectedDevices] = useState<AvdDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [launchingAvd, setLaunchingAvd] = useState<string | null>(null);

    const refreshAvdList = async () => {
        setLoading(true);
        try {
            // Get list of available AVDs
            const avds = await invoke<AvdDevice[]>('get_avd_list');
            setAvdList(avds);
            
            // Get list of connected devices
            const devices = await invoke<AvdDevice[]>('get_connected_devices');
            setConnectedDevices(devices);
        } catch (error) {
            console.error('Failed to refresh AVD list:', error);
        } finally {
            setLoading(false);
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

            <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    💡 Cold Boot launches the emulator with a fresh state, clearing all data and apps.
                </Typography>
            </Box>
        </Box>
    );
};