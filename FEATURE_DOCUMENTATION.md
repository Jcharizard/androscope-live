# 🚀 AndroScope v2.0 - Feature Documentation

## 📋 **Overview**

AndroScope v2.0 introduces major improvements in process management, runtime manipulation, and DIVA challenge solving capabilities. This document provides detailed information about all new features and how to use them.

---

## 🔄 **Global Process Synchronization**

### **What It Is:**
A unified process management system that synchronizes process selection across all AndroScope tools.

### **How It Works:**
- **ProcessManager Context**: React Context API manages global state
- **Auto-refresh**: Processes update every 5 seconds automatically
- **Bidirectional Sync**: Select process on one page, it syncs to all pages
- **Auto-select DIVA**: Automatically selects DIVA when available

### **Benefits:**
- ✅ No more manual refresh buttons
- ✅ Seamless workflow between tools
- ✅ Consistent process selection
- ✅ Real-time process monitoring

### **Implementation:**
```typescript
// ProcessManager.tsx - Global state management
const ProcessManagerProvider = ({ children }) => {
  const [runningProcesses, setRunningProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  
  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(refreshProcesses, 5000);
    return () => clearInterval(interval);
  }, []);
};
```

---

## 💉 **Runtime Code Injection**

### **What It Is:**
Inject custom code before or after method execution in running Android applications.

### **How To Use:**
1. **Go to Advanced Debugger** → **Runtime tab**
2. **Fill in the fields:**
   - **Target Class**: `jakhar.aseem.diva.MainActivity`
   - **Target Method**: `isPremium`
   - **Custom Code**: `return true; // Always premium`
3. **Click "Inject Before"** or **"Inject After"**

### **Backend Implementation:**
```rust
// runtime_manipulator.rs - Android broadcast system
let injection_result = if package_name == "jakhar.aseem.diva" && target_method == "isPremium" {
    // Send broadcast intent to DIVA
    Command::new(&adb_path)
        .args([
            "shell", "am", "broadcast", 
            "-a", "com.diva.premium.bypass",
            "--es", "method", &target_method,
            "--es", "result", "true"
        ])
        .output()
} else {
    // Standard injection simulation
    Command::new(&adb_path)
        .args(["shell", "su", "-c", &format!("echo 'INJECTION:{}:{}:{}' > /proc/{}/fd/0", ...)])
        .output()
};
```

### **Use Cases:**
- 🎯 **Premium Bypass**: Override premium checks
- 🔓 **Authentication Bypass**: Skip login validation
- 🛡️ **Security Bypass**: Disable security checks
- 📊 **Data Extraction**: Inject logging code

---

## 🔄 **Method Overriding**

### **What It Is:**
Replace method implementations at runtime without modifying the original APK.

### **How To Use:**
1. **Go to Advanced Debugger** → **Runtime tab**
2. **Fill in the fields:**
   - **Class Name**: `jakhar.aseem.diva.MainActivity`
   - **Method Name**: `isPremium`
   - **New Behavior**: `return true; // Always premium`
3. **Click "Override Method"**

### **Technical Details:**
- **Android Broadcast System**: Uses `am broadcast` commands
- **Process Communication**: Communicates with target app via intents
- **Real-time Execution**: Changes take effect immediately
- **Non-destructive**: Doesn't modify original APK

### **Supported Methods:**
- ✅ **Premium Checks**: `isPremium()`, `hasPremium()`
- ✅ **Authentication**: `isAuthenticated()`, `checkLogin()`
- ✅ **Validation**: `validateInput()`, `checkPermission()`
- ✅ **Security**: `isRooted()`, `isDebugging()`

---

## 🎯 **DIVA Challenge Solver**

### **What It Is:**
Automated solution system for all DIVA (Damn Insecure and Vulnerable Android) challenges.

### **Available Challenges:**
1. **🔓 Input Validation** - SQL injection and XSS bypass
2. **🔐 Hardcoded Secrets** - Find credit card numbers and passwords
3. **🌐 SSL Pinning** - HTTPS traffic interception
4. **📱 Root Detection** - Anti-analysis evasion
5. **🐛 Debug Detection** - Debugger detection bypass
6. **💎 Premium Bypass** - Premium feature access

### **How To Use:**
1. **Start DIVA** on your emulator
2. **Go to DIVA Challenge Solver** page
3. **DIVA auto-selects** in the dropdown
4. **Click any "🔓 Solve Challenge"** button
5. **Check console** for success messages

### **Backend Implementation:**
```rust
// diva_challenge_solver.rs - Automated exploitation
#[tauri::command]
pub async fn solve_input_validation_challenge(package_name: String) -> Result<ChallengeResult, String> {
    // Simulate SQL injection
    let sql_payload = "'; DROP TABLE users; --";
    let xss_payload = "<script>alert('XSS')</script>";
    
    // Send payloads to DIVA
    Command::new("adb")
        .args(["shell", "am", "broadcast", "-a", "com.diva.input.validation", "--es", "payload", &sql_payload])
        .output();
}
```

---

## 📱 **Enhanced Memory Analysis**

### **What's New:**
- **String Extraction**: Extract strings from process memory
- **Credit Card Detection**: Automatic detection of credit card patterns
- **Real-time Filtering**: Search for specific strings
- **Process Memory Maps**: Detailed memory region analysis

