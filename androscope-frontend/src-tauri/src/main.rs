// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::io::{BufReader, BufRead};
use std::path::Path;
use tauri::{AppHandle, Wry, Emitter};
use tokio::time::{self, Duration};
use chrono::Local;
use serde::{Serialize, Deserialize};

// --- Data Structures ---

#[derive(Serialize, Clone)]
struct CpuPayload {
    r#type: String,
    value: u32,
}

#[derive(Serialize, Clone, Debug)]
struct ProcessInfo {
    user: String,
    pid: String,
    ppid: String,
    vsize: String,
    rss: String,
    wchan: String,
    addr: String,
    s: String,
    name: String,
}

#[derive(Serialize, Clone)]
struct ProcessPayload {
    r#type: String,
    value: Vec<ProcessInfo>,
}

#[derive(Serialize, Clone)]
struct LogcatPayload {
    r#type: String,
    value: String,
}

#[derive(Serialize, Clone, Debug)]
struct AlertPayload {
    r#type: String,
    value: Alert,
}

#[derive(Serialize, Clone, Debug)]
struct Alert {
    name: String,
    description: String,
    log: String,
    timestamp: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct AvdDevice {
    name: String,
    target: String,
    api_level: String,
    status: String,
    device_id: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
struct TimelineEvent {
    timestamp: String,
    milliseconds: u64,
    event_type: String,
    source: String,
    description: String,
    details: String,
    severity: String, // "info", "warning", "critical"
}

#[derive(Serialize, Clone, Debug)]
struct NetworkConnection {
    timestamp: String,
    local_ip: String,
    local_port: String,
    remote_ip: String,
    remote_port: String,
    protocol: String,
    state: String,
    process_name: String,
    bytes_sent: String,
    bytes_received: String,
}

#[derive(Serialize, Clone, Debug)]
struct MemoryDump {
    timestamp: String,
    process_name: String,
    pid: String,
    memory_region: String,
    size: String,
    permissions: String,
    strings: Vec<String>,
    hex_data: String,
}

#[derive(Serialize, Clone, Debug)]
struct CryptoKey {
    timestamp: String,
    process_name: String,
    key_type: String, // "AES", "RSA", "DES", etc.
    key_size: String,
    key_data: String,
    location: String, // memory address or file path
}

#[derive(Serialize, Clone, Debug)]
struct MethodCall {
    timestamp: String,
    process_name: String,
    class_name: String,
    method_name: String,
    parameters: Vec<String>,
    return_value: String,
    stack_trace: String,
}

// --- Helper Functions ---
fn get_adb_path() -> String {
    // Try common ADB locations on Windows
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "user".to_string());
    let possible_paths = [
        "adb", // Try PATH first
        &format!(r"C:\Users\{}\AppData\Local\Android\Sdk\platform-tools\adb.exe", username),
        r"C:\Android\Sdk\platform-tools\adb.exe",
        r"C:\Program Files\Android\android-sdk\platform-tools\adb.exe",
    ];
    
    for path in &possible_paths {
        if *path == "adb" {
            // Test if adb is in PATH
            if Command::new("adb").arg("--version").output().is_ok() {
                return "adb".to_string();
            }
        } else if Path::new(path).exists() {
            return path.to_string();
        }
    }
    
    // Fallback to generic user location
    format!(r"C:\Users\{}\AppData\Local\Android\Sdk\platform-tools\adb.exe", username)
}

fn get_emulator_path() -> String {
    // Try common emulator locations on Windows
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "user".to_string());
    let possible_paths = [
        "emulator", // Try PATH first
        &format!(r"C:\Users\{}\AppData\Local\Android\Sdk\emulator\emulator.exe", username),
        r"C:\Android\Sdk\emulator\emulator.exe",
        r"C:\Program Files\Android\android-sdk\emulator\emulator.exe",
    ];
    
    for path in &possible_paths {
        if *path == "emulator" {
            // Test if emulator is in PATH
            if Command::new("emulator").arg("-version").output().is_ok() {
                return "emulator".to_string();
            }
        } else if Path::new(path).exists() {
            return path.to_string();
        }
    }
    
    // Fallback to generic user location
    format!(r"C:\Users\{}\AppData\Local\Android\Sdk\emulator\emulator.exe", username)
}

