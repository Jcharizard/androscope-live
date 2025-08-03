# AndroScope Backend

This directory contains the Node.js backend server for AndroScope.

## Functionality

The backend acts as a bridge between the frontend UI and the connected Android emulator. It uses the Android Debug Bridge (ADB) to execute commands and stream data.

-   **Real-time Data:** Spawns `adb` processes to stream `logcat` and poll for system stats (CPU, processes).
-   **WebSocket Server:** Uses WebSockets (`ws`) to send this data to the frontend in real-time.
-   **Command Execution:** Listens for commands from the frontend (e.g., to send an Intent) and executes them via `adb`.

## Setup and Running

1.  **Prerequisites:** Ensure you have Node.js (v18+) and an Android emulator with ADB installed and running. The `adb` command must be available in your system's PATH.
2.  **Navigate to this directory:**
    ```bash
    cd androscope-backend
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Run the server:**
    ```bash
    node server.js
    ```
The server will start on `http://localhost:3001` and begin listening for WebSocket connections. 