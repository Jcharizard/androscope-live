import { useState } from 'react';
import { Paper, Typography, Box, Button, TextField, Stack } from '@mui/material';
import { invoke } from '@tauri-apps/api/core';

export const DeviceControl = () => {
  const [intentAction, setIntentAction] = useState('android.intent.action.VIEW');

  // AppHandle is managed by Tauri and passed automatically when invoking a command
  // that requires it. We don't need to pass it from JS.
  const sendCommand = (command: string) => {
    invoke('send_adb_command', { commandKey: command });
  };

  const sendIntent = () => {
    invoke('send_intent', { intent: intentAction });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Device Control
      </Typography>
      
      <Stack spacing={2}>
        <Typography variant="subtitle1">Quick Actions</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={() => sendCommand('ENABLE_DEV_MODE')}>Enable Developer Mode</Button>
          <Button variant="contained" onClick={() => sendCommand('SHOW_LAYOUT_BOUNDS')}>Show Layout Bounds</Button>
          <Button variant="contained" onClick={() => sendCommand('HIDE_LAYOUT_BOUNDS')}>Hide Layout Bounds</Button>
        </Box>

        <Typography variant="subtitle1" sx={{ mt: 3 }}>Intent Fuzzer</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Intent Action"
            variant="outlined"
            size="small"
            fullWidth
            value={intentAction}
            onChange={(e) => setIntentAction(e.target.value)}
          />
          <Button variant="contained" color="secondary" onClick={sendIntent}>Send Intent</Button>
        </Box>
      </Stack>
    </Paper>
  );
}; 