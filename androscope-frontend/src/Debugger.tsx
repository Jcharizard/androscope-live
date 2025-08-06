import { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Button, TextField, Accordion, AccordionSummary, AccordionDetails,
    List, ListItem, ListItemText, Chip, CircularProgress, Alert, Tabs, Tab, Dialog,
    DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, Switch, FormControlLabel,
    Grid, Card, CardContent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MemoryIcon from '@mui/icons-material/Memory';
import CodeIcon from '@mui/icons-material/Code';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HookIcon from '@mui/icons-material/AccountTree';
import { invoke } from '@tauri-apps/api/core';
import { listen, type Event } from '@tauri-apps/api/event';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

interface Breakpoint {
    id: string;
    package_name: string;
    class_name: string;
    method_name: string;
    address?: string;
    condition?: string;
    hit_count: number;
    enabled: boolean;
    timestamp: string;
}

interface DebugSession {
    package_name: string;
    process_id: string;
    attached: boolean;
    breakpoints: Breakpoint[];
    call_stack: StackFrame[];
    variables: Variable[];
    memory_regions: MemoryRegion[];
}

interface StackFrame {
    function_name: string;
    class_name: string;
    line_number?: number;
    parameters: Variable[];
}

interface Variable {
    name: string;
    type: string;
    value: string;
    address?: string;
    modifiable: boolean;
}

interface MemoryRegion {
    start_address: string;
    end_address: string;
    size: number;
    permissions: string;
    name: string;
    data?: number[];
}

interface HookResult {
    method_name: string;
    class_name: string;
    parameters: string[];
    return_value: string;
    timestamp: string;
    thread_id: string;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`debugger-tabpanel-${index}`}
            aria-labelledby={`debugger-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export const Debugger = () => {
    const [tabValue, setTabValue] = useState(0);
    const [debugSession, setDebugSession] = useState<DebugSession | null>(null);
    const [targetPackage, setTargetPackage] = useState('');
    const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
    const [callStack, setCallStack] = useState<StackFrame[]>([]);
    const [memoryRegions, setMemoryRegions] = useState<MemoryRegion[]>([]);
    const [hookResults, setHookResults] = useState<HookResult[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Breakpoint dialog state
    const [breakpointDialog, setBreakpointDialog] = useState(false);
    const [newBreakpoint, setNewBreakpoint] = useState({
        className: '',
        methodName: '',
        condition: ''
    });
    
    // Hook dialog state
    const [hookDialog, setHookDialog] = useState(false);
    const [newHook, setNewHook] = useState({
        className: '',
        methodName: ''
    });
    
    // Memory search state
    const [memorySearchTerm, setMemorySearchTerm] = useState('');
    const [memorySearchResults, setMemorySearchResults] = useState<string[]>([]);

    const attachToProcess = async () => {
        if (!targetPackage) return;
        
        setLoading(true);
        try {
            const session = await invoke<DebugSession>('attach_debugger', { 
                packageName: targetPackage 
            });
            setDebugSession(session);
        } catch (error) {
            console.error('Failed to attach debugger:', error);
        } finally {
            setLoading(false);
        }
    };

    const addBreakpoint = async () => {
        if (!debugSession || !newBreakpoint.className || !newBreakpoint.methodName) return;
        
        try {
            const breakpoint = await invoke<Breakpoint>('set_breakpoint', {
                packageName: debugSession.package_name,
                className: newBreakpoint.className,
                methodName: newBreakpoint.methodName,
                condition: newBreakpoint.condition || null
            });
            setBreakpoints(prev => [...prev, breakpoint]);
            setBreakpointDialog(false);
            setNewBreakpoint({ className: '', methodName: '', condition: '' });
        } catch (error) {
            console.error('Failed to set breakpoint:', error);
        }
    };

    const refreshCallStack = async () => {
        if (!debugSession) return;
        
        try {
            const stack = await invoke<StackFrame[]>('get_call_stack', {
                packageName: debugSession.package_name
            });
            setCallStack(stack);
        } catch (error) {
            console.error('Failed to get call stack:', error);
        }
    };

    const searchMemory = async () => {
        if (!debugSession || !memorySearchTerm) return;
        
        try {
            const results = await invoke<string[]>('search_memory_strings', {
                packageName: debugSession.package_name,
                searchTerm: memorySearchTerm
            });
            setMemorySearchResults(results);
        } catch (error) {
            console.error('Failed to search memory:', error);
        }
    };

    const installHook = async () => {
        if (!debugSession || !newHook.className || !newHook.methodName) return;
        
        try {
            await invoke<string>('hook_method', {
                packageName: debugSession.package_name,
                className: newHook.className,
                methodName: newHook.methodName
            });
            setHookDialog(false);
            setNewHook({ className: '', methodName: '' });
        } catch (error) {
            console.error('Failed to install hook:', error);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    useEffect(() => {
        // Set up event listeners for debug events
        const unlistenAttached = listen('debug_attached', (event: Event<DebugSession>) => {
            setDebugSession(event.payload);
        });

        const unlistenBreakpoint = listen('breakpoint_set', (event: Event<Breakpoint>) => {
            setBreakpoints(prev => [...prev, event.payload]);
        });

        const unlistenHook = listen('method_hooked', (event: Event<HookResult>) => {
            setHookResults(prev => [event.payload, ...prev.slice(0, 99)]);
        });

        return () => {
            unlistenAttached.then(fn => fn());
            unlistenBreakpoint.then(fn => fn());
            unlistenHook.then(fn => fn());
        };
    }, []);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <BugReportIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ flexGrow: 1 }}>
                    Advanced Debugger
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        label="Target Package"
                        value={targetPackage}
                        onChange={(e) => setTargetPackage(e.target.value)}
                        placeholder="com.example.app"
                        size="small"
                        sx={{ minWidth: 250 }}
                    />
                    <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                        onClick={attachToProcess}
                        disabled={loading || !targetPackage}
                    >
                        {debugSession ? 'Attached' : 'Attach'}
                    </Button>
                </Box>
            </Box>

            {debugSession && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    🔗 <strong>Debugger Attached!</strong> Process: {debugSession.package_name} (PID: {debugSession.process_id})
                </Alert>
            )}

            <Paper sx={{ width: '100%' }}>
                <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab icon={<CodeIcon />} label="Breakpoints" />
                    <Tab icon={<MemoryIcon />} label="Call Stack" />
                    <Tab icon={<SearchIcon />} label="Memory" />
                    <Tab icon={<HookIcon />} label="Hooks" />
                    <Tab icon={<BugReportIcon />} label="Frida" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            🎯 Breakpoints ({breakpoints.length})
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => setBreakpointDialog(true)}
                            disabled={!debugSession}
                        >
                            Add Breakpoint
                        </Button>
                    </Box>
                    
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Enabled</TableCell>
                                    <TableCell>Class</TableCell>
                                    <TableCell>Method</TableCell>
                                    <TableCell>Condition</TableCell>
                                    <TableCell>Hit Count</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {breakpoints.map((bp) => (
                                    <TableRow key={bp.id} hover>
                                        <TableCell>
                                            <Switch checked={bp.enabled} size="small" />
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>
                                            {bp.class_name}
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>
                                            {bp.method_name}
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>
                                            {bp.condition || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={bp.hit_count} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton size="small">
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small" color="error">
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            📞 Call Stack
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={refreshCallStack}
                            disabled={!debugSession}
                        >
                            Refresh
                        </Button>
                    </Box>
                    
                    <List>
                        {callStack.map((frame, index) => (
                            <ListItem key={index} divider>
                                <ListItemText
                                    primary={`${frame.class_name}.${frame.function_name}()`}
                                    secondary={`Parameters: ${frame.parameters.length}`}
                                    primaryTypographyProps={{ fontFamily: 'monospace' }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <Typography variant="h6" gutterBottom>
                        🧠 Memory Analysis
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            label="Search Term"
                            value={memorySearchTerm}
                            onChange={(e) => setMemorySearchTerm(e.target.value)}
                            placeholder="premium, license, api_key, token"
                            size="small"
                            sx={{ flexGrow: 1 }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={searchMemory}
                            disabled={!debugSession}
                        >
                            Search
                        </Button>
                    </Box>

                    {memorySearchResults.length > 0 && (
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2">
                                    🔍 Search Results ({memorySearchResults.length})
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                {memorySearchResults.map((result, index) => (
                                    <Box key={index} sx={{ mb: 2 }}>
                                        <Typography 
                                            component="pre" 
                                            sx={{ 
                                                fontSize: '0.8rem',
                                                bgcolor: 'background.default',
                                                p: 1,
                                                borderRadius: 1,
                                                overflow: 'auto'
                                            }}
                                        >
                                            {result}
                                        </Typography>
                                    </Box>
                                ))}
                            </AccordionDetails>
                        </Accordion>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            🪝 Method Hooks ({hookResults.length})
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => setHookDialog(true)}
                            disabled={!debugSession}
                        >
                            Install Hook
                        </Button>
                    </Box>
                    
                    <Grid container spacing={2}>
                        {hookResults.map((hook, index) => (
                            <Grid item xs={12} md={6} key={index}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="subtitle2" gutterBottom>
                                            {hook.class_name}.{hook.method_name}()
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Return: {hook.return_value}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            {new Date(hook.timestamp).toLocaleString()}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={4}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        🚀 Frida Dynamic Instrumentation
                    </Typography>
                    
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        <strong>⚠️ Frida Integration:</strong> Advanced runtime manipulation and bypass capabilities.
                        Requires Frida server running on the target device.
                    </Alert>

                    <Grid container spacing={3}>
                        {/* Frida Session Management */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        📱 Frida Session
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={async () => {
                                                if (!targetPackage) return;
                                                setLoading(true);
                                                try {
                                                    await invoke('start_frida_session', { packageName: targetPackage });
                                                } catch (error) {
                                                    console.error('Failed to start Frida session:', error);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading || !targetPackage}
                                        >
                                            Start Frida Session
                                        </Button>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Initialize Frida instrumentation for runtime analysis and manipulation.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Bypass Arsenal */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        🛡️ Security Bypass Arsenal
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Button
                                            variant="outlined"
                                            color="warning"
                                            onClick={async () => {
                                                if (!targetPackage) return;
                                                setLoading(true);
                                                try {
                                                    await invoke('apply_ssl_pinning_bypass', { packageName: targetPackage });
                                                } catch (error) {
                                                    console.error('SSL bypass failed:', error);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading || !targetPackage}
                                        >
                                            🔓 Bypass SSL Pinning
                                        </Button>
                                        
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={async () => {
                                                if (!targetPackage) return;
                                                setLoading(true);
                                                try {
                                                    await invoke('apply_root_detection_bypass', { packageName: targetPackage });
                                                } catch (error) {
                                                    console.error('Root bypass failed:', error);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading || !targetPackage}
                                        >
                                            🚫 Bypass Root Detection
                                        </Button>
                                        
                                        <Button
                                            variant="outlined"
                                            color="info"
                                            onClick={async () => {
                                                if (!targetPackage) return;
                                                setLoading(true);
                                                try {
                                                    await invoke('apply_debug_detection_bypass', { packageName: targetPackage });
                                                } catch (error) {
                                                    console.error('Debug bypass failed:', error);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading || !targetPackage}
                                        >
                                            🐛 Bypass Debug Detection
                                        </Button>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        One-click bypass for common Android security mechanisms.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Method Tracer */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        🎯 Method Tracer
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                        <TextField
                                            label="Class Name"
                                            placeholder="com.example.MainActivity"
                                            size="small"
                                            sx={{ flexGrow: 1 }}
                                            value={newHook.className}
                                            onChange={(e) => setNewHook(prev => ({ ...prev, className: e.target.value }))}
                                        />
                                        <TextField
                                            label="Method Name"
                                            placeholder="validateLicense"
                                            size="small"
                                            sx={{ flexGrow: 1 }}
                                            value={newHook.methodName}
                                            onChange={(e) => setNewHook(prev => ({ ...prev, methodName: e.target.value }))}
                                        />
                                        <Button
                                            variant="contained"
                                            onClick={async () => {
                                                if (!targetPackage || !newHook.className || !newHook.methodName) return;
                                                setLoading(true);
                                                try {
                                                    await invoke('create_method_tracer', {
                                                        packageName: targetPackage,
                                                        className: newHook.className,
                                                        methodName: newHook.methodName
                                                    });
                                                    setNewHook({ className: '', methodName: '', customScript: '' });
                                                } catch (error) {
                                                    console.error('Method tracer failed:', error);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading || !targetPackage || !newHook.className || !newHook.methodName}
                                        >
                                            🔍 Trace Method
                                        </Button>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Track method calls, parameters, and return values in real-time.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Common Targets for DIVA */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        🎯 DIVA Quick Targets
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        <Button
                                            size="small"
                                            onClick={() => setNewHook(prev => ({ ...prev, className: 'jakhar.aseem.diva.MainActivity', methodName: 'onOptionsItemSelected' }))}
                                        >
                                            MainActivity
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => setNewHook(prev => ({ ...prev, className: 'jakhar.aseem.diva.InsecureDataStorage1Activity', methodName: 'onCreate' }))}
                                        >
                                            InsecureStorage1
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => setNewHook(prev => ({ ...prev, className: 'jakhar.aseem.diva.LoggingActivity2', methodName: 'onCreate' }))}
                                        >
                                            Logging
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => setNewHook(prev => ({ ...prev, className: 'jakhar.aseem.diva.HardcodeIssuesActivity', methodName: 'access' }))}
                                        >
                                            Hardcode Issues
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => setNewHook(prev => ({ ...prev, className: 'jakhar.aseem.diva.SQLInjectionActivity', methodName: 'searchDB' }))}
                                        >
                                            SQL Injection
                                        </Button>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Pre-configured targets for DIVA vulnerability challenges.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Alert severity="success" sx={{ mt: 3 }}>
                        <strong>🎉 Frida Pro Tips:</strong>
                        <br />• Use SSL bypass to intercept HTTPS traffic with Burp Suite or Charles Proxy
                        <br />• Root detection bypass allows analysis on rooted devices without detection
                        <br />• Method tracing reveals app logic flow and sensitive operations
                        <br />• Debug bypass prevents apps from detecting debugging tools
                    </Alert>
                </TabPanel>
            </Paper>

            {/* Breakpoint Dialog */}
            <Dialog open={breakpointDialog} onClose={() => setBreakpointDialog(false)}>
                <DialogTitle>Add Breakpoint</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Class Name"
                        fullWidth
                        variant="outlined"
                        value={newBreakpoint.className}
                        onChange={(e) => setNewBreakpoint(prev => ({ ...prev, className: e.target.value }))}
                        placeholder="com.example.MainActivity"
                    />
                    <TextField
                        margin="dense"
                        label="Method Name"
                        fullWidth
                        variant="outlined"
                        value={newBreakpoint.methodName}
                        onChange={(e) => setNewBreakpoint(prev => ({ ...prev, methodName: e.target.value }))}
                        placeholder="onCreate"
                    />
                    <TextField
                        margin="dense"
                        label="Condition (Optional)"
                        fullWidth
                        variant="outlined"
                        value={newBreakpoint.condition}
                        onChange={(e) => setNewBreakpoint(prev => ({ ...prev, condition: e.target.value }))}
                        placeholder="parameter != null"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBreakpointDialog(false)}>Cancel</Button>
                    <Button onClick={addBreakpoint}>Add</Button>
                </DialogActions>
            </Dialog>

            {/* Hook Dialog */}
            <Dialog open={hookDialog} onClose={() => setHookDialog(false)}>
                <DialogTitle>Install Method Hook</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Class Name"
                        fullWidth
                        variant="outlined"
                        value={newHook.className}
                        onChange={(e) => setNewHook(prev => ({ ...prev, className: e.target.value }))}
                        placeholder="com.example.MainActivity"
                    />
                    <TextField
                        margin="dense"
                        label="Method Name"
                        fullWidth
                        variant="outlined"
                        value={newHook.methodName}
                        onChange={(e) => setNewHook(prev => ({ ...prev, methodName: e.target.value }))}
                        placeholder="validateLicense"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHookDialog(false)}>Cancel</Button>
                    <Button onClick={installHook}>Install</Button>
                </DialogActions>
            </Dialog>

            <Alert severity="info" sx={{ mt: 3 }}>
                <strong>🎯 Pro Cracking Tips:</strong>
                <br />• Hook premium validation methods like `isPremium()`, `validateLicense()`
                <br />• Search memory for "premium", "license", "paid", "trial" keywords
                <br />• Set breakpoints on payment-related methods
                <br />• Use call stack to understand app flow during premium checks
            </Alert>
        </Box>
    );
};