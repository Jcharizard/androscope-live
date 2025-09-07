# 🔍 AndroScope Live

**The Ultimate Android Security Monitoring & Reverse Engineering Suite**

AndroScope is a powerful, real-time Android application analysis platform built with Tauri, Rust, and React. It provides comprehensive monitoring, reverse engineering capabilities, and security analysis tools for Android applications and emulators.

## 🚀 Features

### 📱 **Real-Time Monitoring**
- **Live Network Traffic Analysis** - HTTP/HTTPS requests, API calls, DNS queries
- **System Call Tracing** - File access, database operations, permissions
- **Memory & Process Monitoring** - CPU usage, memory consumption, active processes
- **Timeline Analysis** - Millisecond-precision event tracking (API Monitor style)

### 🔧 **Reverse Engineering Suite**
- **APK Analysis** - Static analysis of Android applications with detailed security reports
- **Memory Dumps** - Extract sensitive data from running apps with string filtering
- **Method Tracing** - Function call logging with parameters and call stack analysis
- **SSL Pinning Bypass** - HTTPS traffic interception capabilities
- **Certificate Analysis** - App signing and trust chain analysis
- **Runtime Code Injection** - Inject custom code before/after methods (Frida-level capabilities)
- **Method Overriding** - Replace method implementations at runtime
- **Memory Patching** - Modify memory values in real-time
- **API Hooking** - Intercept system calls and API functions
- **Dynamic Script Execution** - Run custom scripts on device
- **Global Process Synchronization** - Seamless process selection across all tools
- **Auto-Refresh Process List** - Real-time process monitoring with 5-second polling

### 🛡️ **Security Detection**
- **35+ Security Patterns** - Automatic detection of vulnerabilities
- **IOC Scanning** - Real-time threat pattern matching  
- **Behavioral Analysis** - Suspicious activity detection
- **JWT Token Detection** - Authentication token discovery
- **Crypto Operations** - Encryption/decryption monitoring
- **DIVA Challenge Solver** - Automated solution for all DIVA challenges with one-click solving
- **Input Validation Bypass** - SQL injection, XSS, and validation bypasses
- **Hardcoded Secrets Discovery** - Find credentials and sensitive data
- **Anti-Analysis Bypass** - Root detection, debug detection, SSL pinning bypass
- **Real-time Logcat Filtering** - Focus on specific apps with PID-based filtering
- **Advanced Memory Analysis** - String extraction with credit card detection
- **Process Memory Maps** - Detailed memory region analysis

## 🛠️ **Technology Stack**

- **Frontend**: React + TypeScript + Material-UI
- **Backend**: Rust + Tauri
- **Platform**: Cross-platform desktop application
- **Analysis**: ADB integration for Android debugging

## 🆕 **Latest Updates (v2.0)**

### **🔧 Major Improvements:**
- **Global Process Synchronization** - Process selection now syncs across all tools automatically
- **Auto-Refresh Process List** - No more manual refresh buttons, processes update every 5 seconds
- **Enhanced DIVA Challenge Solver** - One-click solution for all DIVA challenges
- **Working Runtime Manipulation** - Code injection and method overriding now functional
- **Real-time Logcat Filtering** - Focus on specific apps with zero spam
- **Advanced Memory Analysis** - String extraction with credit card detection
- **Professional UI/UX** - Fixed all HTML structure errors and improved responsiveness

### **🎯 DIVA Challenge Support:**
- **Input Validation Bypass** - Automated SQL injection and XSS detection
- **Hardcoded Secrets Discovery** - Find credit card numbers and sensitive data
- **SSL Pinning Bypass** - HTTPS traffic interception
- **Root Detection Bypass** - Anti-analysis evasion
- **Debug Detection Bypass** - Debugger detection evasion
- **Premium Bypass** - Method overriding for premium features

## 🚀 **Quick Start**

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jcharizard/androscope-live.git
   cd androscope-live
   ```

2. **Install dependencies**
   ```bash
   cd androscope-frontend
   npm install
   ```

3. **Run development server**
   ```bash
   npx tauri dev
   ```

4. **Connect your Android device or start an emulator**

5. **Start monitoring!**

## ⚖️ **Legal Notice**

**This tool is for educational and authorized security testing purposes only.**

- Use only on applications you own or have explicit permission to test
- Respect all applicable laws and regulations
- Do not use for unauthorized access or malicious purposes

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

---

**⚠️ Remember: With great power comes great responsibility. Use ethically and legally!**
