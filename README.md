# 🔍 AndroScope Live

**The Ultimate Android Security Monitoring & Reverse Engineering Suite**

AndroScope is a powerful, real-time Android application analysis and security auditing suite. Built with **Tauri**, **Rust**, and **React (TypeScript)**, it bridges the gap between high-performance system-level ADB integration and a premium, responsive user interface. It provides security researchers, penetration testers, and reverse engineers with the tools they need to inspect, debug, and understand Android applications in real time.

---

## 📸 Visual Showcase

<!-- REPLACE WITH YOUR GLOBAL SHOWCASE OR PRODUCT LOGO/GIF -->
<div align="center">
  <img src="path_to_global_showcase.gif" alt="AndroScope Live Global Showcase" width="850" />
</div>

---

## 🛠️ Technology Stack

*   **Frontend**: React, TypeScript, Material-UI (MUI), Recharts
*   **Backend**: Rust, Tauri
*   **System Bridge**: Android Debug Bridge (ADB), Linux kernel event piping (`getevent`)
*   **Decompiler Core**: JADX Decompiler Integration

---

## 🎯 Feature Matrix & Status

Here is the current operational status of the AndroScope dashboard views and backend systems:

| Feature/Page | Status | Key Capabilities |
| :--- | :---: | :--- |
| **APK Decompiler** | 🟢 **Working** | Dynamic APK pulling, JADX decompilation, full interactive code browser, hardcoded secrets detection |
| **Logcat Viewer** | 🟢 **Working** | Focused mode, PID filtering, aggressive noise reduction, regex pattern matching, live streaming |
| **AVD Manager** | 🟢 **Working** | Virtual device listing, launch & cold-boot operations, automated APK auto-installer |
| **Diagnose Page** | 🟢 **Working** | ADB checking, real-time input listeners, logcat pipelines, JADX environment path setup |
| **Device Control** | 🟢 **Working** | Custom ADB command console, intent broadcaster, shell command executors |
| **Dashboard** | 🟢 **Working** | Real-time CPU telemetry charts, system process monitors |
| **Memory Analyzer** | 🟡 *WIP* | Heap/anon region dumping, search-and-replace, cryptographic scanner |
| **Network Monitor** | 🟡 *WIP* | TCP socket capturing, HTTP/HTTPS interceptor, domain resolution logs |
| **Event Timeline** | 🟡 *WIP* | Unified system event ledger, scroll locking, multi-action timelines |

---

## 🟢 Working Features Showcase

### 📱 AVD Manager (Android Virtual Device Manager)
Allows you to list, start, and cold-boot configured emulators. It includes a built-in background task queue that polls the boot status of the emulator and automatically installs your selected APKs the second the device is ready.
*   **Features**: Start emulator, wipe data (cold boot), list available AVDs, auto-install queue.

<div align="center">
  <!-- REPLACE WITH YOUR AVD MANAGER GIF -->
<img width="426" height="240" alt="devicemanager" src="https://github.com/user-attachments/assets/8f5cbb7e-96f6-44b1-bd91-784d738cbe10" />

</div>

---

### 💻 APK Decompiler
Dynamically pulls the compiled APK file directly from your connected device, runs it through the local JADX CLI engine**, and extracts full Java class hierarchies, fields, methods, URLs, API keys, and hardcoded secrets. 
*   **Features**: IDE-like tree navigation, syntax-highlighted source viewer, session persistency, string categorization (credit cards, passwords, API keys).

<div align="center">
  <!-- REPLACE WITH YOUR DECOMPILER GIF -->
 <img width="426" alt="AndroScope Live preview" src="https://github.com/user-attachments/assets/8ae4c393-79eb-4fde-a8e2-70f071619fe1" />
    
</div>

---

### 📱 Focused Logcat Viewer
Streams high-frequency log buffers directly from the target device. In focused mode, it automatically retrieves the Process ID (PID) of your selected app, silences the generic system spam, and prefixes targeted lines for high-fidelity output.
*   **Features**: Focused mode filtering, custom regex searches, atomic stream controls, log coloring by priority.