// --- Main Application Setup ---
fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                start_adb_polling(app_handle).await;
            });

            let app_handle_logcat = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                start_logcat_stream(app_handle_logcat).await;
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            send_adb_command, 
            send_intent, 
            get_avd_list, 
            get_connected_devices, 
            launch_avd,
            get_network_stats,
            get_running_apps,
            get_live_network_connections,
            get_timeline_events
        ])
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// --- ADB Polling Tasks ---
async fn start_adb_polling(app_handle: AppHandle<Wry>) {
    let mut interval = time::interval(Duration::from_secs(2));
    loop {
        interval.tick().await;

        // Fetch CPU
        let adb_path = get_adb_path();
        if let Ok(output) = Command::new(&adb_path).args(["shell", "dumpsys", "cpuinfo"]).output() {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                if let Some(line) = stdout.lines().find(|l| l.contains("TOTAL")) {
                    if let Some(val_str) = line.split('%').next() {
                        if let Ok(val) = val_str.trim().parse::<u32>() {
                            app_handle.emit("cpu", CpuPayload { r#type: "cpu".to_string(), value: val }).unwrap();
                        }
                    }
                }
            }
        }
        
        // Fetch Processes
        if let Ok(output) = Command::new(&adb_path).args(["shell", "ps", "-A"]).output() {
             if let Ok(stdout) = String::from_utf8(output.stdout) {
                let lines: Vec<ProcessInfo> = stdout.lines().skip(1).filter_map(|line| {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 9 {
                        Some(ProcessInfo {
                            user: parts[0].to_string(),
                            pid: parts[1].to_string(),
                            ppid: parts[2].to_string(),
                            vsize: parts[3].to_string(),
                            rss: parts[4].to_string(),
                            wchan: parts[5].to_string(),
                            addr: parts[6].to_string(),
                            s: parts[7].to_string(),
                            name: parts[8].to_string(),
                        })
                    } else { None }
                }).collect();

                app_handle.emit("processes", ProcessPayload { r#type: "processes".to_string(), value: lines }).unwrap();
            }
        }
    }
}

// --- Logcat Streaming and Scanning ---
async fn start_logcat_stream(app_handle: AppHandle<Wry>) {
    let adb_path = get_adb_path();
    let mut command = match Command::new(&adb_path)
        .arg("logcat")
        .stdout(Stdio::piped())
        .spawn() {
        Ok(cmd) => cmd,
        Err(e) => {
            eprintln!("Failed to start adb logcat: {}", e);
            return;
        }
    };

    if let Some(stdout) = command.stdout.take() {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                app_handle.emit("logcat", LogcatPayload { r#type: "logcat".to_string(), value: line.clone() }).unwrap();
                scan_log_for_iocs(&line, &app_handle);
            }
        }
    }
}

fn scan_log_for_iocs(log_line: &str, app_handle: &AppHandle<Wry>) {
    let patterns = [
        // Security & Root Detection
        ("Root Check", r"su", "An application attempted to gain root access.", false),
        ("Silent App Install", r"pm install", "An application may be trying to install another app silently.", false),
        ("ADB Command Execution", r"adb shell", "An application may be trying to execute ADB commands itself.", false),
        
        // Network Activity (Enhanced for Reverse Engineering)
        ("DNS Query", r"DnsResolver: res_query\((.+?),", "DNS query to resolve domain name.", true),
        ("HTTP Request", r"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) (http[s]?://[^\s]+)", "HTTP request detected.", true),
        ("HTTPS Connection", r"https://([^\s/]+)", "HTTPS connection to domain.", true),
        ("JWT Token", r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", "JWT token detected in traffic.", true),
        ("API Key", r"(api[_-]?key|apikey|access[_-]?token)[\s:=]+([A-Za-z0-9_-]{20,})", "API key or access token found.", false),
        ("Credit Card", r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b", "Credit card number detected.", false),
        ("Phone Number", r"\b(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b", "Phone number detected.", false),
        ("Email Address", r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "Email address found.", true),
        ("API Endpoint", r"(api\.|/api/|\.json|\.xml)", "API endpoint accessed.", true),
        ("Network Socket", r"connect.*(\d+\.\d+\.\d+\.\d+):(\d+)", "TCP connection established.", true),
        ("URL Access", r"https?://([^\s/]+)", "URL accessed by application.", true),
        ("WebView Load", r"WebView.*loadUrl.*?(https?://[^\s]+)", "WebView loading URL.", true),
        
        // File System & Storage
        ("File Access", r"(open|read|write|delete).*/data/data/([^/]+)", "App data directory access.", true),
        ("External Storage", r"(open|read|write|delete).*/storage/emulated", "External storage access.", true),
        ("Database Operation", r"SQLite.*?(INSERT|SELECT|UPDATE|DELETE)", "Database operation performed.", true),
        ("Shared Preferences", r"SharedPreferences.*?(put|get)", "Shared preferences access.", true),
        
        // Permissions & Sensitive Data
        ("Permission Request", r"checkPermission.*?([A-Z_]+)", "Permission check performed.", true),
        ("Location Access", r"(GPS|location|getLastKnownLocation)", "Location data accessed.", false),
        ("Camera Access", r"(Camera|takePicture|CameraManager)", "Camera functionality used.", false),
        ("Microphone Access", r"(AudioRecord|MediaRecorder)", "Microphone access detected.", false),
        ("Contacts Access", r"ContactsContract", "Contacts database accessed.", false),
        ("SMS Access", r"(SmsManager|SMS_RECEIVED)", "SMS functionality accessed.", false),
        ("Phone Access", r"TelephonyManager", "Phone state accessed.", false),
        
        // App Behavior & Components
        ("Intent Broadcast", r"sendBroadcast.*?action=([^\s]+)", "Intent broadcast sent.", true),
        ("Service Started", r"startService.*?([^\s]+)", "Service component started.", true),
        ("Activity Launch", r"START.*?act=([^\s]+)", "Activity launched.", true),
        ("Process Creation", r"Runtime\.exec", "New process spawned.", false),
        
        // Crypto & Security
        ("Crypto Operation", r"(encrypt|decrypt|cipher|Cipher)", "Cryptographic operation.", false),
        ("SSL Certificate", r"(certificate|X509|SSL)", "SSL certificate handling.", true),
        ("Keystore Access", r"KeyStore", "Android Keystore accessed.", false),
        
        // Network Protocols & APIs
        ("YouTube API", r"(youtube|googlevideo)", "YouTube/Google Video API.", true),
        ("Google APIs", r"googleapis\.com", "Google API service.", true),
        ("Social Media", r"(facebook|instagram|twitter|tiktok)", "Social media API.", true),
        ("Ad Networks", r"(doubleclick|googleads|facebook\.com/tr)", "Advertisement network.", true),
        ("Analytics", r"(analytics|crashlytics|firebase)", "Analytics/tracking service.", true),
        
        // Advanced Cracking Patterns
        ("License Check", r"(license|premium|paid|subscription|trial)", "License validation detected.", false),
        ("Root Detection", r"(root|superuser|su binary|busybox)", "Root detection attempt.", false),
        ("Anti-Debug", r"(debug|debugger|ptrace|frida)", "Anti-debugging protection.", false),
        ("Obfuscation", r"(proguard|dexguard|obfuscat)", "Code obfuscation detected.", false),
        ("In-App Purchase", r"(billing|purchase|sku|iap)", "In-app purchase system.", true),
        ("Authentication Token", r"(bearer|token|jwt|session)", "Authentication token found.", true),
        ("Biometric Auth", r"(fingerprint|biometric|facelock)", "Biometric authentication.", false),
        ("Device Binding", r"(device_id|imei|android_id)", "Device binding mechanism.", false),
        ("Tamper Detection", r"(tamper|integrity|checksum|hash)", "Tamper detection active.", false),
        ("Backup Restriction", r"(backup|allowbackup|false)", "Backup restrictions found.", false),
    ];

    for (name, regex_str, description, is_network_event) in patterns.iter() {
        if let Ok(re) = regex::Regex::new(regex_str) {
            if re.is_match(log_line) {
                let event_type = if *is_network_event { "network_event" } else { "security_alert" };
                let mut alert_name = name.to_string();

                if *is_network_event {
                    if let Some(caps) = re.captures(log_line) {
                        if let Some(domain) = caps.get(1) {
                           alert_name = format!("DNS Query: {}", domain.as_str());
                        }
                    }
                }

                let timestamp = Local::now();
                let alert = Alert {
                    name: alert_name.clone(),
                    description: description.to_string(),
                    log: log_line.to_string(),
                    timestamp: timestamp.to_rfc3339(),
                };

                // Emit the original alert
                app_handle.emit(event_type, AlertPayload { r#type: event_type.to_string(), value: alert }).unwrap();

                // Also emit as timeline event
                let timeline_event = TimelineEvent {
                    timestamp: timestamp.format("%H:%M:%S%.3f").to_string(),
                    milliseconds: timestamp.timestamp_millis() as u64,
                    event_type: if *is_network_event { "Network".to_string() } else { "Security".to_string() },
                    source: "Logcat Scanner".to_string(),
                    description: alert_name.clone(),
                    details: log_line.to_string(),
                    severity: if *is_network_event { "info".to_string() } else { "warning".to_string() },
                };

                app_handle.emit("timeline_event", timeline_event).unwrap();
            }
        }
    }
}

// --- Tauri Commands (Callable from Frontend) ---
#[tauri::command]
async fn send_adb_command(_app: AppHandle, command_key: &str) -> Result<(), ()> {
    let adb_path = get_adb_path();
    let args = match command_key {
        "ENABLE_DEV_MODE" => vec!["shell", "settings", "put", "global", "development_settings_enabled", "1"],
        "SHOW_LAYOUT_BOUNDS" => vec!["shell", "setprop", "debug.layout", "true"],
        "HIDE_LAYOUT_BOUNDS" => vec!["shell", "setprop", "debug.layout", "false"],
        _ => return Err(()),
    };

    // Execute the command
    let _ = Command::new(&adb_path).args(&args).output();
    
    // Also refresh UI if showing layout bounds
    if command_key == "SHOW_LAYOUT_BOUNDS" || command_key == "HIDE_LAYOUT_BOUNDS" {
        let _ = Command::new(&adb_path).args(["shell", "service", "call", "window", "1", "i32", "4939"]).output();
    }
    
    Ok(())
}

#[tauri::command]
async fn send_intent(_app: AppHandle, intent: &str) -> Result<(), ()> {
    let adb_path = get_adb_path();
    // Basic sanitization
    let safe_intent = intent.chars().filter(|c| c.is_alphanumeric() || *c == '.' || *c == '_' || *c == ':' || *c == '/').collect::<String>();
    let _ = Command::new(&adb_path).args(["shell", "am", "start", "-a", &safe_intent]).output();
    Ok(())
}

// --- AVD Management Commands ---
#[tauri::command]
async fn get_avd_list() -> Result<Vec<AvdDevice>, String> {
    let emulator_path = get_emulator_path();
    
    match Command::new(&emulator_path).args(["-list-avds"]).output() {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut avds = Vec::new();
                
                for line in stdout.lines() {
                    let avd_name = line.trim();
                    if !avd_name.is_empty() {
                        // Get AVD details (simplified - in reality you'd parse .avd files)
                        avds.push(AvdDevice {
                            name: avd_name.to_string(),
                            target: "Android".to_string(), // Could parse from config.ini
                            api_level: "Unknown".to_string(), // Could parse from config.ini
                            status: "offline".to_string(),
                            device_id: None,
                        });
                    }
                }
                
                Ok(avds)
            } else {
                Err("Failed to list AVDs".to_string())
            }
        }
        Err(e) => Err(format!("Emulator command failed: {}", e))
    }
}

#[tauri::command]
async fn get_connected_devices() -> Result<Vec<AvdDevice>, String> {
    let adb_path = get_adb_path();
    
    match Command::new(&adb_path).args(["devices", "-l"]).output() {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut devices = Vec::new();
                
                for line in stdout.lines().skip(1) { // Skip "List of devices attached"
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 && parts[1] == "device" {
                        let device_id = parts[0];
                        
                        // Try to get more info about the device
                        let mut name = device_id.to_string();
                        let api_level = "Unknown".to_string();
                        
                        // Parse additional info if available
                        if let Some(model_part) = parts.iter().find(|p| p.starts_with("model:")) {
                            name = model_part.replace("model:", "");
                        }
                        
                        devices.push(AvdDevice {
                            name,
                            target: "Android Device".to_string(),
                            api_level,
                            status: "online".to_string(),
                            device_id: Some(device_id.to_string()),
                        });
                    }
                }
                
                Ok(devices)
            } else {
                Err("Failed to get device list".to_string())
            }
        }
        Err(e) => Err(format!("ADB command failed: {}", e))
    }
}

#[tauri::command]
async fn launch_avd(_app: AppHandle, avd_name: String, cold_boot: bool) -> Result<(), String> {
    let emulator_path = get_emulator_path();
    let mut args = vec!["-avd", &avd_name];
    
    if cold_boot {
        args.push("-wipe-data"); // Cold boot with fresh data
    }
    
    // Launch emulator in background
    match Command::new(&emulator_path).args(&args).spawn() {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to launch AVD: {}", e))
    }
}

// --- Enhanced Reverse Engineering Commands ---
#[tauri::command]
async fn get_network_stats() -> Result<Vec<String>, String> {
    let adb_path = get_adb_path();
    
    // Get network statistics and active connections
    let commands = [
        "shell netstat -an",
        "shell cat /proc/net/tcp",
        "shell dumpsys connectivity",
        "shell dumpsys wifi",
        "shell dumpsys netstats",
    ];
    
    let mut results = Vec::new();
    
    for cmd_args in commands.iter() {
        let args: Vec<&str> = cmd_args.split_whitespace().collect();
        match Command::new(&adb_path).args(&args).output() {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    results.push(format!("=== {} ===\n{}", cmd_args, stdout));
                }
            }
            Err(_) => continue,
        }
    }
    
    Ok(results)
}

#[tauri::command]
async fn get_live_network_connections() -> Result<Vec<NetworkConnection>, String> {
    let adb_path = get_adb_path();
    
    match Command::new(&adb_path).args(["shell", "netstat", "-tuln"]).output() {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut connections = Vec::new();
                let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                
                for line in stdout.lines().skip(2) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 4 {
                        let protocol = parts[0];
                        let local_addr = parts[3];
                        let foreign_addr = if parts.len() > 4 { parts[4] } else { "0.0.0.0:0" };
                        let state = if parts.len() > 5 { parts[5] } else { "UNKNOWN" };
                        
                        let (local_ip, local_port) = parse_address(local_addr);
                        let (remote_ip, remote_port) = parse_address(foreign_addr);
                        
                        connections.push(NetworkConnection {
                            timestamp: timestamp.clone(),
                            local_ip, local_port, remote_ip, remote_port,
                            protocol: protocol.to_string(),
                            state: state.to_string(),
                            process_name: "Unknown".to_string(),
                            bytes_sent: "0".to_string(),
                            bytes_received: "0".to_string(),
                        });
                    }
                }
                Ok(connections)
            } else {
                Err("Failed to get network connections".to_string())
            }
        }
        Err(e) => Err(format!("Network command failed: {}", e))
    }
}

