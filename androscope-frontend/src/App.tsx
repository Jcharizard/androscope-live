import { useEffect, useState } from 'react';
import {
    ThemeProvider, createTheme, CssBaseline, Box, Drawer, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Toolbar, Paper, Typography, Button, styled,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import AdbIcon from '@mui/icons-material/Adb';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import DnsIcon from '@mui/icons-material/Dns';
import TerminalIcon from '@mui/icons-material/Terminal';
import DownloadIcon from '@mui/icons-material/Download';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BugReportIcon from '@mui/icons-material/BugReport';
import MemoryIcon from '@mui/icons-material/Memory';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { listen, type Event } from '@tauri-apps/api/event';
import json2md from 'json2md';

import { LogcatViewer } from './LogcatViewer';
import { SecurityAlertsViewer } from './SecurityAlertsViewer';
import { NetworkMonitor } from './NetworkMonitor';
import { DeviceControl } from './DeviceControl';
import { DependencyMap } from './DependencyMap';
import { AvdManager } from './AvdManager';
import { ReverseEngineering } from './ReverseEngineering';
import MemoryAnalyzer from './MemoryAnalyzer';

// --- THEME AND STYLES ---
const drawerWidth = 240;
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00e5ff' },
    background: { default: '#1a1a1a', paper: '#242424' },
  },
});

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover },
  '&:last-child td, &:last-child th': { border: 0 },
}));


// --- DASHBOARD COMPONENT ---
const Dashboard = ({ cpuData, processes, networkEvents }: { cpuData: any[], processes: any[], networkEvents: any[] }) => (
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: '400px' }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 280 }}>
                <Typography component="h2" variant="h6" color="primary" gutterBottom>CPU Usage</Typography>
                {cpuData.length > 0 ? (
                <ResponsiveContainer>
                    <LineChart data={cpuData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis unit="%" stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                    <Line type="monotone" dataKey="usage" stroke="#00e5ff" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
                ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography>Waiting for ADB connection...</Typography>
                </Box>
                )}
            </Paper>
        </Box>
        <Box sx={{ flex: 1, minWidth: '400px' }}>
             <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 280 }}>
                <Typography component="h2" variant="h6" color="primary" gutterBottom>Running Processes</Typography>
                <TableContainer>
                <Table stickyHeader size="small">
                    <TableHead>
                    <TableRow>
                        <TableCell>PID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>User</TableCell>
                    </TableRow>
                    </TableHead>
                    <TableBody>
                    {processes.length === 0 && <TableRow><TableCell colSpan={3}>Waiting for data...</TableCell></TableRow>}
                    {processes.map((proc) => (
                        <StyledTableRow hover key={proc.pid}>
                        <TableCell>{proc.pid}</TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proc.name}</TableCell>
                        <TableCell>{proc.user}</TableCell>
                        </StyledTableRow>
                    ))}
                    </TableBody>
                </Table>
                </TableContainer>
            </Paper>
        </Box>
         <Box sx={{ flex: 1, minWidth: '100%' }}>
            <DependencyMap events={networkEvents} />
        </Box>
    </Box>
);


// --- MAIN APP COMPONENT ---
function App() {
  // State Management
  const [cpuData, setCpuData] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [logcat, setLogcat] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [networkEvents, setNetworkEvents] = useState<any[]>([]);
  const [activeView, setActiveView] = useState('AVD Manager');

  // Tauri Event Listeners
  useEffect(() => {
    const unlisten_cpu = listen('cpu', (event: Event<{ value: number }>) => {
        setCpuData(prev => [...prev.slice(-29), { name: new Date().toLocaleTimeString(), usage: event.payload.value }]);
    });
    const unlisten_processes = listen('processes', (event: Event<{ value: any[] }>) => {
        setProcesses(event.payload.value);
    });
     const unlisten_logcat = listen('logcat', (event: Event<{ value: string }>) => {
        setLogcat(prev => [...prev.slice(-999), ...event.payload.value.split('\n').filter(Boolean)]);
    });
    const unlisten_alert = listen('security_alert', (event: Event<{ value: any }>) => {
        setAlerts(prev => [...prev, event.payload.value]);
    });
    const unlisten_network = listen('network_event', (event: Event<{ value: any }>) => {
        setNetworkEvents(prev => [...prev, event.payload.value]);
    });

    return () => {
      unlisten_cpu.then((f: () => void) => f());
      unlisten_processes.then((f: () => void) => f());
      unlisten_logcat.then((f: () => void) => f());
      unlisten_alert.then((f: () => void) => f());
      unlisten_network.then((f: () => void) => f());
    };
  }, []);

    // Report Generation
  const generateReport = () => {
    const reportData = [
      { h1: 'AndroScope Session Report' },
      { p: `Report generated on ${new Date().toLocaleString()}` },
      { h2: 'Security Alerts' },
      alerts.length > 0 ? { ul: alerts.map(a => `${a.name}: ${a.description}`) } : { p: 'None' },
      { h2: 'Network Events (DNS)' },
      networkEvents.length > 0 ? { ul: networkEvents.map(e => e.name) } : { p: 'None' },
      { h2: 'Running Processes' },
      { table: { headers: ['PID', 'Name'], rows: processes.map(p => [p.pid, p.name]) } }
    ];

    const markdown = json2md(reportData);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AndroScope-Report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const menuItems = [
    { text: 'AVD Manager', icon: <PhoneAndroidIcon /> },
    { text: 'Reverse Engineering', icon: <BugReportIcon /> },
    { text: 'Memory Analyzer', icon: <MemoryIcon /> },
    { text: 'Dashboard', icon: <DashboardIcon /> },
    { text: 'Logcat Viewer', icon: <BarChartIcon /> },
    { text: 'Security Alerts', icon: <SecurityIcon /> },
    { text: 'Network Monitor', icon: <DnsIcon /> },
    { text: 'Visual Dependency Map', icon: <AccountTreeIcon /> },
    { text: 'Device Control', icon: <TerminalIcon /> },
  ];

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}>
           <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AdbIcon sx={{ mr: 1 }} />
            <Typography variant="h6" noWrap>AndroScope</Typography>
          </Toolbar>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton onClick={() => setActiveView(item.text)} selected={activeView === item.text}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3, height: '100vh', overflow: 'auto' }}>
          <Toolbar />
           <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Connection status is implicit with a desktop app, so we can remove the chip */}
            <div /> 
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={generateReport}>
              Generate Report
            </Button>
          </Box>
          
          {activeView === 'AVD Manager' && <AvdManager />}
          {activeView === 'Reverse Engineering' && <ReverseEngineering />}
          {activeView === 'Memory Analyzer' && <MemoryAnalyzer />}
          {activeView === 'Dashboard' && <Dashboard cpuData={cpuData} processes={processes} networkEvents={networkEvents} />}
          {activeView === 'Logcat Viewer' && <LogcatViewer logs={logcat} />}
          {activeView === 'Security Alerts' && <SecurityAlertsViewer alerts={alerts} />}
          {activeView === 'Network Monitor' && <NetworkMonitor events={networkEvents} />}
          {activeView === 'Visual Dependency Map' && <DependencyMap events={networkEvents} />}
          {activeView === 'Device Control' && <DeviceControl />}
          
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
