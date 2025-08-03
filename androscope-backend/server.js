const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3001;

// Function to get CPU usage from ADB
const getCpuUsage = (ws) => {
  // This command gets overall CPU usage. We will refine this later.
  const command = 'adb shell dumpsys cpuinfo | findstr TOTAL'; 
  exec(command, (error, stdout, stderr) => {
    if (error) {
      // Don't send anything if ADB fails (e.g., no device connected)
      console.error(`Error executing ADB command: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`ADB stderr: ${stderr}`);
      return;
    }
    
    // Parse the output to get a percentage
    const cpuMatch = stdout.trim().match(/(\d+)%/);
    if (cpuMatch && cpuMatch[1]) {
      const cpuUsage = parseInt(cpuMatch[1], 10);
      const data = JSON.stringify({ type: 'cpu', value: cpuUsage });
      ws.send(data);
    }
  });
};

const getProcessList = (ws) => {
  // The -A flag shows all processes
  const command = 'adb shell ps -A';
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error getting process list: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Process list stderr: ${stderr}`);
      return;
    }
    
    // Parse the stdout
    const lines = stdout.trim().split('\n');
    const processes = lines.slice(1).map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        user: parts[0],
        pid: parts[1],
        ppid: parts[2],
        vsize: parts[3],
        rss: parts[4],
        wchan: parts[5],
        addr: parts[6],
        s: parts[7],
        name: parts[8],
      };
    });

    const data = JSON.stringify({ type: 'processes', value: processes });
    ws.send(data);
  });
};

// --- IOC Scanner ---
const iocPatterns = [
  { name: 'Root Check', regex: /su/i, description: 'An application attempted to gain root access.' },
  { name: 'Silent App Install', regex: /pm install/i, description: 'An application may be trying to install another app silently.' },
  { name: 'Opened Network Port', regex: /listening on port/i, description: 'A process has opened a network port to listen for connections.' },
  { name: 'ADB Command Execution', regex: /adb shell/i, description: 'An application may be trying to execute ADB commands itself.' },
  { 
    name: 'DNS Query', 
    regex: /DnsResolver: res_query\((.+?),/,
    description: 'An application made a DNS query to resolve a domain name.',
    isNetworkEvent: true // Custom flag to differentiate
  },
];

const scanLogForIocs = (logLine, ws) => {
  for (const pattern of iocPatterns) {
    if (pattern.regex.test(logLine)) {
      const match = logLine.match(pattern.regex);
      const isNetwork = !!pattern.isNetworkEvent;

      const alert = {
        type: isNetwork ? 'network_event' : 'security_alert',
        value: {
          name: isNetwork ? `DNS Query: ${match[1]}` : pattern.name,
          description: pattern.description,
          log: logLine,
          timestamp: new Date().toISOString(),
        }
      };
      ws.send(JSON.stringify(alert));
    }
  }
};

// --- Whitelisted ADB Commands ---
const ALLOWED_COMMANDS = {
  'ENABLE_DEV_MODE': 'adb shell settings put global development_settings_enabled 1',
  'SHOW_LAYOUT_BOUNDS': 'adb shell setprop debug.layout true && adb shell service call window 1 i32 4939',
  'HIDE_LAYOUT_BOUNDS': 'adb shell setprop debug.layout false && adb shell service call window 1 i32 4939',
};


wss.on('connection', (ws) => {
  console.log('Client connected');

  // --- ADB Process Management ---
  const adbProcesses = {};

  const startLogcat = () => {
    const logcat = exec('adb logcat');
    adbProcesses.logcat = logcat;

    logcat.stdout.on('data', (data) => {
      const logLines = data.toString();
      ws.send(JSON.stringify({ type: 'logcat', value: logLines }));
      // Also scan the logs for security issues
      scanLogForIocs(logLines, ws);
    });

    logcat.stderr.on('data', (data) => {
      console.error(`Logcat stderr: ${data}`);
    });

    logcat.on('close', (code) => {
      console.log(`Logcat process exited with code ${code}`);
      // Optional: auto-restart?
    });
  };

  startLogcat();
  
  // Start polling for CPU usage
  const cpuInterval = setInterval(() => getCpuUsage(ws), 2000);
  
  // Get initial process list and then update every 10 seconds
  getProcessList(ws);
  const processInterval = setInterval(() => getProcessList(ws), 10000);

  ws.on('message', (message) => {
    try {
      const { action, command, intent } = JSON.parse(message);

      if (action === 'adb_command' && ALLOWED_COMMANDS[command]) {
        exec(ALLOWED_COMMANDS[command], (err, stdout, stderr) => {
          if (err) console.error(`Exec error for ${command}: ${err}`);
          if (stderr) console.error(`Exec stderr for ${command}: ${stderr}`);
          console.log(`Executed ${command}: ${stdout}`);
        });
      } else if (action === 'send_intent' && intent) {
        // Basic sanitization
        const safeIntent = intent.replace(/[^a-zA-Z0-9.\/_:-]/g, '');
        const intentCommand = `adb shell am start -a ${safeIntent}`;
        exec(intentCommand, (err, stdout, stderr) => {
          if (err) console.error(`Intent error: ${err}`);
          if (stderr) console.error(`Intent stderr: ${stderr}`);
          console.log(`Sent intent ${safeIntent}: ${stdout}`);
        });
      }

    } catch (e) {
      console.error('Failed to process incoming message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Stop all polling and child processes
    clearInterval(cpuInterval);
    clearInterval(processInterval);
    if (adbProcesses.logcat) adbProcesses.logcat.kill();
  });

  // Example: Send a welcome message
  ws.send('Welcome to the AndroScope WebSocket server!');
});

// Simple endpoint to test if the server is up
app.get('/', (req, res) => {
    res.send('AndroScope Backend is running!');
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
}); 