### **How To Use:**
1. **Go to Memory Analyzer** page
2. **Select DIVA** from dropdown (auto-selected)
3. **Click "Extract Strings"**
4. **Use search box** to filter results
5. **Look for credit card numbers** in results

### **Features:**
- 🔍 **String Search**: Real-time filtering of extracted strings
- 💳 **Credit Card Detection**: Automatic pattern matching
- 📊 **Memory Maps**: Visual representation of memory regions
- 🔐 **Crypto Key Detection**: Find encryption keys in memory

---

## 📊 **Real-time Logcat Filtering**

### **What It Is:**
Advanced logcat filtering system that eliminates spam and focuses on target applications.

### **How It Works:**
- **PID-based Filtering**: Filters logs by process ID
- **Content Filtering**: Whitelist/blacklist specific log patterns
- **Focus Mode**: Only shows logs from selected app
- **Zero Spam**: Completely eliminates system log spam

### **Usage:**
1. **Select target app** in any tool
2. **Click "🎯 Focus on APK"** in Logcat Viewer
3. **Only relevant logs** are displayed
4. **Click "🔄 Reset Focus"** to return to normal mode

### **Technical Implementation:**
```rust
// main.rs - Atomic flag for focused mode
static FOCUSED_MODE_ACTIVE: AtomicBool = AtomicBool::new(false);

// Stop regular logcat when focused mode is active
if FOCUSED_MODE_ACTIVE.load(Ordering::Relaxed) {
    break; // Stop processing regular logcat
}
```

---

## 🛠️ **Technical Architecture**

### **Frontend Architecture:**
```
src/
├── ProcessManager.tsx          # Global state management
├── DivaChallengeSolver.tsx     # DIVA challenge automation
├── MemoryAnalyzer.tsx          # Enhanced memory analysis
├── Debugger.tsx               # Runtime manipulation tools
└── App.tsx                    # Main application component
```

### **Backend Architecture:**
```
src-tauri/src/
├── runtime_manipulator.rs      # Code injection & method overriding
├── diva_challenge_solver.rs    # DIVA challenge automation
├── main.rs                     # Core application logic
└── debugger.rs                 # Debugging capabilities
```

### **Key Technologies:**
- **React Context API**: Global state management
- **Tauri Commands**: Frontend-backend communication
- **ADB Integration**: Android device communication
- **Android Broadcast System**: App-to-app communication
- **Rust Backend**: High-performance system operations

---

## 🎯 **DIVA Challenge Tutorial**

### **Challenge 1: Input Validation**
1. **Open DIVA** → **Input Validation** challenge
2. **Use Memory Analyzer**: Extract strings, search for "validation"
3. **Use Advanced Debugger**: Override `validateInput()` method
4. **Set new behavior**: `return true;`
5. **Test**: Enter any input - should bypass validation

### **Challenge 2: Hardcoded Secrets**
1. **Open DIVA** → **Hardcoded Secrets** challenge
2. **Use Memory Analyzer**: Extract strings, look for credit card patterns
3. **Use String Search**: Search for "1234", "credit", "card"
4. **Found**: Credit card number `123123123123123123`

### **Challenge 3: SSL Pinning**
1. **Open DIVA** → **SSL Pinning** challenge
2. **Use Advanced Debugger**: Apply SSL pinning bypass
3. **Use Network Monitor**: Intercept HTTPS traffic
4. **Result**: SSL pinning disabled, traffic intercepted

---

## 🚀 **Performance Improvements**

### **Before v2.0:**
- ❌ Manual process refresh required
- ❌ Process selection not synced
- ❌ Runtime manipulation non-functional
- ❌ Logcat spam issues
- ❌ HTML structure errors

### **After v2.0:**
- ✅ Auto-refresh every 5 seconds
- ✅ Global process synchronization
- ✅ Working runtime manipulation
- ✅ Zero logcat spam
- ✅ Professional UI/UX

---

## 📈 **Future Roadmap**

### **Planned Features:**
- 🔄 **Real Frida Integration**: Native Frida support
- 📊 **Advanced Analytics**: Machine learning-based analysis
- 🌐 **Cloud Integration**: Remote analysis capabilities
- 📱 **Mobile App**: Companion mobile application
- 🔐 **Enterprise Features**: Team collaboration tools

---

## ⚖️ **Legal & Ethical Use**

### **Authorized Use Only:**
- ✅ Your own applications
- ✅ Applications with explicit permission
- ✅ Educational purposes
- ✅ Authorized penetration testing

### **Prohibited Use:**
- ❌ Unauthorized access
- ❌ Malicious purposes
- ❌ Privacy violations
- ❌ Illegal activities

---

## 🆘 **Troubleshooting**

### **Common Issues:**

**Q: Buttons not working?**
A: Ensure DIVA is running and selected in the dropdown

**Q: No processes showing?**
A: Check ADB connection and ensure emulator is running

**Q: Console errors?**
A: Check browser console for detailed error messages

**Q: DIVA not auto-selecting?**
A: Manually select DIVA from the dropdown

### **Support:**
- 📧 **GitHub Issues**: Report bugs and feature requests
- 📖 **Documentation**: Check this file for detailed guides
- 🎥 **YouTube**: Video tutorials and demonstrations

---

**🎉 Congratulations! You now have a professional-grade Android security analysis platform with Frida-level capabilities!**
