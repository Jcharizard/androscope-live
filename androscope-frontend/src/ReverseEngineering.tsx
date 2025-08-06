import { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Button, Accordion, AccordionSummary, AccordionDetails,
    List, ListItem, ListItemText, Chip, CircularProgress, Alert, Tabs, Tab,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Badge
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import AppsIcon from '@mui/icons-material/Apps';
import SecurityIcon from '@mui/icons-material/Security';
import TimelineIcon from '@mui/icons-material/Timeline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { invoke } from '@tauri-apps/api/core';
import { listen, type Event } from '@tauri-apps/api/event';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

interface NetworkConnection {
    timestamp: string;
    local_ip: string;
    local_port: string;
    remote_ip: string;
    remote_port: string;
    protocol: string;
    state: string;
    process_name: string;
    bytes_sent: string;
    bytes_received: string;
}

interface TimelineEvent {
    timestamp: string;
    milliseconds: number;
    event_type: string;
    source: string;
    description: string;
    details: string;
    severity: string;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`reverse-eng-tabpanel-${index}`}
            aria-labelledby={`reverse-eng-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

interface ApkAnalysisResult {
    package_name: string;
    version_name: string;
    version_code: string;
    min_sdk: string;
    target_sdk: string;
    permissions: string[];
    activities: string[];
    services: string[];
    receivers: string[];
    providers: string[];
    exported_components: string[];
    dangerous_permissions: string[];
    security_issues: string[];
}

interface ApkStringsResult {
    total_strings: number;
    urls: string[];
    ip_addresses: string[];
    api_keys: string[];
    crypto_keys: string[];
    hardcoded_secrets: string[];
    interesting_strings: string[];
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

export const ReverseEngineering = () => {
    const [tabValue, setTabValue] = useState(0);
    const [networkStats, setNetworkStats] = useState<string[]>([]);
    const [runningApps, setRunningApps] = useState<string[]>([]);
    const [liveConnections, setLiveConnections] = useState<NetworkConnection[]>([]);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLiveMode, setIsLiveMode] = useState(true);
    const [eventCount, setEventCount] = useState(0);
    const [importedApks, setImportedApks] = useState<ImportedApk[]>([]);
    const [selectedApkId, setSelectedApkId] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<ApkAnalysisResult | null>(null);
    const [stringsResult, setStringsResult] = useState<ApkStringsResult | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    const refreshNetworkData = async () => {
        try {
            const stats = await invoke<string[]>('get_network_stats');
            setNetworkStats(stats);
        } catch (error) {
            console.error('Failed to get network stats:', error);
        }
    };

    const refreshLiveConnections = async () => {
        try {
            const connections = await invoke<NetworkConnection[]>('get_live_network_connections');
            setLiveConnections(connections);
        } catch (error) {
            console.error('Failed to get live connections:', error);
        }
    };

    const refreshAppData = async () => {
        try {
            const apps = await invoke<string[]>('get_running_apps');
            setRunningApps(apps);
        } catch (error) {
            console.error('Failed to get app data:', error);
        }
    };

    const refreshTimelineData = async () => {
        try {
            const events = await invoke<TimelineEvent[]>('get_timeline_events');
            setTimelineEvents(events);
        } catch (error) {
            console.error('Failed to get timeline events:', error);
        }
    };

    const refreshAllData = async () => {
        setLoading(true);
        await Promise.all([
            refreshNetworkData(), 
            refreshLiveConnections(),
            refreshAppData(), 
            refreshTimelineData()
        ]);
        setLoading(false);
    };

    const toggleLiveMode = () => {
        setIsLiveMode(!isLiveMode);
    };

    const loadImportedApks = async () => {
        try {
            const apks = await invoke<ImportedApk[]>('get_imported_apks');
            setImportedApks(apks);
            if (apks.length > 0 && !selectedApkId) {
                setSelectedApkId(apks[0].id);
            }
        } catch (error) {
            console.error('Failed to load imported APKs:', error);
        }
    };

    const analyzeSelectedApk = async () => {
        if (!selectedApkId) {
            alert('Please select an APK to analyze');
            return;
        }

        setAnalysisLoading(true);
        try {
            const result = await invoke<ApkAnalysisResult>('analyze_apk_static', { apkId: selectedApkId });
            setAnalysisResult(result);
            
            // Also extract strings
            const strings = await invoke<ApkStringsResult>('extract_apk_strings', { apkId: selectedApkId });
            setStringsResult(strings);
            
            alert(`🎯 APK Analysis Complete!\n\n📦 Package: ${result.package_name}\n📱 Version: ${result.version_name}\n🔐 Permissions: ${result.permissions.length}\n⚠️ Dangerous Permissions: ${result.dangerous_permissions.length}\n🚨 Security Issues: ${result.security_issues.length}\n🔤 Strings Found: ${strings.total_strings}\n🌐 URLs: ${strings.urls.length}\n🔑 API Keys: ${strings.api_keys.length}`);
        } catch (error) {
            console.error('Failed to analyze APK:', error);
            alert('Failed to analyze APK: ' + error);
        } finally {
            setAnalysisLoading(false);
        }
    };

    useEffect(() => {
        refreshAllData();
        loadImportedApks();
        
        // Set up timeline event listener
        const unlistenTimeline = listen('timeline_event', (event: Event<TimelineEvent>) => {
            setTimelineEvents(prev => [event.payload, ...prev.slice(0, 99)]); // Keep last 100 events
            setEventCount(prev => prev + 1);
        });

        // Live mode intervals
        let networkInterval: NodeJS.Timeout;
        let liveInterval: NodeJS.Timeout;
        
        if (isLiveMode) {
            // Refresh live connections every 2 seconds for real-time monitoring
            liveInterval = setInterval(refreshLiveConnections, 2000);
            // Refresh network stats every 5 seconds
            networkInterval = setInterval(refreshNetworkData, 5000);
        }

        return () => {
            unlistenTimeline.then(fn => fn());
            if (networkInterval) clearInterval(networkInterval);
            if (liveInterval) clearInterval(liveInterval);
        };
    }, [isLiveMode]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const parseNetworkConnections = (data: string) => {
        const connections: Array<{ip: string, port: string, state: string}> = [];
        const lines = data.split('\n');
        
        for (const line of lines) {
            // Parse netstat output for active connections
            const match = line.match(/tcp.*?(\d+\.\d+\.\d+\.\d+):(\d+).*?(\w+)/);
            if (match) {
                connections.push({
                    ip: match[1],
                    port: match[2],
                    state: match[3]
                });
            }
        }
        
        return connections.slice(0, 20); // Limit to first 20 for display
    };

    const parseRunningPackages = (data: string) => {
        const packages: Array<{name: string, path: string}> = [];
        const lines = data.split('\n');
        
        for (const line of lines) {
            // Parse package list output
            const match = line.match(/package:(.*?)=(.+)/);
            if (match) {
                const path = match[1];
                const name = match[2];
                packages.push({ name, path });
            }
        }
        
        return packages.slice(0, 50); // Limit for display
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <BugReportIcon sx={{ mr: 2, color: 'error.main' }} />
                <Typography variant="h5" sx={{ flexGrow: 1 }}>
                    Reverse Engineering Suite
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant={isLiveMode ? "contained" : "outlined"}
                        startIcon={isLiveMode ? <PauseIcon /> : <PlayArrowIcon />}
                        onClick={toggleLiveMode}
                        color={isLiveMode ? "success" : "primary"}
                    >
                        {isLiveMode ? 'Live Mode' : 'Paused'}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                        onClick={refreshAllData}
                        disabled={loading}
                    >
                        {loading ? 'Analyzing...' : 'Deep Scan'}
                    </Button>
                </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
                🔍 <strong>Live Analysis Mode:</strong> This tool captures EVERYTHING happening on the device in real-time. 
                Perfect for reverse engineering apps, analyzing network behavior, and understanding app internals.
            </Alert>

            <Paper sx={{ width: '100%' }}>
                <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab 
                        icon={<Badge badgeContent={liveConnections.length} color="success"><NetworkCheckIcon /></Badge>} 
                        label="Live Network" 
                    />
                    <Tab 
                        icon={<Badge badgeContent={eventCount} color="error"><TimelineIcon /></Badge>} 
                        label="Timeline" 
                    />
                    <Tab icon={<AppsIcon />} label="App Internals" />
                    <Tab icon={<SecurityIcon />} label="Security Analysis" />
                    <Tab icon={<BugReportIcon />} label="Advanced Cracking" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            🌐 Live Network Connections
                        </Typography>
                        <Chip 
                            label={isLiveMode ? `${liveConnections.length} Active` : 'Paused'} 
                            color={isLiveMode ? 'success' : 'default'} 
                            variant="filled"
                        />
                    </Box>
                    
                    <Paper sx={{ mb: 3, p: 2 }}>
                        <TableContainer sx={{ maxHeight: 500 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Time</TableCell>
                                        <TableCell>Protocol</TableCell>
                                        <TableCell>Local</TableCell>
                                        <TableCell>Remote</TableCell>
                                        <TableCell>State</TableCell>
                                        <TableCell>Process</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {liveConnections.map((conn, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {conn.timestamp}
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={conn.protocol} 
                                                    size="small" 
                                                    color={conn.protocol === 'tcp' ? 'primary' : 'secondary'}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {conn.local_ip}:{conn.local_port}
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {conn.remote_ip}:{conn.remote_port}
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={conn.state} 
                                                    size="small" 
                                                    color={conn.state === 'ESTABLISHED' ? 'success' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>
                                                {conn.process_name}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {liveConnections.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography color="text.secondary">
                                    {isLiveMode ? 'No active connections detected...' : 'Live monitoring paused'}
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {/* Raw Network Data */}
                    {networkStats.length > 0 && (
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2">
                                    📊 Raw Network Statistics & Dumps
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                {networkStats.map((stat, index) => (
                                    <Box key={index} sx={{ mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Data Source {index + 1}:
                                        </Typography>
                                        <Box 
                                            component="pre" 
                                            sx={{ 
                                                fontSize: '0.7rem', 
                                                overflow: 'auto', 
                                                maxHeight: '200px',
                                                bgcolor: 'background.default',
                                                p: 1,
                                                border: 1,
                                                borderColor: 'divider',
                                                borderRadius: 1
                                            }}
                                        >
                                            {stat}
                                        </Box>
                                    </Box>
                                ))}
                            </AccordionDetails>
                        </Accordion>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            ⏰ Event Timeline (API Monitor Style)
                        </Typography>
                        <Chip 
                            label={`${timelineEvents.length} Events`} 
                            color="error" 
                            variant="filled"
                        />
                    </Box>
                    
                    <Alert severity="success" sx={{ mb: 2 }}>
                        <strong>🕵️ Classic Cracking Tool Style:</strong> This timeline shows every system event with millisecond precision, 
                        just like the legendary API Monitor and Process Monitor tools used to crack software!
                    </Alert>

                    <Paper sx={{ p: 2 }}>
                        <TableContainer sx={{ maxHeight: 600 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Timestamp</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Source</TableCell>
                                        <TableCell>Event</TableCell>
                                        <TableCell>Details</TableCell>
                                        <TableCell>Severity</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {timelineEvents.map((event, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {event.timestamp}
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={event.event_type} 
                                                    size="small" 
                                                    color={event.event_type === 'Network' ? 'info' : 'warning'}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>
                                                {event.source}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                {event.description}
                                            </TableCell>
                                            <TableCell sx={{ 
                                                fontFamily: 'monospace', 
                                                fontSize: '0.7rem',
                                                maxWidth: '300px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {event.details}
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={event.severity} 
                                                    size="small" 
                                                    color={
                                                        event.severity === 'critical' ? 'error' :
                                                        event.severity === 'warning' ? 'warning' : 'info'
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {timelineEvents.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography color="text.secondary">
                                    Timeline is empty. Start interacting with apps to see events appear here in real-time!
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <Typography variant="h6" gutterBottom>
                        📱 Deep App Analysis
                    </Typography>
                    
                    {runningApps.length > 0 && (
                        <Box>
                            {/* Installed Packages Table */}
                            <Paper sx={{ mb: 3, p: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Installed Packages (APKs)
                                </Typography>
                                <TableContainer sx={{ maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Package Name</TableCell>
                                                <TableCell>APK Path</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {parseRunningPackages(runningApps[0] || '').map((pkg, index) => (
                                                <TableRow key={index}>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                        {pkg.name}
                                                    </TableCell>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                        {pkg.path}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>

                            {/* Raw App Data */}
                            {runningApps.map((app, index) => (
                                <Accordion key={index}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography variant="subtitle2">
                                            App Analysis Data {index + 1}
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box 
                                            component="pre" 
                                            sx={{ 
                                                fontSize: '0.75rem', 
                                                overflow: 'auto', 
                                                maxHeight: '300px',
                                                bgcolor: 'background.paper',
                                                p: 1,
                                                border: 1,
                                                borderColor: 'divider'
                                            }}
                                        >
                                            {app}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                    <Typography variant="h6" gutterBottom>
                        🔒 Security & Behavior Analysis
                    </Typography>
                    
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <strong>Security Monitoring Active:</strong> Check the Security Alerts and Network Monitor tabs 
                        for real-time threat detection and suspicious activity analysis.
                    </Alert>

                    <List>
                        <ListItem>
                            <ListItemText 
                                primary="Real-time IOC Scanning"
                                secondary="35+ security patterns monitoring root access, crypto operations, sensitive data access"
                            />
                            <Chip label="Active" color="success" />
                        </ListItem>
                        <ListItem>
                            <ListItemText 
                                primary="Network Traffic Analysis" 
                                secondary="HTTP/HTTPS requests, API calls, DNS queries, socket connections"
                            />
                            <Chip label="Active" color="success" />
                        </ListItem>
                        <ListItem>
                            <ListItemText 
                                primary="Permission Monitoring"
                                secondary="Camera, microphone, location, contacts, SMS access tracking"
                            />
                            <Chip label="Active" color="success" />
                        </ListItem>
                        <ListItem>
                            <ListItemText 
                                primary="Behavioral Analysis"
                                secondary="Intent broadcasts, service launches, file system access, database operations"
                            />
                            <Chip label="Active" color="success" />
                        </ListItem>
                    </List>
                </TabPanel>

                <TabPanel value={tabValue} index={4}>
                    <Typography variant="h6" gutterBottom>
                        🔓 Advanced Cracking Arsenal
                    </Typography>
                    
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        <strong>⚠️ LEGAL NOTICE:</strong> These tools are for educational and authorized security testing only. 
                        Use only on applications you own or have explicit permission to test.
                    </Alert>

                    {/* APK Selection */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            📦 Select APK to Analyze:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            {importedApks.map((apk) => (
                                <Chip
                                    key={apk.id}
                                    label={`${apk.name} (${apk.package_name})`}
                                    variant={selectedApkId === apk.id ? "filled" : "outlined"}
                                    color={selectedApkId === apk.id ? "primary" : "default"}
                                    onClick={() => setSelectedApkId(apk.id)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}
                            {importedApks.length === 0 && (
                                <Alert severity="info">
                                    No APKs imported. Go to AVD Manager → Import APK to add DIVA or other apps for analysis.
                                </Alert>
                            )}
                        </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom color="error">
                                🎯 APK Analysis
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Extract comprehensive information from installed APKs including manifest, certificates, and package details.
                            </Typography>
                            <Button 
                                variant="contained" 
                                color="error" 
                                size="small"
                                onClick={analyzeSelectedApk}
                                disabled={!selectedApkId || analysisLoading}
                                startIcon={analysisLoading ? <CircularProgress size={16} /> : undefined}
                            >
                                {analysisLoading ? 'Analyzing...' : 'Analyze APK'}
                            </Button>
                            {analysisResult && (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    ✅ Analysis complete! Found {analysisResult.permissions.length} permissions, 
                                    {analysisResult.dangerous_permissions.length} dangerous permissions, 
                                    and {analysisResult.security_issues.length} security issues.
                                </Alert>
                            )}
                        </Paper>

                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom color="warning">
                                🧠 Memory Dump
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Dump app memory to find passwords, API keys, and sensitive data stored in RAM.
                            </Typography>
                            <Button 
                                variant="contained" 
                                color="warning" 
                                size="small"
                                onClick={() => {
                                    // TODO: Implement memory dump
                                    console.log("Memory dump triggered");
                                }}
                            >
                                Dump Memory
                            </Button>
                        </Paper>

                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom color="info">
                                🔒 SSL Pinning Bypass
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Bypass SSL certificate pinning to intercept HTTPS traffic with proxy tools.
                            </Typography>
                            <Button 
                                variant="contained" 
                                color="info" 
                                size="small"
                                onClick={() => {
                                    // TODO: Implement SSL bypass
                                    console.log("SSL bypass triggered");
                                }}
                            >
                                Bypass SSL
                            </Button>
                        </Paper>

                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom color="success">
                                📊 Method Tracing
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Trace method calls, parameters, and return values for deep app analysis.
                            </Typography>
                            <Button 
                                variant="contained" 
                                color="success" 
                                size="small"
                                onClick={() => {
                                    // TODO: Implement method tracing
                                    console.log("Method tracing triggered");
                                }}
                            >
                                Trace Methods
                            </Button>
                        </Paper>

                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom sx={{ color: '#9c27b0' }}>
                                📜 Certificate Analysis
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Extract and analyze app signing certificates and trust stores.
                            </Typography>
                            <Button 
                                variant="contained" 
                                sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}
                                size="small"
                                onClick={() => {
                                    // TODO: Implement certificate analysis
                                    console.log("Certificate analysis triggered");
                                }}
                            >
                                Analyze Certs
                            </Button>
                        </Paper>

                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom sx={{ color: '#ff5722' }}>
                                🚀 Frida Integration
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Dynamic instrumentation for real-time code manipulation and hooking.
                            </Typography>
                            <Button 
                                variant="contained" 
                                sx={{ bgcolor: '#ff5722', '&:hover': { bgcolor: '#e64a19' } }}
                                size="small"
                                disabled
                            >
                                Coming Soon
                            </Button>
                        </Paper>
                    </Box>

                    <Alert severity="info" sx={{ mt: 3 }}>
                        <strong>💡 Pro Tips for Cracking:</strong>
                        <br />• Always start with APK analysis to understand the app structure
                        <br />• Use SSL bypass + proxy (Burp Suite/OWASP ZAP) for traffic interception
                        <br />• Memory dumps can reveal hardcoded secrets and session tokens
                        <br />• Method tracing helps understand app logic flow and security checks
                        <br />• Combine with logcat timeline for comprehensive behavior analysis
                    </Alert>
                </TabPanel>
            </Paper>

            <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    💡 <strong>Pro Tip:</strong> Use this alongside Logcat Viewer to correlate network activity with app behavior. 
                    Perfect for understanding how apps like YouTube work internally when you interact with them.
                </Typography>
            </Box>
        </Box>
    );
};