import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProcessManager } from './ProcessManager';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface DivaChallenge {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  solution: string;
  status: string;
  timestamp: string;
}

interface ChallengeSolution {
  challenge_id: string;
  technique_used: string;
  payload: string;
  success: boolean;
  details: string;
  timestamp: string;
}


export const DivaChallengeSolver = () => {
  const [challenges, setChallenges] = useState<DivaChallenge[]>([]);
  const [solutions, setSolutions] = useState<ChallengeSolution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { runningProcesses, selectedProcess, setSelectedProcess, refreshProcesses, isLoading } = useProcessManager();

  const loadChallenges = async () => {
    try {
      const challengeList = await invoke<DivaChallenge[]>('get_challenge_status', {
        packageName: selectedProcess || 'jakhar.aseem.diva'
      });
      setChallenges(challengeList);
    } catch (error) {
      console.error('Failed to load challenges:', error);
      setError('Failed to load challenges');
    }
  };

  const solveChallenge = async (challengeType: string) => {
    if (!selectedProcess) {
      setError('Please select a target package first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let solution: ChallengeSolution;
      
      switch (challengeType) {
        case 'input_validation':
          solution = await invoke<ChallengeSolution>('solve_input_validation_challenge', {
            packageName: selectedProcess,
            challengeName: 'Input Validation'
          });
          break;
        case 'sql_injection':
          solution = await invoke<ChallengeSolution>('solve_sql_injection_challenge', {
            packageName: selectedProcess,
            challengeName: 'SQL Injection'
          });
          break;
        case 'xss':
          solution = await invoke<ChallengeSolution>('solve_xss_challenge', {
            packageName: selectedProcess,
            challengeName: 'XSS'
          });
          break;
        case 'hardcoded_secrets':
          solution = await invoke<ChallengeSolution>('solve_hardcoded_secrets_challenge', {
            packageName: selectedProcess,
            challengeName: 'Hardcoded Secrets'
          });
          break;
        case 'ssl_pinning':
          solution = await invoke<ChallengeSolution>('solve_ssl_pinning_challenge', {
            packageName: selectedProcess,
            challengeName: 'SSL Pinning'
          });
          break;
        case 'root_detection':
          solution = await invoke<ChallengeSolution>('solve_root_detection_challenge', {
            packageName: selectedProcess,
            challengeName: 'Root Detection'
          });
          break;
        case 'debug_detection':
          solution = await invoke<ChallengeSolution>('solve_debug_detection_challenge', {
            packageName: selectedProcess,
            challengeName: 'Debug Detection'
          });
          break;
        default:
          throw new Error('Unknown challenge type');
      }

      setSolutions(prev => [solution, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error(`Failed to solve ${challengeType}:`, error);
      setError(`Failed to solve ${challengeType}: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const solveAllChallenges = async () => {
    if (!selectedProcess) {
      setError('Please select a target package first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allSolutions = await invoke<ChallengeSolution[]>('solve_all_diva_challenges', {
        packageName: selectedProcess
      });
      setSolutions(allSolutions);
    } catch (error) {
      console.error('Failed to solve all challenges:', error);
      setError(`Failed to solve all challenges: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'solved': return <CheckCircleIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'unsolved': return <WarningIcon color="warning" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const getChallengeExplanation = (challengeId: string) => {
    switch (challengeId) {
      case 'input_validation':
        return 'This challenge tests input validation bypass. You need to inject malicious input to bypass validation checks. Common techniques include SQL injection, XSS payloads, and buffer overflow attempts.';
      case 'sql_injection':
        return 'SQL Injection challenge requires you to manipulate database queries through user input. Use payloads like "1 OR 1=1", "UNION SELECT", or "DROP TABLE" to exploit the vulnerability.';
      case 'xss':
        return 'Cross-Site Scripting (XSS) challenge involves injecting malicious JavaScript code. Use payloads like <script>alert("XSS")</script> or JavaScript:alert("XSS") to execute arbitrary code.';
      case 'hardcoded_secrets':
        return 'Hardcoded secrets challenge involves finding credentials, API keys, or sensitive data stored in the app. Search through strings, memory dumps, and APK analysis for hardcoded values.';
      case 'ssl_pinning':
        return 'SSL Pinning bypass challenge requires you to intercept HTTPS traffic by bypassing certificate pinning. Use tools like Frida scripts or modify the app to accept custom certificates.';
      case 'root_detection':
        return 'Root detection bypass challenge involves hiding root status from the app. The app checks for root indicators like su binary, root apps, or modified system files.';
      case 'debug_detection':
        return 'Debug detection bypass challenge requires hiding debugger presence from the app. The app checks for debugging flags, developer options, or debugging tools.';
      default:
        return 'This challenge tests various security vulnerabilities. Use the appropriate exploitation technique based on the challenge type.';
    }
  };

  useEffect(() => {
    loadChallenges();
  }, [selectedProcess]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon /> DIVA Challenge Solver
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Target Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🎯 Target Selection
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Target Package</InputLabel>
                <Select
                  value={selectedProcess}
                  onChange={(e) => setSelectedProcess(e.target.value)}
                  label="Target Package"
                >
                  {runningProcesses.map((app, index) => (
                    <MenuItem key={index} value={app.package_name}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {app.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {app.package_name} (PID: {app.pid})
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
                onClick={refreshProcesses}
                sx={{ mt: 1 }}
                startIcon={<RefreshIcon />}
                disabled={isLoading}
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={solveAllChallenges}
                disabled={loading || !selectedProcess}
                startIcon={loading ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                fullWidth
              >
                🚀 Solve All Challenges
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Challenge Grid */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {challenges.map((challenge) => (
          <Box sx={{ flex: '1 1 350px', minWidth: '350px' }} key={challenge.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                      {challenge.name}
                    </Typography>
                    <Tooltip 
                      title={getChallengeExplanation(challenge.id)}
                      placement="top"
                      arrow
                      sx={{ 
                        '& .MuiTooltip-tooltip': { 
                          maxWidth: 400,
                          fontSize: '0.875rem',
                          bgcolor: 'white',
                          color: 'black',
                          border: '1px solid #ccc'
                        }
                      }}
                    >
                      <WarningIcon color="warning" sx={{ cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                  {getStatusIcon(challenge.status)}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip 
                    label={challenge.difficulty} 
                    size="small" 
                    color={getDifficultyColor(challenge.difficulty) as any}
                  />
                  <Chip 
                    label={challenge.category} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {challenge.description}
                </Typography>

                <Button
                  variant="contained"
                  size="small"
                  onClick={() => solveChallenge(challenge.id)}
                  disabled={loading || !selectedProcess}
                  fullWidth
                >
                  {loading ? <CircularProgress size={16} /> : 'Solve Challenge'}
                </Button>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Solutions History */}
      {solutions.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Solutions History
            </Typography>
            <List>
              {solutions.map((solution, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      {solution.success ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {solution.challenge_id}
                          </Typography>
                          <Chip 
                            label={solution.technique_used} 
                            size="small" 
                            color={solution.success ? 'success' : 'error'}
                          />
                        </Box>
                      }
                      secondary={`${solution.details} | Payload: ${solution.payload} | ${new Date(solution.timestamp).toLocaleString()}`}
                    />
                  </ListItem>
                  {index < solutions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        <strong>🎯 DIVA Challenge Solver:</strong> This tool automatically solves all DIVA Android security challenges.
        Select a target package and click "Solve All Challenges" to automatically exploit vulnerabilities.
      </Alert>
    </Box>
  );
};

export default DivaChallengeSolver;
