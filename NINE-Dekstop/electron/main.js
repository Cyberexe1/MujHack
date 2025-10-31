import { app, BrowserWindow, ipcMain } from 'electron';
import { createServer, get } from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;
let meshServer = null;
let wss = null;
let httpServer = null;
const MESH_PORT = 3000;

// Store connected peers
const peers = new Map();
const peerInfo = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'), // Optional icon
    title: 'NINE - No-Infrastructure Network eXchange',
  });

  // Load the app
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // Development: load from Vite dev server
    console.log('Development mode - Loading from Vite dev server: http://localhost:5173');
    
    // Wait for Vite to be ready (check if port is available)
    const checkVite = () => {
      const checkReq = get('http://localhost:5173', (res) => {
        // Vite is ready
        console.log('Vite dev server is ready');
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
      });
      
      checkReq.on('error', () => {
        // Vite not ready yet, retry
        console.log('Waiting for Vite dev server...');
        setTimeout(checkVite, 500);
      });
    };
    
    setTimeout(checkVite, 500);
  } else {
    // Production: try loading from file first, then fallback to server
    const indexPath = path.join(__dirname, '../dist/index.html');
    
    if (fs.existsSync(indexPath)) {
      console.log('Production mode - Loading from file:', indexPath);
      mainWindow.loadFile(indexPath).catch((err) => {
        console.error('Failed to load index.html from file:', err);
        console.log('Falling back to local server...');
        mainWindow.loadURL(`http://localhost:${MESH_PORT}`);
      });
    } else {
      console.log('dist/index.html not found, loading from server:', `http://localhost:${MESH_PORT}`);
      // Load from Express server
      mainWindow.loadURL(`http://localhost:${MESH_PORT}`);
    }
  }

  // Log any errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startMeshServer() {
  const expressApp = express();
  httpServer = createServer(expressApp);

  // Enable CORS
  expressApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  expressApp.use(express.json({ limit: '10mb' }));

  // WebSocket server for mesh networking
  wss = new WebSocketServer({ server: httpServer, path: '/mesh' });

  wss.on('connection', (ws, req) => {
    let peerId = null;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'register') {
          peerId = message.peerId;
          peers.set(peerId, ws);
          peerInfo.set(peerId, {
            connectedAt: Date.now(),
            port: message.port || null,
          });

          // Notify other peers
          broadcastToOthers(peerId, {
            type: 'peer_connected',
            peerId: peerId,
          });

          // Send list of existing peers
          const existingPeers = Array.from(peers.keys()).filter((id) => id !== peerId);
          ws.send(
            JSON.stringify({
              type: 'peer_list',
              peers: existingPeers,
            })
          );

          // Notify renderer
          if (mainWindow) {
            mainWindow.webContents.send('peer-update', {
              type: 'connected',
              peerId,
              total: peers.size,
            });
          }
        } else if (message.type === 'mesh_message') {
          const envelope = message.envelope;
          if (envelope && peerId) {
            broadcastToOthers(peerId, {
              type: 'mesh_message',
              envelope: envelope,
              fromPeer: peerId,
              envelopeType: message.envelopeType,
            });
          }
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    ws.on('close', () => {
      if (peerId) {
        peers.delete(peerId);
        peerInfo.delete(peerId);
        broadcastToOthers(peerId, {
          type: 'peer_disconnected',
          peerId: peerId,
        });

        // Notify renderer
        if (mainWindow) {
          mainWindow.webContents.send('peer-update', {
            type: 'disconnected',
            peerId,
            total: peers.size,
          });
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  function broadcastToOthers(excludePeerId, message) {
    peers.forEach((ws, peerId) => {
      if (peerId !== excludePeerId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  // PWA Gateway endpoint
  expressApp.post('/gateway/submit', async (req, res) => {
    try {
      const { encryptedPayload, wrappedKey, msgId } = req.body;

      if (!encryptedPayload || !wrappedKey || !msgId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const messageEnvelope = {
        msg_id: msgId,
        type: 'e2e',
        from: req.body.from || 'gateway_user',
        to: 'admin',
        timestamp: new Date().toISOString(),
        ttl: 8,
        hops: [{ nodeId: 'gateway', timestamp: new Date().toISOString() }],
        payload: encryptedPayload,
        meta: req.body.meta || {},
      };

      const keyEnvelope = {
        msg_id: msgId,
        from: req.body.from || 'gateway_user',
        to: 'admin',
        wrapped_key: wrappedKey,
        algorithm: 'x25519+aes-256-gcm',
      };

      // Broadcast message
      const meshMessage = {
        type: 'mesh_message',
        envelope: messageEnvelope,
        fromPeer: 'gateway',
      };

      peers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(meshMessage));
        }
      });

      // Broadcast key separately
      setTimeout(() => {
        const keyMessage = {
          type: 'mesh_message',
          envelope: keyEnvelope,
          envelopeType: 'key',
          fromPeer: 'gateway',
        };

        peers.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(keyMessage));
          }
        });
      }, 100);

      res.json({ success: true, msgId });
    } catch (error) {
      console.error('Gateway error:', error);
      res.status(500).json({ error: 'Failed to submit message' });
    }
  });

  // Serve PWA gateway HTML (same as before, but inline for Electron)
  expressApp.get('/gateway', (req, res) => {
    res.send(getGatewayHTML());
  });

  // Serve static files - always serve dist if it exists
  const distPath = path.join(__dirname, '../dist');
  expressApp.use(express.static(distPath));
  
  // Also serve root for any fallback routes
  expressApp.get('*', (req, res) => {
    // In production, try to serve from dist
    if (!app.isPackaged || process.env.NODE_ENV !== 'development') {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).send('Not found');
    }
  });

  httpServer.listen(MESH_PORT, () => {
    console.log(`🚀 NINE Mesh Server running on http://localhost:${MESH_PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${MESH_PORT}/mesh`);
    console.log(`🌐 PWA Gateway: http://localhost:${MESH_PORT}/gateway`);
  });
}

function getGatewayHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NINE Gateway - Submit Alert</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 8px;
      font-size: 24px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 6px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }
    input, textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    textarea {
      min-height: 100px;
      resize: vertical;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .status {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
    }
    .status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .status.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .info {
      background: #e7f3ff;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      color: #004085;
      margin-bottom: 20px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚨 NINE Emergency Alert</h1>
    <p class="subtitle">Submit secure message to admin</p>
    
    <div class="info">
      Your message is encrypted client-side before sending. Only the admin can decrypt it.
    </div>

    <form id="alertForm">
      <div class="form-group">
        <label for="name">Your Name (optional)</label>
        <input type="text" id="name" name="name" placeholder="Jane Doe">
      </div>
      
      <div class="form-group">
        <label for="location">Location (optional)</label>
        <input type="text" id="location" name="location" placeholder="Building A, Floor 3">
      </div>
      
      <div class="form-group">
        <label for="contact">Contact Info (optional)</label>
        <input type="text" id="contact" name="contact" placeholder="Phone or email">
      </div>
      
      <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" name="message" required placeholder="Enter your emergency message here..."></textarea>
      </div>
      
      <button type="submit" id="submitBtn">Submit Encrypted Message</button>
    </form>
    
    <div id="status"></div>
  </div>

  <script type="module">
    let adminPublicKey = null;

    async function fetchAdminPublicKey() {
      try {
        const stored = localStorage.getItem('nine_admin_public_key');
        if (stored) {
          adminPublicKey = stored;
          return;
        }
        
        adminPublicKey = prompt('Enter Admin Public Key (base64):');
        if (!adminPublicKey) {
          throw new Error('Admin public key required');
        }
        localStorage.setItem('nine_admin_public_key', adminPublicKey);
      } catch (error) {
        console.error('Failed to get admin public key:', error);
      }
    }

    async function initCrypto() {
      if (typeof window.sodium === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/libsodium-wrappers@0.7.15/dist/browsers/sodium.min.js';
        await new Promise((resolve, reject) => {
          script.onload = () => {
            sodium.ready.then(resolve).catch(reject);
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
    }

    async function encryptMessage(message, adminPublicKey) {
      await sodium.ready;
      const sessionKey = sodium.randombytes_buf(32);
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
      const messageBytes = new TextEncoder().encode(message);
      const ciphertext = sodium.crypto_secretbox_easy(messageBytes, nonce, sessionKey);
      
      const combined = new Uint8Array(nonce.length + ciphertext.length);
      combined.set(nonce);
      combined.set(ciphertext, nonce.length);
      const encryptedPayload = sodium.to_base64(combined);
      
      const ephemeralKeypair = sodium.crypto_box_keypair();
      const adminPubKeyBytes = sodium.from_base64(adminPublicKey);
      const wrapNonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
      const wrapped = sodium.crypto_box_easy(
        sessionKey,
        wrapNonce,
        adminPubKeyBytes,
        ephemeralKeypair.privateKey
      );
      
      const wrappedCombined = new Uint8Array(
        ephemeralKeypair.publicKey.length + wrapNonce.length + wrapped.length
      );
      wrappedCombined.set(ephemeralKeypair.publicKey);
      wrappedCombined.set(wrapNonce, ephemeralKeypair.publicKey.length);
      wrappedCombined.set(wrapped, ephemeralKeypair.publicKey.length + wrapNonce.length);
      const wrappedKey = sodium.to_base64(wrappedCombined);
      
      return { encryptedPayload, wrappedKey };
    }

    const form = document.getElementById('alertForm');
    const statusDiv = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      statusDiv.innerHTML = '';
      statusDiv.className = 'status';
      
      try {
        await initCrypto();
        await fetchAdminPublicKey();
        
        if (!adminPublicKey) {
          throw new Error('Admin public key not available');
        }
        
        const formData = new FormData(form);
        const message = formData.get('message');
        if (!message) {
          throw new Error('Message is required');
        }
        
        const { encryptedPayload, wrappedKey } = await encryptMessage(message, adminPublicKey);
        const msgId = crypto.randomUUID();
        
        const response = await fetch('/gateway/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            encryptedPayload,
            wrappedKey,
            msgId,
            from: 'gateway_user',
            meta: {
              name: formData.get('name') || undefined,
              location: formData.get('location') || undefined,
              contact: formData.get('contact') || undefined,
            },
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to submit message');
        }
        
        statusDiv.className = 'status success';
        statusDiv.textContent = '✓ Message encrypted and submitted successfully!';
        form.reset();
      } catch (error) {
        statusDiv.className = 'status error';
        statusDiv.textContent = '✗ Error: ' + error.message;
      } finally {
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>
  `;
}

// IPC handlers
ipcMain.handle('get-server-url', () => {
  return `ws://localhost:${MESH_PORT}/mesh`;
});

ipcMain.handle('get-gateway-url', () => {
  return `http://localhost:${MESH_PORT}/gateway`;
});

// App lifecycle
app.whenReady().then(() => {
  console.log('Electron app ready');
  startMeshServer();
  
  // Wait for server to be ready before creating window
  setTimeout(() => {
    createWindow();
  }, 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (wss) {
    wss.close();
  }
  if (httpServer) {
    httpServer.close();
  }
});

