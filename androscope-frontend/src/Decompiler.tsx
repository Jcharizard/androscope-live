import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CodeIcon,
  SearchIcon,
  ExpandMoreIcon,
  FileIcon,
  ClassIcon,
  FunctionIcon,
  KeyIcon,
  SecurityIcon,
  BugReportIcon,
  VisibilityIcon
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/tauri';

interface DecompiledClass {
  name: string;
  package: string;
  methods: DecompiledMethod[];
  fields: DecompiledField[];
  annotations: string[];
  superclass?: string;
  interfaces: string[];
}

interface DecompiledMethod {
  name: string;
  parameters: string[];
  returnType: string;
  modifiers: string[];
  code: string;
  annotations: string[];
  lineNumber?: number;
}

interface DecompiledField {
  name: string;
  type: string;
  modifiers: string[];
  value?: string;
  annotations: string[];
}

interface DecompiledPackage {
  name: string;
  classes: DecompiledClass[];
}

interface DecompilerResult {
  packages: DecompiledPackage[];
  totalClasses: number;
  totalMethods: number;
  totalFields: number;
  strings: string[];
  hardcodedSecrets: string[];
  apiKeys: string[];
  urls: string[];
}

const Decompiler: React.FC = () => {
  const [decompiledCode, setDecompiledCode] = useState<DecompilerResult | null>(null);
  const [selectedClass, setSelectedClass] = useState<DecompiledClass | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<DecompiledMethod | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApkId, setSelectedApkId] = useState<string>('');

  // Sample decompiled code for demonstration
  const sampleDecompiledCode: DecompilerResult = {
    packages: [
      {
        name: 'jakhar.aseem.diva',
        classes: [
          {
            name: 'MainActivity',
            package: 'jakhar.aseem.diva',
            methods: [
              {
                name: 'onCreate',
                parameters: ['Bundle savedInstanceState'],
                returnType: 'void',
                modifiers: ['protected'],
                code: `protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
    
    // Initialize UI components
    Button challenge1Btn = findViewById(R.id.challenge1);
    challenge1Btn.setOnClickListener(v -> {
        Intent intent = new Intent(this, InsecureLoggingActivity.class);
        startActivity(intent);
    });
}`,
                annotations: ['@Override'],
                lineNumber: 15
              },
              {
                name: 'validateInput',
                parameters: ['String input'],
                returnType: 'boolean',
                modifiers: ['private'],
                code: `private boolean validateInput(String input) {
    // Hardcoded validation - VULNERABILITY!
    String hardcodedSecret = "diva_secret_key_12345";
    String apiKey = "sk-1234567890abcdef";
    
    if (input.equals(hardcodedSecret)) {
        Log.d("DIVA", "Secret validated: " + input);
        return true;
    }
    return false;
}`,
                annotations: [],
                lineNumber: 45
              }
            ],
            fields: [
              {
                name: 'HARDCODED_API_KEY',
                type: 'String',
                modifiers: ['private', 'static', 'final'],
                value: '"sk-1234567890abcdef"',
                annotations: []
              },
              {
                name: 'SECRET_PASSWORD',
                type: 'String',
                modifiers: ['private', 'static', 'final'],
                value: '"diva_secret_key_12345"',
                annotations: []
              }
            ],
            annotations: ['@Override'],
            superclass: 'AppCompatActivity',
            interfaces: ['View.OnClickListener']
          },
          {
            name: 'InsecureLoggingActivity',
            package: 'jakhar.aseem.diva',
            methods: [
              {
                name: 'processPayment',
                parameters: ['String creditCard'],
                returnType: 'void',
                modifiers: ['public'],
                code: `public void processPayment(String creditCard) {
    // Insecure logging - VULNERABILITY!
    Log.d("DIVA", "Processing payment with credit card: " + creditCard);
    Log.i("PAYMENT", "Credit card number: " + creditCard);
    
    // Store in shared preferences - VULNERABILITY!
    SharedPreferences prefs = getSharedPreferences("diva_prefs", MODE_PRIVATE);
    prefs.edit().putString("credit_card", creditCard).apply();
    
    // Send to server
    sendToServer(creditCard);
}`,
                annotations: [],
                lineNumber: 25
              }
            ],
            fields: [],
            annotations: [],
            superclass: 'AppCompatActivity',
            interfaces: []
          }
        ]
      }
    ],
    totalClasses: 2,
    totalMethods: 3,
    totalFields: 2,
    strings: [
      'diva_secret_key_12345',
      'sk-1234567890abcdef',
      'Processing payment with credit card:',
      'Credit card number:',
      'diva_prefs'
    ],
    hardcodedSecrets: [
      'diva_secret_key_12345',
      'sk-1234567890abcdef'
    ],
    apiKeys: [
      'sk-1234567890abcdef'
    ],
    urls: []
  };

  const decompileApk = async () => {
    if (!selectedApkId) {
      alert('Please select an APK first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For now, use sample data. In real implementation, this would call the backend
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate decompilation
      setDecompiledCode(sampleDecompiledCode);
    } catch (error) {
      setError('Failed to decompile APK: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = decompiledCode?.packages.flatMap(pkg => 
    pkg.classes.filter(cls => 
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.package.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  const filteredMethods = selectedClass?.methods.filter(method =>
    method.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    method.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredFields = selectedClass?.fields.filter(field =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.type.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <CodeIcon /> 🔍 APK Decompiler
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        🧠 Professional-grade decompiler with IDE-like interface. Browse through app source code, 
        find hardcoded secrets, and analyze vulnerabilities like a real security researcher.
      </Typography>

      {/* APK Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📱 Select APK to Decompile
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="APK ID"
              value={selectedApkId}
              onChange={(e) => setSelectedApkId(e.target.value)}
              placeholder="Enter APK ID or select from APK Management"
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={decompileApk}
              disabled={loading || !selectedApkId}
              startIcon={loading ? <CircularProgress size={16} /> : <CodeIcon />}
            >
              {loading ? 'Decompiling...' : '🔍 Decompile APK'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {decompiledCode && (
        <>
          {/* Search and Overview */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  🔍 Search & Overview
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={`${decompiledCode.totalClasses} Classes`} color="primary" size="small" />
                  <Chip label={`${decompiledCode.totalMethods} Methods`} color="secondary" size="small" />
                  <Chip label={`${decompiledCode.totalFields} Fields`} color="info" size="small" />
                </Box>
              </Box>
              
              <TextField
                fullWidth
                label="Search classes, methods, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ mb: 2 }}
              />

              {/* Hardcoded Secrets Alert */}
              {decompiledCode.hardcodedSecrets.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  🚨 <strong>HARDCODED SECRETS FOUND!</strong>
                  <br />
                  Found {decompiledCode.hardcodedSecrets.length} hardcoded secrets:
                  {decompiledCode.hardcodedSecrets.map((secret, idx) => (
                    <Chip key={idx} label={secret} size="small" sx={{ ml: 1, mt: 1 }} />
                  ))}
                </Alert>
              )}
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 3 }}>
            {/* Left Panel - Class Browser */}
            <Card sx={{ flex: '0 0 300px' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📁 Class Browser
                </Typography>
                <List dense>
                  {filteredClasses.map((cls, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton
                        selected={selectedClass?.name === cls.name}
                        onClick={() => {
                          setSelectedClass(cls);
                          setSelectedMethod(null);
                        }}
                      >
                        <ListItemText
                          primary={cls.name}
                          secondary={cls.package}
                          primaryTypographyProps={{ fontSize: '0.9rem' }}
                          secondaryTypographyProps={{ fontSize: '0.75rem' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Middle Panel - Method/Field Browser */}
            {selectedClass && (
              <Card sx={{ flex: '0 0 300px' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔧 {selectedClass.name}
                  </Typography>
                  
                  {/* Methods */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        📋 Methods ({filteredMethods.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {filteredMethods.map((method, index) => (
                          <ListItem key={index} disablePadding>
                            <ListItemButton
                              selected={selectedMethod?.name === method.name}
                              onClick={() => setSelectedMethod(method)}
                            >
                              <ListItemText
                                primary={method.name}
                                secondary={`${method.returnType} (${method.parameters.join(', ')})`}
                                primaryTypographyProps={{ fontSize: '0.85rem' }}
                                secondaryTypographyProps={{ fontSize: '0.75rem' }}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>

                  {/* Fields */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        🔑 Fields ({filteredFields.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {filteredFields.map((field, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={field.name}
                              secondary={`${field.type} ${field.value ? `= ${field.value}` : ''}`}
                              primaryTypographyProps={{ fontSize: '0.85rem' }}
                              secondaryTypographyProps={{ fontSize: '0.75rem' }}
                            />
                            {field.value && (
                              <Chip label="Hardcoded!" color="error" size="small" />
                            )}
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Right Panel - Code Viewer */}
            {selectedMethod && (
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      💻 {selectedMethod.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={selectedMethod.returnType} size="small" />
                      <Chip label={selectedMethod.modifiers.join(' ')} size="small" />
                      {selectedMethod.lineNumber && (
                        <Chip label={`Line ${selectedMethod.lineNumber}`} size="small" />
                      )}
                    </Box>
                  </Box>
                  
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', fontFamily: 'monospace' }}>
                    <pre style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
                      {selectedMethod.code}
                    </pre>
                  </Paper>

                  {/* Annotations */}
                  {selectedMethod.annotations.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        📝 Annotations:
                      </Typography>
                      {selectedMethod.annotations.map((annotation, index) => (
                        <Chip key={index} label={annotation} size="small" sx={{ mr: 1 }} />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default Decompiler;
