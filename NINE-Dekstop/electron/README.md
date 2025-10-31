# Electron Main Process

This directory contains the Electron main process files.

## Files

- `main.js` - Main Electron process that:
  - Manages app lifecycle
  - Runs the embedded WebSocket mesh server
  - Handles IPC communication with renderer
  - Serves the gateway web interface

- `preload.js` - Preload script that safely exposes Electron APIs to the renderer process

## Server

The mesh WebSocket server runs inside the Electron main process on port 3000. This allows the app to work completely offline - no external server needed!

The server handles:
- Peer discovery and registration
- Message routing across the mesh
- Gateway endpoint for web/mobile users

