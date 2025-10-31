# NINE - No-Infrastructure Network eXchange

**Offline-first Electron desktop application** for disaster relief and tactical mesh communication.

## Features

- ✅ **Desktop Electron app** - Fully offline, no external dependencies
- ✅ **Embedded mesh server** - WebSocket server runs inside Electron
- ✅ **Cross-device mesh networking** - Multiple Electron instances form a mesh network
- ✅ **Broadcast alerts** - Public emergency messages visible to all
- ✅ **E2E encrypted messages** - Secure admin-only decryptable messages
- ✅ **Dual-mesh architecture** - Message and key travel separately
- ✅ **Mesh visualization** - Visual graph showing message propagation paths
- ✅ **Gateway mode** - Web interface for non-installed users (hosted by Electron)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Development Mode

Run Electron app with hot-reload:

```bash
npm run electron:dev
```

This will:
- Start Vite dev server for React frontend
- Launch Electron with embedded mesh server
- Mesh server runs on `http://localhost:3000`
- WebSocket endpoint: `ws://localhost:3000/mesh`
- Gateway: `http://localhost:3000/gateway`

### 3. Build for Production

```bash
npm run electron:build
```

Creates platform-specific installers in `release/` directory:
- Windows: `.exe` installer
- macOS: `.dmg` file
- Linux: `.AppImage`

### 4. Cross-Device Testing

1. Run the Electron app on multiple machines/devices
2. Ensure all devices are on the same local network
3. The embedded mesh server will automatically connect peers
4. For mobile/web access, connect to the gateway at `http://DEVICE_IP:3000/gateway`

## Usage

### Desktop App (Electron)

1. **Launch NINE** - Start the Electron application
2. **Create Broadcast Alert**: Click "New Broadcast" to send a public emergency message
3. **Send Encrypted Message**: Click "New Encrypted Message" to send a secure message (requires admin public key)

### Admin Mode

1. Go to the **Admin** tab
2. Click **"Initialize Admin Mode"** to generate admin keys
3. Copy the **Admin Public Key** and share it with users
4. View decrypted messages in the **Encrypted** tab
5. See mesh visualizations showing message and key paths

### Gateway Mode (for web/mobile users)

1. On a device running NINE Electron app, note its IP address
2. Open `http://DEVICE_IP:3000/gateway` in any web browser
3. Enter the admin public key
4. Fill out the form and submit encrypted messages
5. Messages are encrypted client-side before sending to the mesh

## Architecture

### Dual-Mesh Design

- **Message Mesh**: Encrypted payloads travel through the network
- **Key Mesh**: Session keys (wrapped with admin's public key) travel separately
- Both converge only at the Admin node for decryption

### Components

- **MeshNetwork**: Manages peer connections and message routing
- **BroadcastService**: Handles public emergency alerts
- **E2EService**: Manages end-to-end encryption and decryption
- **MessageStore**: Persists messages in localStorage
- **CryptoUtils**: libsodium-based encryption utilities

## Development

```bash
# Development mode (Electron + hot reload)
npm run electron:dev

# Build frontend only
npm run build

# Build Electron app
npm run electron:build

# Package without installer
npm run electron:pack

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Architecture

### Electron Structure

- **Main Process** (`electron/main.js`): Runs the mesh WebSocket server and manages app lifecycle
- **Renderer Process** (React app): UI and mesh client
- **Preload Script** (`electron/preload.js`): Safe IPC bridge between main and renderer

## Security Notes

- Admin private keys are stored in localStorage (consider TPM/secure storage for production)
- Ephemeral user keys provide anonymity but reduce traceability
- All E2E messages use AES-256-GCM encryption
- Session keys are wrapped with Admin's X25519 public key

## Limitations

- Current implementation uses localStorage (not ideal for large-scale)
- Electron instances must be on same network for cross-device mesh
- No image upload/transfer yet (metadata support exists)
- Native BLE/Wi-Fi Direct helpers not implemented (Windows helpers planned)
- Server.js is legacy - server now runs in Electron main process

## Roadmap

- [ ] Real Wi-Fi Direct / BLE integration
- [ ] Image upload and chunked transfer
- [ ] Hardware relay support (ESP32/Raspberry Pi)
- [ ] TPM-backed admin key storage
- [ ] DTN bundle protocol for opportunistic routing

## License

MIT

