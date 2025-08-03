import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Memory as MemoryIcon,
  Security as SecurityIcon,
  VpnKey as VpnKeyIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
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
  const [processName, setProcessName] = useState('');
  const [memoryDumps, setMemoryDumps] = useState<MemoryDump[]>([]);
  const [extractedStrings, setExtractedStrings] = useState<string[]>([]);
  const [cryptoKeys, setCryptoKeys] = useState<CryptoKey[]>([]);
  const [processMaps, setProcessMaps] = useState<string[]>([]);
  const [apkAnalysis, setApkAnalysis] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minStringLength, setMinStringLength] = useState(8);

  const dumpProcessMemory = async () => {
    if (!processName.trim()) {
      setError('Please enter a process name');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const dumps: MemoryDump[] = await invoke('dump_process_memory', { 
        processName: processName.trim() 
      });
      setMemoryDumps(dumps);
    } catch (err) {
      setError(`Failed to dump memory: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const extractStrings = async () => {
    if (!processName.trim()) {
      setError('Please enter a process name');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const strings: string[] = await invoke('extract_strings_from_memory', { 
        processName: processName.trim(),
        minLength: minStringLength
      });
      setExtractedStrings(strings);
    } catch (err) {
      setError(`Failed to extract strings: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const findCryptoKeys = async () => {
    if (!processName.trim()) {
      setError('Please enter a process name');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const keys: CryptoKey[] = await invoke('find_crypto_keys', { 
        processName: processName.trim() 
      });
      setCryptoKeys(keys);
    } catch (err) {
      setError(`Failed to find crypto keys: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const getProcessMaps = async () => {
    if (!processName.trim()) {
      setError('Please enter a process name');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const maps: string[] = await invoke('get_process_maps', { 
        processName: processName.trim() 
      });
      setProcessMaps(maps);
    } catch (err) {
      setError(`Failed to get process maps: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeApk = async () => {
    if (!processName.trim()) {
      setError('Please enter a package name');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const analysis: string[] = await invoke('analyze_apk_file', { 
        appPackage: processName.trim() 
      });
      setApkAnalysis(analysis);
    } catch (err) {
      setError(`Failed to analyze APK: ${err}`);
    } finally {
      setLoading(false);
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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Process/Package Name"
                placeholder="e.g. com.example.app or system_server"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Min String Length"
                type="number"
                value={minStringLength}
                onChange={(e) => setMinStringLength(parseInt(e.target.value) || 8)}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={dumpProcessMemory}
                  disabled={loading}
                  startIcon={<MemoryIcon />}
                  size="small"
                >
                  Dump Memory
                </Button>
                <Button
                  variant="contained"
                  onClick={extractStrings}
                  disabled={loading}
                  startIcon={<SearchIcon />}
                  size="small"
                >
                  Extract Strings
                </Button>
                <Button
                  variant="contained"
                  onClick={findCryptoKeys}
                  disabled={loading}
                  startIcon={<VpnKeyIcon />}
                  size="small"
                  color="secondary"
                >
                  Find Crypto
                </Button>
                <Button
                  variant="outlined"
                  onClick={getProcessMaps}
                  disabled={loading}
                  startIcon={<RefreshIcon />}
                  size="small"
                >
                  Process Maps
                </Button>
                <Button
                  variant="outlined"
                  onClick={analyzeApk}
                  disabled={loading}
                  startIcon={<SecurityIcon />}
                  size="small"
                >
                  Analyze APK
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Crypto Keys Section */}
      {cryptoKeys.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VpnKeyIcon /> Cryptographic Keys Found ({cryptoKeys.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Key Data</TableCell>
                    <TableCell>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cryptoKeys.map((key, index) => (
                    <TableRow key={index}>
                      <TableCell>{key.timestamp}</TableCell>
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
          </AccordionDetails>
        </Accordion>
      )}

      {/* Memory Dumps Section */}
      {memoryDumps.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MemoryIcon /> Memory Dumps ({memoryDumps.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {memoryDumps.map((dump, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Region: {dump.memory_region} | Permissions: {dump.permissions} | Size: {dump.size}
                  </Typography>
                  
                  {dump.strings.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Extracted Strings:</Typography>
                      <List dense>
                        {dump.strings.slice(0, 10).map((str, strIndex) => (
                          <ListItem key={strIndex}>
                            <ListItemText 
                              primary={str}
                              sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Raw Hex Data</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.7rem', 
                        backgroundColor: '#f5f5f5', 
                        p: 1, 
                        borderRadius: 1,
                        maxHeight: 200,
                        overflow: 'auto'
                      }}>
                        {dump.hex_data}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Extracted Strings Section */}
      {extractedStrings.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchIcon /> Extracted Strings ({extractedStrings.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {extractedStrings.map((str, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText 
                      primary={str}
                      sx={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.8rem',
                        color: str.includes('🔑') ? 'error.main' : str.includes('🔐') ? 'warning.main' : 'text.primary'
                      }}
                    />
                  </ListItem>
                  {index < extractedStrings.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Process Maps Section */}
      {processMaps.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Process Maps & Info</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {processMaps.map((map, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Paper sx={{ p: 2 }}>
                  <pre style={{ 
                    fontSize: '0.7rem', 
                    margin: 0, 
                    whiteSpace: 'pre-wrap',
                    maxHeight: 300,
                    overflow: 'auto'
                  }}>
                    {map}
                  </pre>
                </Paper>
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      )}

      {/* APK Analysis Section */}
      {apkAnalysis.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon /> APK Analysis
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {apkAnalysis.map((analysis, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Paper sx={{ p: 2 }}>
                  <pre style={{ 
                    fontSize: '0.7rem', 
                    margin: 0, 
                    whiteSpace: 'pre-wrap',
                    maxHeight: 400,
                    overflow: 'auto'
                  }}>
                    {analysis}
                  </pre>
                </Paper>
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default MemoryAnalyzer;