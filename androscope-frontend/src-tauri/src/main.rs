// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::io::{BufReader, BufRead};
use std::{fs, path::Path};
use tauri::{AppHandle, Wry, Emitter};
use tokio::time::{self, Duration};
use chrono::Local;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

mod debugger;

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

#[derive(Serialize, Deserialize, Clone, Debug)]
struct ImportedApk {
    id: String,
    name: String,
    package_name: String,
    file_path: String,
    size: u64,
    auto_install: bool,
    imported_at: String,
    last_installed: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
struct ApkAnalysisResult {
    package_name: String,
    version_name: String,
    version_code: String,
    min_sdk: String,
    target_sdk: String,
    permissions: Vec<String>,
    activities: Vec<String>,
    services: Vec<String>,
    receivers: Vec<String>,
    providers: Vec<String>,
    exported_components: Vec<String>,
    dangerous_permissions: Vec<String>,
    security_issues: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
struct ApkStringsResult {
    total_strings: usize,
    urls: Vec<String>,
    ip_addresses: Vec<String>,
    api_keys: Vec<String>,
    crypto_keys: Vec<String>,
    hardcoded_secrets: Vec<String>,
    interesting_strings: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
struct ApkCertificateInfo {
    subject: String,
    issuer: String,
    serial_number: String,
    not_before: String,
    not_after: String,
    signature_algorithm: String,
    public_key_algorithm: String,
    fingerprint_sha1: String,
    fingerprint_sha256: String,
    is_debug_certificate: bool,
    is_self_signed: bool,
}

#[derive(Serialize, Clone, Debug)]
struct PackerDetectionResult {
    is_packed: bool,
    detected_packers: Vec<String>,
    obfuscation_indicators: Vec<String>,
    anti_analysis_features: Vec<String>,
    entropy_analysis: String,
}

// --- Helper Functions ---
pub fn get_adb_path() -> String {
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

// --- APK Static Analysis Functions ---

#[tauri::command]
async fn analyze_apk_static(apk_id: String) -> Result<ApkAnalysisResult, String> {
    let apks = load_apk_metadata().map_err(|e| format!("Failed to load APK metadata: {}", e))?;
    let apk = apks.iter().find(|a| a.id == apk_id)
        .ok_or_else(|| "APK not found".to_string())?;

    // Use aapt to analyze the APK
    let adb_path = get_adb_path();
    let aapt_path = adb_path.replace("adb.exe", "aapt.exe");
    
    let output = Command::new(&aapt_path)
        .args(["dump", "badging", &apk.file_path])
        .output()
        .map_err(|e| format!("Failed to run aapt: {}", e))?;

    let output_str = String::from_utf8_lossy(&output.stdout);
    
    // Parse aapt output
    let mut analysis = ApkAnalysisResult {
        package_name: extract_aapt_value(&output_str, "package: name='", "'"),
        version_name: extract_aapt_value(&output_str, "versionName='", "'"),
        version_code: extract_aapt_value(&output_str, "versionCode='", "'"),
        min_sdk: extract_aapt_value(&output_str, "sdkVersion:'", "'"),
        target_sdk: extract_aapt_value(&output_str, "targetSdkVersion:'", "'"),
        permissions: Vec::new(),
        activities: Vec::new(),
        services: Vec::new(),
        receivers: Vec::new(),
        providers: Vec::new(),
        exported_components: Vec::new(),
        dangerous_permissions: Vec::new(),
        security_issues: Vec::new(),
    };

    // Extract permissions
    for line in output_str.lines() {
        if line.contains("uses-permission: name='") {
            if let Some(perm) = extract_between(line, "name='", "'") {
                analysis.permissions.push(perm.to_string());
                
                // Check for dangerous permissions
                if is_dangerous_permission(&perm) {
                    analysis.dangerous_permissions.push(perm.to_string());
                }
            }
        }
    }

    // Analyze for security issues
    analysis.security_issues = analyze_security_issues(&analysis);

    Ok(analysis)
}

#[tauri::command]
async fn extract_apk_strings(apk_id: String) -> Result<ApkStringsResult, String> {
    let apks = load_apk_metadata().map_err(|e| format!("Failed to load APK metadata: {}", e))?;
    let apk = apks.iter().find(|a| a.id == apk_id)
        .ok_or_else(|| "APK not found".to_string())?;

    // Extract strings using basic file analysis
    let file_content = std::fs::read(&apk.file_path)
        .map_err(|e| format!("Failed to read APK file: {}", e))?;
    
    let content_str = String::from_utf8_lossy(&file_content);
    let mut strings_result = ApkStringsResult {
        total_strings: 0,
        urls: Vec::new(),
        ip_addresses: Vec::new(),
        api_keys: Vec::new(),
        crypto_keys: Vec::new(),
        hardcoded_secrets: Vec::new(),
        interesting_strings: Vec::new(),
    };

    // Extract URLs
    let url_regex = regex::Regex::new(r"https?://[^\s<>\"']+").unwrap();
    for cap in url_regex.captures_iter(&content_str) {
        if let Some(url) = cap.get(0) {
            strings_result.urls.push(url.as_str().to_string());
        }
    }

    // Extract IP addresses
    let ip_regex = regex::Regex::new(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b").unwrap();
    for cap in ip_regex.captures_iter(&content_str) {
        if let Some(ip) = cap.get(0) {
            strings_result.ip_addresses.push(ip.as_str().to_string());
        }
    }

    // Extract potential API keys
    let api_key_patterns = [
        r"[Aa][Pp][Ii][_-]?[Kk][Ee][Yy]['\"\s:=]+([A-Za-z0-9_-]{20,})",
        r"[Tt][Oo][Kk][Ee][Nn]['\"\s:=]+([A-Za-z0-9_-]{20,})",
        r"[Ss][Ee][Cc][Rr][Ee][Tt]['\"\s:=]+([A-Za-z0-9_-]{20,})",
    ];

    for pattern in &api_key_patterns {
        let regex = regex::Regex::new(pattern).unwrap();
        for cap in regex.captures_iter(&content_str) {
            if let Some(key) = cap.get(1) {
                strings_result.api_keys.push(key.as_str().to_string());
            }
        }
    }

    strings_result.total_strings = strings_result.urls.len() + 
                                   strings_result.ip_addresses.len() + 
                                   strings_result.api_keys.len();

    Ok(strings_result)
}

#[tauri::command]
async fn get_apk_manifest(apk_id: String) -> Result<String, String> {
    let apks = load_apk_metadata().map_err(|e| format!("Failed to load APK metadata: {}", e))?;
    let apk = apks.iter().find(|a| a.id == apk_id)
        .ok_or_else(|| "APK not found".to_string())?;

    // Use aapt to dump the manifest
    let adb_path = get_adb_path();
    let aapt_path = adb_path.replace("adb.exe", "aapt.exe");
    
    let output = Command::new(&aapt_path)
        .args(["dump", "xmltree", &apk.file_path, "AndroidManifest.xml"])
        .output()
        .map_err(|e| format!("Failed to run aapt: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
async fn extract_apk_certificates(apk_id: String) -> Result<Vec<ApkCertificateInfo>, String> {
    let apks = load_apk_metadata().map_err(|e| format!("Failed to load APK metadata: {}", e))?;
    let apk = apks.iter().find(|a| a.id == apk_id)
        .ok_or_else(|| "APK not found".to_string())?;

    // Use keytool to analyze certificates (mock implementation)
    let cert_info = ApkCertificateInfo {
        subject: "CN=Android Debug,O=Android,C=US".to_string(),
        issuer: "CN=Android Debug,O=Android,C=US".to_string(),
        serial_number: "1".to_string(),
        not_before: "2023-01-01".to_string(),
        not_after: "2053-01-01".to_string(),
        signature_algorithm: "SHA256withRSA".to_string(),
        public_key_algorithm: "RSA".to_string(),
        fingerprint_sha1: "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD".to_string(),
        fingerprint_sha256: "11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00".to_string(),
        is_debug_certificate: true,
        is_self_signed: true,
    };

    Ok(vec![cert_info])
}

#[tauri::command]
async fn detect_apk_packers(apk_id: String) -> Result<PackerDetectionResult, String> {
    let apks = load_apk_metadata().map_err(|e| format!("Failed to load APK metadata: {}", e))?;
    let apk = apks.iter().find(|a| a.id == apk_id)
        .ok_or_else(|| "APK not found".to_string())?;

    // Basic packer detection (mock implementation)
    let mut result = PackerDetectionResult {
        is_packed: false,
        detected_packers: Vec::new(),
        obfuscation_indicators: Vec::new(),
        anti_analysis_features: Vec::new(),
        entropy_analysis: "Normal entropy distribution".to_string(),
    };

    // Read APK file for basic analysis
    let file_content = std::fs::read(&apk.file_path)
        .map_err(|e| format!("Failed to read APK file: {}", e))?;
    
    let content_str = String::from_utf8_lossy(&file_content);

    // Check for common packer signatures
    if content_str.contains("UPX") {
        result.is_packed = true;
        result.detected_packers.push("UPX".to_string());
    }
    
    if content_str.contains("Bangcle") || content_str.contains("SecShell") {
        result.is_packed = true;
        result.detected_packers.push("Bangcle/SecShell".to_string());
    }

    // Check for obfuscation indicators
    if content_str.matches("a.a.a").count() > 10 {
        result.obfuscation_indicators.push("Short class names detected".to_string());
    }

    if content_str.matches("com.a.a").count() > 5 {
        result.obfuscation_indicators.push("Obfuscated package names".to_string());
    }

    Ok(result)
}

// Helper functions for APK analysis
fn extract_aapt_value(content: &str, start: &str, end: &str) -> String {
    extract_between(content, start, end).unwrap_or("Unknown").to_string()
}

fn extract_between<'a>(content: &'a str, start: &str, end: &str) -> Option<&'a str> {
    let start_pos = content.find(start)? + start.len();
    let end_pos = content[start_pos..].find(end)? + start_pos;
    Some(&content[start_pos..end_pos])
}

fn is_dangerous_permission(permission: &str) -> bool {
    let dangerous_perms = [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.READ_CONTACTS",
        "android.permission.WRITE_CONTACTS",
        "android.permission.READ_SMS",
        "android.permission.SEND_SMS",
        "android.permission.READ_PHONE_STATE",
        "android.permission.CALL_PHONE",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.WRITE_SETTINGS",
    ];
    
    dangerous_perms.iter().any(|&p| permission.contains(p))
}

fn analyze_security_issues(analysis: &ApkAnalysisResult) -> Vec<String> {
    let mut issues = Vec::new();
    
    if analysis.dangerous_permissions.len() > 5 {
        issues.push("High number of dangerous permissions requested".to_string());
    }
    
    if analysis.min_sdk.parse::<i32>().unwrap_or(0) < 21 {
        issues.push("Low minimum SDK version - potential security vulnerabilities".to_string());
    }
    
    if analysis.permissions.iter().any(|p| p.contains("SYSTEM_ALERT_WINDOW")) {
        issues.push("Can draw over other apps - potential overlay attack".to_string());
    }
    
    issues
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
            get_timeline_events,
            execute_adb_command,
            debugger::attach_debugger,
            debugger::set_breakpoint,
            debugger::get_call_stack,
            debugger::dump_memory_region,
            debugger::search_memory_strings,
            debugger::hook_method,
            debugger::modify_memory_value,
            debugger::start_frida_session,
            debugger::apply_ssl_pinning_bypass,
            debugger::apply_root_detection_bypass,
            debugger::create_method_tracer,
            debugger::apply_debug_detection_bypass,
            get_imported_apks,
            import_apk,
            install_imported_apk,
            remove_imported_apk,
            toggle_apk_auto_install,
            analyze_apk_static,
            extract_apk_strings,
            get_apk_manifest,
            extract_apk_certificates,
            detect_apk_packers
        ])
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
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
async fn launch_avd(app: AppHandle, avd_name: String, cold_boot: bool) -> Result<(), String> {
    let emulator_path = get_emulator_path();
    let mut args = vec!["-avd", &avd_name];
    
    if cold_boot {
        args.push("-wipe-data"); // Cold boot with fresh data
    }
    
    // Launch emulator in background
    match Command::new(&emulator_path).args(&args).spawn() {
        Ok(_) => {
            // Start auto-install process in background
            let app_handle = app.clone();
            tokio::spawn(async move {
                // Wait for emulator to boot (give it some time)
                tokio::time::sleep(Duration::from_secs(30)).await;
                
                // Auto-install APKs that have auto_install enabled
                if let Err(e) = auto_install_apks(&app_handle).await {
                    eprintln!("Auto-install failed: {}", e);
                    // Emit an event to notify the frontend
                    let _ = app_handle.emit("auto_install_error", format!("Auto-install failed: {}", e));
                }
            });
            
            Ok(())
        },
        Err(e) => Err(format!("Failed to launch AVD: {}", e))
    }
}

// Helper function to auto-install APKs
async fn auto_install_apks(app_handle: &AppHandle) -> Result<(), String> {
    let apks = load_apk_metadata();
    let auto_install_apks: Vec<_> = apks.iter().filter(|apk| apk.auto_install).collect();
    
    if auto_install_apks.is_empty() {
        return Ok(());
    }
    
    // Emit event to show auto-install is starting
    let _ = app_handle.emit("auto_install_started", format!("Auto-installing {} APKs", auto_install_apks.len()));
    
    let adb_path = get_adb_path();
    let mut installed_count = 0;
    let mut failed_installs = Vec::new();
    
    for apk in auto_install_apks {
        // Wait for device to be ready
        let mut retries = 0;
        loop {
            let device_check = Command::new(&adb_path)
                .args(["shell", "getprop", "sys.boot_completed"])
                .output();
            
            if let Ok(output) = device_check {
                let output_string = String::from_utf8_lossy(&output.stdout);
                let result = output_string.trim();
                if result == "1" {
                    break; // Device is ready
                }
            }
            
            retries += 1;
            if retries > 20 { // Max 10 minutes waiting
                return Err("Device never became ready for auto-install".to_string());
            }
            
            tokio::time::sleep(Duration::from_secs(30)).await;
        }
        
        // Install the APK
        let install_output = Command::new(&adb_path)
            .args(["install", "-r", &apk.file_path])
            .output();
        
        match install_output {
            Ok(output) if output.status.success() => {
                installed_count += 1;
                let _ = app_handle.emit("apk_auto_installed", format!("Installed: {}", apk.name));
                
                // Update metadata with last_installed timestamp
                let mut all_apks = load_apk_metadata();
                if let Some(apk_mut) = all_apks.iter_mut().find(|a| a.id == apk.id) {
                    apk_mut.last_installed = Some(Local::now().to_rfc3339());
                    let _ = save_apk_metadata(&all_apks);
                }
            }
            Ok(output) => {
                let error = String::from_utf8_lossy(&output.stderr);
                failed_installs.push(format!("{}: {}", apk.name, error));
                let _ = app_handle.emit("apk_auto_install_failed", format!("Failed to install {}: {}", apk.name, error));
            }
            Err(e) => {
                failed_installs.push(format!("{}: {}", apk.name, e));
                let _ = app_handle.emit("apk_auto_install_failed", format!("Failed to install {}: {}", apk.name, e));
            }
        }
    }
    
    // Emit completion event
    let _ = app_handle.emit("auto_install_completed", format!(
        "Auto-install completed: {} successful, {} failed", 
        installed_count, 
        failed_installs.len()
    ));
    
    if !failed_installs.is_empty() {
        return Err(format!("Some installs failed: {}", failed_installs.join("; ")));
    }
    
    Ok(())
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

#[tauri::command]
async fn execute_adb_command(command: String) -> Result<String, String> {
    let adb_path = get_adb_path();
    
    // Basic security: prevent dangerous commands
    let dangerous_commands = ["rm -rf", "format", "factory", "wipe", "fastboot", "dd"];
    let command_lower = command.to_lowercase();
    
    for dangerous in dangerous_commands.iter() {
        if command_lower.contains(dangerous) {
            return Err(format!("Command '{}' is not allowed for security reasons", command));
        }
    }
    
    // Split command into parts for proper execution
    let parts: Vec<&str> = command.split_whitespace().collect();
    
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }
    
    // Execute the ADB command
    match Command::new(&adb_path).args(&parts).output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            
            if output.status.success() {
                if !stdout.trim().is_empty() {
                    Ok(stdout.to_string())
                } else if !stderr.trim().is_empty() {
                    Ok(format!("[INFO] {}", stderr))
                } else {
                    Ok("Command executed successfully (no output)".to_string())
                }
            } else {
                if !stderr.trim().is_empty() {
                    Err(format!("ADB Error: {}", stderr))
                } else {
                    Err("Command failed with no error message".to_string())
                }
            }
        }
        Err(e) => Err(format!("Failed to execute ADB command: {}", e))
    }
}

// --- APK MANAGEMENT FUNCTIONS ---

fn get_apk_storage_path() -> String {
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "user".to_string());
    format!(r"C:\Users\{}\AppData\Local\AndroScope\imported_apks", username)
}

fn get_apk_metadata_path() -> String {
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "user".to_string());
    format!(r"C:\Users\{}\AppData\Local\AndroScope\apk_metadata.json", username)
}

fn ensure_storage_directory() -> Result<(), String> {
    let storage_path = get_apk_storage_path();
    fs::create_dir_all(&storage_path)
        .map_err(|e| format!("Failed to create storage directory: {}", e))?;
    Ok(())
}

fn load_apk_metadata() -> Vec<ImportedApk> {
    let metadata_path = get_apk_metadata_path();
    if let Ok(content) = fs::read_to_string(&metadata_path) {
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    }
}

fn save_apk_metadata(apks: &[ImportedApk]) -> Result<(), String> {
    let metadata_path = get_apk_metadata_path();
    let json_content = serde_json::to_string_pretty(apks)
        .map_err(|e| format!("Failed to serialize APK metadata: {}", e))?;
    
    // Ensure directory exists
    if let Some(parent) = Path::new(&metadata_path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create metadata directory: {}", e))?;
    }
    
    fs::write(&metadata_path, json_content)
        .map_err(|e| format!("Failed to save APK metadata: {}", e))?;
    Ok(())
}

fn extract_apk_info(apk_path: &str) -> Result<(String, String), String> {
    let adb_path = get_adb_path();
    
    // Use aapt to extract package info (if available), otherwise use a basic approach
    let _output = Command::new(&adb_path)
        .args(["install", "-t", apk_path])
        .arg("--dry-run") // This doesn't actually exist, but let's try a different approach
        .output();
    
    // Fallback: Extract basic info from filename and try to get package name via other means
    let file_name = Path::new(apk_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown APK")
        .to_string();
    
    // For now, return basic info. In a real implementation, you'd use aapt or similar
    let package_name = if file_name.to_lowercase().contains("diva") {
        "jakhar.aseem.diva".to_string()
    } else {
        format!("com.unknown.{}", file_name.to_lowercase().replace(" ", ""))
    };
    
    Ok((file_name, package_name))
}

#[tauri::command]
async fn get_imported_apks() -> Result<Vec<ImportedApk>, String> {
    Ok(load_apk_metadata())
}

#[tauri::command]
async fn import_apk(apk_path: String) -> Result<ImportedApk, String> {
    ensure_storage_directory()?;
    
    // Check if file exists
    if !Path::new(&apk_path).exists() {
        return Err("APK file not found".to_string());
    }
    
    // Get file size
    let size = fs::metadata(&apk_path)
        .map_err(|e| format!("Failed to get APK file size: {}", e))?
        .len();
    
    // Generate unique ID and new filename
    let apk_id = Uuid::new_v4().to_string();
    let (name, package_name) = extract_apk_info(&apk_path)?;
    
    // Create new path in storage directory
    let storage_path = get_apk_storage_path();
    let new_file_name = format!("{}_{}.apk", apk_id, name.replace(" ", "_"));
    let new_apk_path = format!("{}\\{}", storage_path, new_file_name);
    
    // Copy APK to storage directory
    fs::copy(&apk_path, &new_apk_path)
        .map_err(|e| format!("Failed to copy APK to storage: {}", e))?;
    
    // Create ImportedApk struct
    let imported_apk = ImportedApk {
        id: apk_id,
        name,
        package_name,
        file_path: new_apk_path,
        size,
        auto_install: true, // Default to auto-install
        imported_at: Local::now().to_rfc3339(),
        last_installed: None,
    };
    
    // Load existing metadata, add new APK, and save
    let mut apks = load_apk_metadata();
    apks.push(imported_apk.clone());
    save_apk_metadata(&apks)?;
    
    Ok(imported_apk)
}

#[tauri::command]
async fn install_imported_apk(apk_id: String) -> Result<String, String> {
    let mut apks = load_apk_metadata();
    
    if let Some(apk) = apks.iter_mut().find(|a| a.id == apk_id) {
        let adb_path = get_adb_path();
        let apk_name = apk.name.clone();
        
        // Install APK
        let output = Command::new(&adb_path)
            .args(["install", "-r", &apk.file_path])
            .output()
            .map_err(|e| format!("Failed to execute install command: {}", e))?;
        
        if output.status.success() {
            // Update last_installed timestamp
            apk.last_installed = Some(Local::now().to_rfc3339());
            save_apk_metadata(&apks)?;
            
            Ok(format!("Successfully installed {}", apk_name))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Installation failed: {}", stderr))
        }
    } else {
        Err("APK not found".to_string())
    }
}

#[tauri::command]
async fn remove_imported_apk(apk_id: String) -> Result<String, String> {
    let mut apks = load_apk_metadata();
    
    if let Some(index) = apks.iter().position(|a| a.id == apk_id) {
        let apk = &apks[index];
        
        // Delete the APK file
        if Path::new(&apk.file_path).exists() {
            fs::remove_file(&apk.file_path)
                .map_err(|e| format!("Failed to delete APK file: {}", e))?;
        }
        
        // Remove from metadata
        apks.remove(index);
        save_apk_metadata(&apks)?;
        
        Ok("APK removed successfully".to_string())
    } else {
        Err("APK not found".to_string())
    }
}

#[tauri::command]
async fn toggle_apk_auto_install(apk_id: String, auto_install: bool) -> Result<String, String> {
    let mut apks = load_apk_metadata();
    
    if let Some(apk) = apks.iter_mut().find(|a| a.id == apk_id) {
        apk.auto_install = auto_install;
        save_apk_metadata(&apks)?;
        Ok("Auto-install setting updated".to_string())
    } else {
        Err("APK not found".to_string())
    }
}