import { useState, useMemo } from 'react';
import { Box, TextField, Paper, Typography } from '@mui/material';
import { FixedSizeList as List } from 'react-window';

interface LogcatViewerProps {
  logs: string[];
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

export const LogcatViewer = ({ logs }: LogcatViewerProps) => {
  const [filter, setFilter] = useState('');

  const filteredLogs = useMemo(() => {
    if (!filter) return logs;
    return logs.filter(log => log.toLowerCase().includes(filter.toLowerCase()));
  }, [logs, filter]);

  return (
    <Paper sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Logcat Stream
      </Typography>
      <TextField
        label="Filter Logs"
        variant="outlined"
        size="small"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 2 }}
      />
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