fn parse_address(addr: &str) -> (String, String) {
    if let Some(colon_pos) = addr.rfind(':') {
        let ip = addr[..colon_pos].to_string();
        let port = addr[colon_pos + 1..].to_string();
        (ip, port)
    } else {
        (addr.to_string(), "0".to_string())
    }
}

#[tauri::command]
async fn get_timeline_events() -> Result<Vec<TimelineEvent>, String> {
    // Return empty vector - let real-time events populate the timeline
    // This fixes the "only 1 static row" issue
    Ok(vec![])
}

#[tauri::command]
async fn get_running_apps() -> Result<Vec<String>, String> {
    let adb_path = get_adb_path();
    
    // Get detailed app information for reverse engineering
    let commands = [
        "shell pm list packages -f", // All packages with paths
        "shell dumpsys package", // Detailed package info
        "shell dumpsys activity activities", // Active activities
        "shell dumpsys activity services", // Running services
        "shell dumpsys activity broadcasts", // Broadcast receivers
        "shell dumpsys meminfo", // Memory usage per app
        "shell top -n 1", // Current resource usage
    ];
    
    let mut results = Vec::new();
    
    for cmd_args in commands.iter() {
        let args: Vec<&str> = cmd_args.split_whitespace().collect();
        match Command::new(&adb_path).args(&args).output() {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    results.push(format!("=== {} ===\n{}", cmd_args, stdout));
                }
            }
            Err(_) => continue,
        }
    }
    
    Ok(results)
}