<div align="center">
  <!-- REPLACE WITH YOUR LOGCAT VIEWER GIF -->
<img width="426" height="240" alt="logcat" src="https://github.com/user-attachments/assets/b0864c51-9aa9-42fb-bd74-eb73ec1e3f31" />

</div>

---

### 🔌 Diagnose Center
Provides a full self-test center for your developer setup. Tests ADB connection states, streams test log lines, ensures process list APIs are healthy, and checks the status of emulator touch inputs.
*   **Features**: Connection verification, detailed system report generators, copy-to-clipboard, custom JADX path config tools.

<div align="center">
  <!-- REPLACE WITH YOUR DIAGNOSE PAGE GIF -->
  <img src="path_to_diagnose_page_showcase.gif" alt="Diagnose Center Showcase" width="800" />
</div>

---

### 📟 Device Control Terminal
An interactive terminal for executing custom ADB shell and settings actions directly on your running instance.
*   **Features**: Intent broadcast triggers, layout bounds toggling, developer options activator, command safety protection whitelist.

<div align="center">
  <!-- REPLACE WITH YOUR DEVICE CONTROL GIF -->
<img width="640" height="640" alt="devicecontrol" src="https://github.com/user-attachments/assets/ca510f68-f0c5-4975-988c-4e0968ee0019" />

</div>

---

### 📊 Real-time Dashboard
Displays telemetry charts mapping the CPU consumption of the device alongside active process logs, updating dynamically.
*   **Features**: Responsive line graphs, auto-updating running process table.

<div align="center">
  <!-- REPLACE WITH YOUR DASHBOARD GIF -->
<img width="426" height="240" alt="dashboard" src="https://github.com/user-attachments/assets/700b716d-cb1a-447a-90fe-f0b727212c3e" />

</div>

---

## 🟡 Under Construction (Work in Progress)

The following components are currently under active development and will be released in an upcoming version:

### 🧠 Memory Analyzer & RAM Scanner
*   *What we are building*: Raw `/proc/{PID}/maps` mapping explorer, un-rooted heap string extractions, real-time memory patches, and automated cryptographic key detection signatures.

<div align="center">
  <!-- REPLACE WITH YOUR MEMORY ANALYZER GIF -->
  <img src="path_to_memory_analyzer_wip.gif" alt="Memory Analyzer WIP Showcase" width="800" />
</div>

---

### 🌐 Live Network Monitor
*   *What we are building*: High-speed TCP/UDP connection trackers, HTTP/HTTPS API call interceptors, and DNS resolution monitoring templates.

<div align="center">
  <!-- REPLACE WITH YOUR NETWORK MONITOR GIF -->
  <img src="path_to_network_monitor_wip.gif" alt="Network Monitor WIP Showcase" width="800" />
</div>

---

### 📊 System Event Timeline
*   *What we are building*: Real-time coordinate logging (`getevent` multitouch listeners), navigation timelines, database query triggers, and cryptographic operation hooks compiled into a central scroll-locked ledger.

<div align="center">
  <!-- REPLACE WITH YOUR EVENT TIMELINE GIF -->
  <img src="path_to_event_timeline_wip.gif" alt="System Event Timeline WIP Showcase" width="800" />
</div>

---

## 🚀 Quick Start & Installation

### Prerequisites
*   **Rust & Cargo**: Required to compile the Tauri backend.
*   **Node.js**: Required to install frontend dependencies.
*   **Java JDK 11+**: Required to run the JADX Decompiler.
*   **Android SDK Platform Tools**: Ensure `adb` is added to your system environment variables.

### Build & Run
1.  **Clone the repository**
    ```bash
    git clone https://github.com/Jcharizard/androscope-live.git
    cd androscope-live
    ```

2.  **Install Frontend Dependencies**
    ```bash
    cd androscope-frontend
    npm install
    ```

3.  **Launch the Tauri Developer Environment**
    ```bash
    npm run tauri dev
    ```

---

## ⚖️ Legal Notice

This tool is created for **educational and authorized security testing purposes only**. Always ensure you have explicit written permission from the application owners before executing reverse engineering, memory inspections, or runtime instrumentation.
