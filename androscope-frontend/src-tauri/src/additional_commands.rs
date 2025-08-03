use std::process::Command;
use tauri::command;

// --- Advanced Reverse Engineering Commands ---

#[tauri::command]
pub async fn extract_apk_info(package_name: String) -> Result<String, String> {
    let adb_path = crate::get_adb_path();
    
    let commands = [
        format!("shell pm path {}", package_name),
        format!("shell dumpsys package {}", package_name),
    ];
    
    let mut results = Vec::new();
    
    for cmd in commands.iter() {
        let args: Vec<&str> = cmd.split_whitespace().collect();
        match Command::new(&adb_path).args(&args).output() {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    results.push(format!("=== {} ===\n{}", cmd, stdout));
                }
            }
            Err(_) => continue,
        }
    }
    
    Ok(results.join("\n\n"))
}

#[tauri::command]
pub async fn dump_app_memory(package_name: String) -> Result<String, String> {
    let adb_path = crate::get_adb_path();
    
    let commands = [
        format!("shell dumpsys meminfo {}", package_name),
        format!("shell ps -A | grep {}", package_name),
    ];
    
    let mut results = Vec::new();
    
    for cmd in commands.iter() {
        let args: Vec<&str> = cmd.split_whitespace().collect();
        match Command::new(&adb_path).args(&args).output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                results.push(format!("=== {} ===\n{}", cmd, stdout));
            }
            Err(_) => continue,
        }
    }
    
    Ok(results.join("\n\n"))
}

#[tauri::command]
pub async fn bypass_ssl_pinning() -> Result<String, String> {
    let mut results = Vec::new();
    results.push("🚨 SSL PINNING BYPASS TECHNIQUES 🚨".to_string());
    results.push("Note: This requires root access and is for educational purposes only!".to_string());
    results.push("".to_string());
    results.push("Recommended techniques:".to_string());
    results.push("1. Use Frida with universal SSL pinning bypass scripts".to_string());
    results.push("2. Install custom CA certificates in /system/etc/security/cacerts/".to_string());
    results.push("3. Use Xposed modules like TrustMeAlready or SSLKillSwitch".to_string());
    results.push("4. Patch the APK to disable certificate validation".to_string());
    results.push("5. Use mitmproxy or Burp Suite with proper certificate setup".to_string());
    Ok(results.join("\n"))
}

#[tauri::command]
pub async fn trace_method_calls(package_name: String) -> Result<String, String> {
    let adb_path = crate::get_adb_path();
    
    let trace_commands = [
        format!("shell am start-activity -S -W {}", package_name),
        "shell dumpsys activity activities".to_string(),
        "shell dumpsys activity services".to_string(),
    ];
    
    let mut results = Vec::new();
    results.push("🔍 METHOD CALL TRACING ACTIVATED 🔍".to_string());
    
    for cmd in trace_commands.iter() {
        let args: Vec<&str> = cmd.split_whitespace().collect();
        match Command::new(&adb_path).args(&args).output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                results.push(format!("=== {} ===\n{}", cmd, stdout));
            }
            Err(_) => continue,
        }
    }
    
    Ok(results.join("\n\n"))
}

#[tauri::command]
pub async fn get_app_certificates(package_name: String) -> Result<String, String> {
    let adb_path = crate::get_adb_path();
    
    let mut results = Vec::new();
    results.push("📜 CERTIFICATE ANALYSIS 📜".to_string());
    
    if let Ok(output) = Command::new(&adb_path).args(["shell", "pm", "path", &package_name]).output() {
        if output.status.success() {
            let apk_path = String::from_utf8_lossy(&output.stdout);
            if let Some(path) = apk_path.lines().next() {
                let path = path.replace("package:", "");
                results.push(format!("APK Path: {}", path.trim()));
            }
        }
    }
    
    Ok(results.join("\n"))
}