import { useState, useMemo } from 'react';
import { Box, TextField, Paper, Typography, Button, Stack, Chip } from '@mui/material';
import { FixedSizeList as List } from 'react-window';
import { invoke } from '@tauri-apps/api/core';

interface LogcatViewerProps {
  logs: string[];
  currentApkPackage?: string;
  onClearLogs?: () => void;
  onResetFocus?: () => void;
}

// Function to add color to log lines based on priority (V, D, I, W, E)
const colorizeLog = (log: string) => {
  const parts = log.split(/\s+/);
  const priority = parts[4]; // Heuristic guess for priority
  let color = '#fff'; // Default
  if (priority === 'E') color = '#f44336'; // Error - Red
  if (priority === 'W') color = '#ff9800'; // Warning - Orange
  if (priority === 'I') color = '#4caf50'; // Info - Green
  if (priority === 'D') color = '#2196f3'; // Debug - Blue
  
  return <span style={{ color }}>{log}</span>;
};

const LogRow = ({ index, style, data }: { index: number; style: React.CSSProperties; data: string[] }) => (
  <div style={style}>
    <Typography component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre' }}>
      {colorizeLog(data[index])}
    </Typography>
  </div>
);

export const LogcatViewer = ({ logs, currentApkPackage, onClearLogs, onResetFocus }: LogcatViewerProps) => {
  const [filter, setFilter] = useState('');
  const [focusedPackage, setFocusedPackage] = useState('');

  const filteredLogs = useMemo(() => {
    if (!filter) return logs;
    return logs.filter(log => log.toLowerCase().includes(filter.toLowerCase()));
  }, [logs, filter]);

  const startFocusedLogcat = async (packageName: string) => {
    try {
      await invoke('start_focused_logcat', { packageName });
      setFocusedPackage(packageName);
      alert(`🎯 Focused Logcat Started!\n\nNow monitoring: ${packageName}\n\n✅ Logs will show [FOCUSED] prefix\n🔍 Only app-specific logs will be shown\n📱 Try your DIVA challenge again!`);
    } catch (error) {
      alert('Failed to start focused logcat: ' + error);
    }
  };

  const commonPackages = [
    'jakhar.aseem.diva',
    'com.android.chrome',
    'com.google.android.apps.messaging',
    'com.whatsapp',
    'com.facebook.katana'
  ];

  return (
    <Paper sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        📱 Logcat Stream - Android System Logger
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        Monitor real-time Android logs. Use "Focus on App" to see only specific app logs for better analysis.
        {currentApkPackage && (
          <span style={{ color: '#1976d2', fontWeight: 'bold' }}>
            {' '}Currently selected: {currentApkPackage}
          </span>
        )}
      </Typography>

      {focusedPackage && (
        <Chip 
          label={`🎯 Focused on: ${focusedPackage}`} 
          color="primary" 
          size="small" 
          sx={{ mb: 2, alignSelf: 'flex-start' }}
          onDelete={() => setFocusedPackage('')}
        />
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Filter Logs"
          variant="outlined"
          size="small"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search for: error, credit, checkout, diva..."
          sx={{ flexGrow: 1 }}
        />
        <Button 
          variant="contained" 
          color="secondary"
          onClick={() => startFocusedLogcat(currentApkPackage || 'jakhar.aseem.diva')}
          size="small"
        >
          🎯 Focus on APK
        </Button>
                         <Button 
                   variant="outlined" 
                   color="error"
                   onClick={() => onClearLogs && onClearLogs()}
                   size="small"
                 >
                   🗑️ Clear Logs
                 </Button>
                 <Button 
                   variant="outlined" 
                   color="warning"
                   onClick={async () => {
                     try {
                       await invoke('reset_focused_logcat');
                       onResetFocus && onResetFocus();
                       setFocusedPackage('');
                       alert('🔄 Focus Reset!\n\nRegular logcat stream resumed.');
                     } catch (error) {
                       alert('Failed to reset focus: ' + error);
                     }
                   }}
                   size="small"
                 >
                   🔄 Reset Focus
                 </Button>
        {!currentApkPackage && (
          <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
            Select an APK in Reverse Engineering to focus on it
          </Typography>
        )}
      </Stack>

      <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary' }}>
        📋 Quick Focus Options:
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {commonPackages.map(pkg => (
          <Chip
            key={pkg}
            label={pkg.split('.').pop() || pkg}
            size="small"
            variant="outlined"
            onClick={() => startFocusedLogcat(pkg)}
            sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
          />
        ))}
      </Stack>
      <Box sx={{ flexGrow: 1 }}>
        <List
          height={window.innerHeight - 300} // Adjust based on layout
          itemCount={filteredLogs.length}
          itemSize={20}
          itemData={filteredLogs}
          width="100%"
        >
          {LogRow}
        </List>
      </Box>
    </Paper>
  );
}; 