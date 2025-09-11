import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProcessManager } from './ProcessManager';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Memory as MemoryIcon,
  Security as SecurityIcon,
  VpnKey as VpnKeyIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface MemoryDump {
  timestamp: string;
  process_name: string;
  pid: string;
  memory_region: string;
  size: string;
  permissions: string;
  strings: string[];
  hex_data: string;
}

interface CryptoKey {
  timestamp: string;
  process_name: string;
  key_type: string;
  key_size: string;
  key_data: string;
  location: string;
}

const MemoryAnalyzer: React.FC = () => {
  const [memoryDumps, setMemoryDumps] = useState<MemoryDump[]>([]);
  const [extractedStrings, setExtractedStrings] = useState<string[]>([]);
  const [cryptoKeys, setCryptoKeys] = useState<CryptoKey[]>([]);
  const [processMaps, setProcessMaps] = useState<string[]>([]);
  const [apkAnalysis, setApkAnalysis] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [minStringLength, setMinStringLength] = useState(8);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStrings, setFilteredStrings] = useState<string[]>([]);
  
  const { runningProcesses, selectedProcess, setSelectedProcess } = useProcessManager();
  
  // Loading states for each operation
  const [extractStringsLoading, setExtractStringsLoading] = useState(false);
  const [dumpMemoryLoading, setDumpMemoryLoading] = useState(false);
  const [findCryptoLoading, setFindCryptoLoading] = useState(false);
  const [processMapsLoading, setProcessMapsLoading] = useState(false);
  const [analyzeApkLoading, setAnalyzeApkLoading] = useState(false);

  // Don't auto-load processes on mount - wait for user to click Refresh
  useEffect(() => {
    // Component mounted - no auto-loading
  }, []);

  // Filter strings based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStrings(extractedStrings);
    } else {
      const filtered = extractedStrings.filter(str => 
        str.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStrings(filtered);
    }
  }, [extractedStrings, searchQuery]);


  const dumpProcessMemory = async () => {
    if (!selectedProcess.trim()) {
      setError('Please select a process first');
      return;
    }

    setDumpMemoryLoading(true);
    setError(null);
    
    try {
      console.log('Calling dump_process_memory with:', selectedProcess.trim());
      const dumps: MemoryDump[] = await invoke('dump_process_memory', { 
        packageName: selectedProcess.trim() 
      });
      setMemoryDumps(dumps);
      console.log('Memory dump result:', dumps);
    } catch (err) {
      console.error('Memory dump error:', err);
      setError(`Failed to dump memory: ${err}`);
      setMemoryDumps([]);
    } finally {
      setDumpMemoryLoading(false);
    }
  };

  const extractStrings = async () => {
    if (!selectedProcess.trim()) {
      setError('Please select a process first');
      return;
    }

    setExtractStringsLoading(true);
    setError(null);
    
    try {
      console.log('Calling extract_strings_from_memory with:', { 
        package_name: selectedProcess.trim(), 
        min_length: minStringLength 
      });
      const strings: string[] = await invoke('extract_strings_from_memory', { 
        packageName: selectedProcess.trim(),
        minLength: minStringLength
      });
      setExtractedStrings(strings);
      console.log('Extract strings result:', strings.length, 'strings found');
    } catch (err) {
      console.error('Extract strings error:', err);
      setError(`Failed to extract strings: ${err}`);
      setExtractedStrings([]);
    } finally {
      setExtractStringsLoading(false);
    }
  };

  const findCryptoKeys = async () => {
    if (!selectedProcess.trim()) {
      setError('Please select a process first');
      return;
    }

    setFindCryptoLoading(true);
    setError(null);
    
    try {
      console.log('Calling find_crypto_keys with:', selectedProcess.trim());
      const keys: CryptoKey[] = await invoke('find_crypto_keys', { 
        packageName: selectedProcess.trim() 
      });
      setCryptoKeys(keys);
      console.log('Find crypto keys result:', keys);
    } catch (err) {
      console.error('Find crypto keys error:', err);
      setError(`Failed to find crypto keys: ${err}`);
      setCryptoKeys([]);
    } finally {
      setFindCryptoLoading(false);
    }
  };

  const getProcessMaps = async () => {
    if (!selectedProcess.trim()) {
      setError('Please select a process first');
      return;
    }

    setProcessMapsLoading(true);
    setError(null);
    
    try {
      console.log('Calling get_process_maps with:', selectedProcess.trim());
      const maps: string[] = await invoke('get_process_maps', { 
        packageName: selectedProcess.trim() 
      });
      setProcessMaps(maps);
      console.log('Process maps result:', maps);
    } catch (err) {
      console.error('Process maps error:', err);
      setError(`Failed to get process maps: ${err}`);
      setProcessMaps([]);
    } finally {
      setProcessMapsLoading(false);
    }
  };

  const analyzeApk = async () => {
    if (!selectedProcess.trim()) {
      setError('Please select a process first');
      return;
    }

    setAnalyzeApkLoading(true);
    setError(null);
    
    try {
      console.log('Calling analyze_apk_file with:', selectedProcess.trim());
      const analysis: string[] = await invoke('analyze_apk_file', { 
        packageName: selectedProcess.trim() 
      });
      setApkAnalysis(analysis);
      console.log('APK analysis result:', analysis);
    } catch (err) {
      console.error('APK analysis error:', err);
      setError(`Failed to analyze APK: ${err}`);
      setApkAnalysis([]);
    } finally {
      setAnalyzeApkLoading(false);
    }
  };

  const getSeverityColor = (keyType: string) => {
    switch (keyType.toLowerCase()) {
      case 'aes-256':
      case 'rsa':
        return 'error';
      case 'aes':
      case 'sha256':
        return 'warning';
      default:
        return 'info';
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MemoryIcon /> Memory Analyzer
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Process Selection Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Running Processes</InputLabel>
                <Select
                  value={selectedProcess}
                  onChange={(e) => setSelectedProcess(e.target.value)}
                  label="Running Processes"
                >
                  {runningProcesses.map((app, index) => (
                    <MenuItem key={index} value={app.package_name}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {app.name} ({app.package_name})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          PID: {app.pid} | CPU: {app.cpu}% | Memory: {app.memory}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                  {runningProcesses.length === 0 && (
                    <MenuItem disabled>
                      <Typography color="text.secondary">No process open...</Typography>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
              <Button
                size="small"
                onClick={() => {
                  // Attach to selected process
                  console.log('Attached to process:', selectedProcess);
                }}
                sx={{ mt: 1 }}
                startIcon={<SecurityIcon />}
                disabled={!selectedProcess}
              >
                Attach
              </Button>
            </Box>
            <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
              💡 <strong>DIVA Challenge 1:</strong> Select DIVA process, then use "Extract Strings" to find credit card numbers!
            </Alert>
          </Box>
        </CardContent>
      </Card>

      {/* Extract Strings UI Container - Always Visible */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchIcon /> 🔍 String Extractor & Search
            </Typography>
            <Typography variant="body2" color="text.secondary">
              💡 Extracts strings from app logs and memory to find sensitive data like credit card numbers, passwords, and API keys
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField
                fullWidth
                label="Min String Length"
                type="number"
                value={minStringLength}
                onChange={(e) => setMinStringLength(parseInt(e.target.value) || 8)}
                variant="outlined"
                size="small"
              />
            </Box>
            <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
              <TextField
                fullWidth
                label="Search for specific string..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="outlined"
                size="small"
                placeholder="e.g., credit card, password, key, etc."
                InputProps={{
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton onClick={clearSearch} size="small">
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Button
                fullWidth
                variant="contained"
                onClick={extractStrings}
                disabled={extractStringsLoading || !selectedProcess}
                startIcon={<SearchIcon />}
                size="small"
              >
                🔍 Extract Strings
              </Button>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            💡 <strong>DIVA Challenge 1 Tip:</strong> Look for 13-19 digit numbers (credit cards). 
            Credit card patterns are highlighted with 💳
          </Alert>

          {extractStringsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Extracting strings from memory...</Typography>
            </Box>
          ) : (
            <Paper sx={{ maxHeight: 400, overflow: 'auto', p: 1 }}>
              {extractedStrings.length > 0 ? (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>
                    📊 Found {extractedStrings.length} strings total
                    {searchQuery && filteredStrings.length !== extractedStrings.length && ` (${filteredStrings.length} match "${searchQuery}")`}
                  </Typography>
                  {filteredStrings.length > 0 ? (
                    <List dense>
                      {filteredStrings.map((str, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemText 
                            primary={str}
                            sx={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.9rem',
                              color: /^\d{13,19}$/.test(str) ? 'error.main' : 
                                     str.includes('💳') ? 'error.main' : 
                                     str.toLowerCase().includes('password') ? 'warning.main' : 
                                     str.toLowerCase().includes('key') ? 'warning.main' : 'text.primary'
                            }}
                          />
                          {/^\d{13,19}$/.test(str) && (
                            <Chip label="💳 CREDIT CARD!" color="error" size="small" />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                      No strings match your search "{searchQuery}". Try a different search term or clear the search to see all strings.
                    </Typography>
                  )}
                </>
              ) : (
                <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No strings extracted yet. Select a process and click "🔍 Extract Strings" to start.
                </Typography>
              )}
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Dump Memory UI Container - Always Visible */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MemoryIcon /> 📊 Memory Dump Results
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                🔍 Analyzes process memory regions and extracts sensitive data (credit cards, passwords, keys)
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={dumpProcessMemory}
              disabled={dumpMemoryLoading || !selectedProcess}
              startIcon={<MemoryIcon />}
              size="small"
            >
              📊 Dump Memory
            </Button>
          </Box>
          
          {dumpMemoryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Dumping process memory...</Typography>
            </Box>
          ) : (
            <>
              {memoryDumps.length > 0 ? (
                memoryDumps.map((dump, index) => (
                  <Accordion key={index} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        🗂️ Region: {dump.memory_region} | Permissions: {dump.permissions}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" gutterBottom>
                        📍 PID: {dump.pid} | Size: {dump.size}
                      </Typography>
                      
                      {dump.strings.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>🔤 Extracted Strings:</Typography>
                          <Paper sx={{ p: 1, maxHeight: 200, overflow: 'auto' }}>
                            {dump.strings.map((str, strIndex) => (
                              <Typography key={strIndex} sx={{ 
                                fontFamily: 'monospace', 
                                fontSize: '0.8rem',
                                color: /^\d{13,19}$/.test(str) ? 'error.main' : 'text.primary'
                              }}>
                                {str} {/^\d{13,19}$/.test(str) && '💳'}
                              </Typography>
                            ))}
                          </Paper>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))
              ) : (
                <Alert severity="info">No memory regions dumped yet. Select a process and click "📊 Dump Memory" to start.</Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Find Crypto UI Container - Always Visible */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VpnKeyIcon /> 🔐 Cryptographic Material Scanner
            </Typography>
            <Button
              variant="contained"
              onClick={findCryptoKeys}
              disabled={findCryptoLoading || !selectedProcess}
              startIcon={<VpnKeyIcon />}
              size="small"
              color="secondary"
            >
              🔐 Find Crypto
            </Button>
          </Box>
          
          {findCryptoLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Scanning for cryptographic keys...</Typography>
            </Box>
          ) : (
            <>
              {cryptoKeys.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>🕐 Time</TableCell>
                        <TableCell>🔑 Type</TableCell>
                        <TableCell>📏 Size</TableCell>
                        <TableCell>🔤 Key Data</TableCell>
                        <TableCell>📍 Location</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cryptoKeys.map((key, index) => (
                        <TableRow key={index}>
                          <TableCell>{new Date(key.timestamp).toLocaleTimeString()}</TableCell>
                          <TableCell>
                            <Chip 
                              label={key.key_type} 
                              color={getSeverityColor(key.key_type) as any}
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>{key.key_size}</TableCell>
                          <TableCell sx={{ 
                            maxWidth: 300, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem'
                          }}>
                            {key.key_data}
                          </TableCell>
                          <TableCell>{key.location}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No crypto scan performed yet. Select a process and click "🔐 Find Crypto" to start.</Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Process Maps UI Container - Always Visible */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MemoryIcon /> 🗺️ Process Memory Maps
            </Typography>
            <Button
              variant="outlined"
              onClick={getProcessMaps}
              disabled={processMapsLoading || !selectedProcess}
              startIcon={<RefreshIcon />}
              size="small"
            >
              🗺️ Process Maps
            </Button>
          </Box>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            📋 Memory layout showing address ranges, permissions, and mapped files/libraries.
          </Alert>

          {processMapsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading process memory maps...</Typography>
            </Box>
          ) : (
            <Paper sx={{ p: 1, maxHeight: 500, overflow: 'auto' }}>
              {processMaps.length > 0 ? (
                <pre style={{ 
                  fontSize: '0.7rem', 
                  margin: 0, 
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace'
                }}>
                  {processMaps.join('\n')}
                </pre>
              ) : (
                <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No process maps loaded yet. Select a process and click "🗺️ Process Maps" to start.
                </Typography>
              )}
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Analyze APK UI Container - Always Visible */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon /> 📱 APK Analysis Report
            </Typography>
            <Button
              variant="outlined"
              onClick={analyzeApk}
              disabled={analyzeApkLoading || !selectedProcess}
              startIcon={<SecurityIcon />}
              size="small"
            >
              📱 Analyze APK
            </Button>
          </Box>
          
          {analyzeApkLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Analyzing APK file...</Typography>
            </Box>
          ) : (
            <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
              {apkAnalysis.length > 0 ? (
                apkAnalysis.map((line, index) => (
                  <Typography key={index} sx={{ 
                    fontFamily: line.startsWith('📱') || line.startsWith('📦') || line.startsWith('📊') ? 'inherit' : 'monospace',
                    fontSize: line.startsWith('📱') || line.startsWith('📦') || line.startsWith('📊') ? '0.9rem' : '0.8rem',
                    fontWeight: line.startsWith('📱') || line.startsWith('📦') || line.startsWith('📊') ? 'bold' : 'normal',
                    mb: 0.5
                  }}>
                    {line}
                  </Typography>
                ))
              ) : (
                <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No APK analysis performed yet. Select a process and click "📱 Analyze APK" to start.
                </Typography>
                )}
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Advanced Runtime Manipulation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SecurityIcon /> 🚀 Advanced Runtime Manipulation
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {/* Code Injection */}
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    💉 Code Injection
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={async () => {
                        if (!selectedProcess) return;
                        try {
                          await invoke('inject_code_before_method', { 
                            packageName: selectedProcess,
                            targetClass: 'jakhar.aseem.diva.MainActivity',
                            targetMethod: 'onCreate',
                            customCode: 'console.log("Code injected before onCreate");'
                          });
                        } catch (error) {
                          console.error('Failed to inject code:', error);
                        }
                      }}
                      disabled={!selectedProcess}
                    >
                      Inject Before
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={async () => {
                        if (!selectedProcess) return;
                        try {
                          await invoke('inject_code_after_method', { 
                            packageName: selectedProcess,
                            targetClass: 'jakhar.aseem.diva.MainActivity',
                            targetMethod: 'onCreate',
                            customCode: 'console.log("Code injected after onCreate");'
                          });
                        } catch (error) {
                          console.error('Failed to inject code:', error);
                        }
                      }}
                      disabled={!selectedProcess}
                    >
                      Inject After
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Method Overriding */}
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    🔄 Method Override
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      onClick={async () => {
                        if (!selectedProcess) return;
                        try {
                          await invoke('override_method', { 
                            packageName: selectedProcess,
                            className: 'jakhar.aseem.diva.MainActivity',
                            methodName: 'isPremium',
                            newBehavior: 'return true; // Always return premium'
                          });
                        } catch (error) {
                          console.error('Failed to override method:', error);
                        }
                      }}
                      disabled={!selectedProcess}
                    >
                      Override isPremium
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      onClick={async () => {
                        if (!selectedProcess) return;
                        try {
                          await invoke('override_method', { 
                            packageName: selectedProcess,
                            className: 'jakhar.aseem.diva.MainActivity',
                            methodName: 'validateLicense',
                            newBehavior: 'return true; // Always validate'
                          });
                        } catch (error) {
                          console.error('Failed to override method:', error);
                        }
                      }}
                      disabled={!selectedProcess}
                    >
                      Override License
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Memory Patching */}
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    🧩 Memory Patch
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      onClick={async () => {
                        if (!selectedProcess) return;
                        try {
                          await invoke('patch_memory', { 
                            packageName: selectedProcess,
                            targetAddress: '0x12345678',
                            newValue: 'premium_user'
                          });
                        } catch (error) {
                          console.error('Failed to patch memory:', error);
                        }
                      }}
                      disabled={!selectedProcess}
                    >
                      Patch Memory
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      onClick={async () => {
                        if (!selectedProcess) return;
                        try {
                          await invoke('search_and_replace_memory', { 
                            packageName: selectedProcess,
                            searchPattern: 'trial_user',
                            replacementValue: 'premium_user'
                          });
                        } catch (error) {
                          console.error('Failed to search and replace memory:', error);
                        }
                      }}
                      disabled={!selectedProcess}
                    >
                      Search & Replace
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>💡 Advanced Features:</strong> These tools provide Frida-level runtime manipulation capabilities without external dependencies.
            Use them to modify app behavior, inject custom code, and patch memory values in real-time.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MemoryAnalyzer;