import { useState } from 'react';
import { 
  Paper, Typography, Box, Button, TextField, Stack, Grid, Card, CardContent,
  Accordion, AccordionSummary, AccordionDetails, Chip, Alert, Divider,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TerminalIcon from '@mui/icons-material/Terminal';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import StorageIcon from '@mui/icons-material/Storage';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import SpeedIcon from '@mui/icons-material/Speed';
import AppsIcon from '@mui/icons-material/Apps';
import ScreenshotMonitorIcon from '@mui/icons-material/ScreenshotMonitor';
import { invoke } from '@tauri-apps/api/core';

export const DeviceControl = () => {
  const [intentAction, setIntentAction] = useState('android.intent.action.VIEW');
  const [adbCommand, setAdbCommand] = useState('shell getprop ro.build.version.release');
  const [adbOutput, setAdbOutput] = useState('');
  const [packageName, setPackageName] = useState('com.example.app');
  const [selectedAction, setSelectedAction] = useState('install');
  const [loading, setLoading] = useState(false);

  const sendCommand = (command: string) => {
    invoke('send_adb_command', { commandKey: command });
  };

  const sendIntent = () => {
    invoke('send_intent', { intent: intentAction });
  };

  const executeAdbCommand = async () => {
    setLoading(true);
    try {
      // We'll need to add this command to the backend
      const result = await invoke('execute_adb_command', { command: adbCommand });
      setAdbOutput(result as string);
    } catch (error) {
      setAdbOutput(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const quickCommands = [
    { name: 'Device Info', command: 'shell getprop ro.product.model' },
    { name: 'Android Version', command: 'shell getprop ro.build.version.release' },
    { name: 'Screen Size', command: 'shell wm size' },
    { name: 'Battery Status', command: 'shell dumpsys battery' },
    { name: 'Running Apps', command: 'shell ps | head -20' },
    { name: 'Storage Info', command: 'shell df -h' },
    { name: 'Network Status', command: 'shell dumpsys connectivity' },
    { name: 'WiFi Info', command: 'shell dumpsys wifi' },
  ];

  const packageActions = [
    { value: 'install', label: 'Install APK', command: 'install' },
    { value: 'uninstall', label: 'Uninstall App', command: 'uninstall' },
    { value: 'start', label: 'Start App', command: 'shell am start -n' },
    { value: 'stop', label: 'Force Stop', command: 'shell am force-stop' },
    { value: 'clear', label: 'Clear Data', command: 'shell pm clear' },
    { value: 'info', label: 'Package Info', command: 'shell dumpsys package' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <TerminalIcon sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h5">
          Advanced Device Control
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        🎯 <strong>Pro Tip:</strong> Use the ADB Command Line for direct device interaction. 
        Perfect for DIVA testing, package management, and system analysis!
      </Alert>

      <Grid container spacing={3}>
        {/* ADB Command Line Interface */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TerminalIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  ADB Command Line
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Execute any ADB command directly. No need for external terminal!
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  label="ADB Command"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={adbCommand}
                  onChange={(e) => setAdbCommand(e.target.value)}
                  placeholder="shell pm list packages | grep diva"
                  helperText="Example: shell pm list packages, install app.apk, shell dumpsys package com.app"
                />
                <Button 
                  variant="contained" 
                  onClick={executeAdbCommand}
                  disabled={loading}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? 'Running...' : 'Execute'}
                </Button>
              </Box>

              {adbOutput && (
                <Box 
                  component="pre" 
                  sx={{ 
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    bgcolor: 'background.default',
                    p: 2,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider'
                  }}
                >
                  {adbOutput}
                </Box>
              )}

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Quick Commands:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {quickCommands.map((cmd, index) => (
                  <Chip
                    key={index}
                    label={cmd.name}
                    onClick={() => setAdbCommand(cmd.command)}
                    variant="outlined"
                    size="small"
                    clickable
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Quick Actions</Typography>
              </Box>
              
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button variant="contained" size="small" onClick={() => sendCommand('ENABLE_DEV_MODE')}>
                    Enable Dev Mode
                  </Button>
                  <Button variant="contained" size="small" onClick={() => sendCommand('SHOW_LAYOUT_BOUNDS')}>
                    Show Bounds
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => sendCommand('HIDE_LAYOUT_BOUNDS')}>
                    Hide Bounds
                  </Button>
                </Box>

                <Divider />

                <Typography variant="subtitle2">System Controls:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button size="small" onClick={() => setAdbCommand('reboot')}>Reboot Device</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell input keyevent 26')}>Power Button</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell input keyevent 3')}>Home Button</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell input keyevent 4')}>Back Button</Button>
                </Box>

                <Typography variant="subtitle2">Screen Controls:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button size="small" onClick={() => setAdbCommand('shell screencap /sdcard/screenshot.png')}>Screenshot</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell screenrecord /sdcard/recording.mp4')}>Start Recording</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell wm density 440')}>Reset DPI</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Package Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AppsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Package Management</Typography>
              </Box>
              
              <Stack spacing={2}>
                <TextField
                  label="Package Name"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="jakhar.aseem.diva"
                  helperText="Enter package name or APK path"
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={selectedAction}
                    label="Action"
                    onChange={(e) => setSelectedAction(e.target.value)}
                  >
                    {packageActions.map((action) => (
                      <MenuItem key={action.value} value={action.value}>
                        {action.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={() => {
                    const selectedCmd = packageActions.find(a => a.value === selectedAction);
                    if (selectedCmd) {
                      setAdbCommand(`${selectedCmd.command} ${packageName}`);
                    }
                  }}
                >
                  Execute Package Action
                </Button>

                <Typography variant="subtitle2">Quick Package Commands:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button size="small" onClick={() => setAdbCommand('shell pm list packages | grep -i diva')}>Find DIVA</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell pm list packages -3')}>User Apps</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell pm list packages -s')}>System Apps</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Intent Fuzzer */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PhoneAndroidIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Intent Fuzzer</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Send Android intents to test app behaviors and find hidden activities.
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  label="Intent Action"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={intentAction}
                  onChange={(e) => setIntentAction(e.target.value)}
                  placeholder="android.intent.action.VIEW"
                />
                <Button variant="contained" color="secondary" onClick={sendIntent}>
                  Send Intent
                </Button>

                <Typography variant="subtitle2">Common Intents:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip 
                    label="VIEW" 
                    size="small" 
                    onClick={() => setIntentAction('android.intent.action.VIEW')}
                    clickable
                  />
                  <Chip 
                    label="MAIN" 
                    size="small" 
                    onClick={() => setIntentAction('android.intent.action.MAIN')}
                    clickable
                  />
                  <Chip 
                    label="SEND" 
                    size="small" 
                    onClick={() => setIntentAction('android.intent.action.SEND')}
                    clickable
                  />
                  <Chip 
                    label="CALL" 
                    size="small" 
                    onClick={() => setIntentAction('android.intent.action.CALL')}
                    clickable
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ mr: 1 }} />
                <Typography variant="h6">System Information</Typography>
              </Box>
              
              <Stack spacing={1}>
                <Button 
                  size="small" 
                  fullWidth 
                  onClick={() => setAdbCommand('shell getprop | grep -E "(version|model|brand)"')}
                >
                  Device Details
                </Button>
                <Button 
                  size="small" 
                  fullWidth 
                  onClick={() => setAdbCommand('shell dumpsys meminfo')}
                >
                  Memory Usage
                </Button>
                <Button 
                  size="small" 
                  fullWidth 
                  onClick={() => setAdbCommand('shell dumpsys cpuinfo')}
                >
                  CPU Information
                </Button>
                <Button 
                  size="small" 
                  fullWidth 
                  onClick={() => setAdbCommand('shell dumpsys battery')}
                >
                  Battery Status
                </Button>
                <Button 
                  size="small" 
                  fullWidth 
                  onClick={() => setAdbCommand('shell df -h')}
                >
                  Storage Info
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Advanced Features Accordion */}
      <Box sx={{ mt: 3 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">🔧 Advanced Features</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>Network Tools:</Typography>
                <Stack spacing={1}>
                  <Button size="small" onClick={() => setAdbCommand('shell netstat -tuln')}>Network Connections</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell dumpsys wifi')}>WiFi Status</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell ping -c 4 8.8.8.8')}>Test Connectivity</Button>
                </Stack>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>File Operations:</Typography>
                <Stack spacing={1}>
                  <Button size="small" onClick={() => setAdbCommand('shell ls -la /sdcard/')}>List SDCard</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell find /data/data/ -name "*.db" 2>/dev/null | head -10')}>Find Databases</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell ls -la /data/data/jakhar.aseem.diva/')}>DIVA Files</Button>
                </Stack>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>Security Analysis:</Typography>
                <Stack spacing={1}>
                  <Button size="small" onClick={() => setAdbCommand('shell ps -A | grep -E "(diva|root|su)"')}>Security Processes</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell getprop ro.debuggable')}>Debug Status</Button>
                  <Button size="small" onClick={() => setAdbCommand('shell ls -la /system/bin/ | grep -E "(su|busybox)"')}>Root Tools</Button>
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Alert severity="success" sx={{ mt: 3 }}>
        <strong>🎯 DIVA Testing Commands:</strong>
        <br />• Find DIVA: <code>shell pm list packages | grep diva</code>
        <br />• Start DIVA: <code>shell am start -n jakhar.aseem.diva/.MainActivity</code>
        <br />• DIVA Files: <code>shell ls -la /data/data/jakhar.aseem.diva/</code>
        <br />• DIVA Logs: <code>logcat | grep -i diva</code>
      </Alert>
    </Box>
  );
}; 