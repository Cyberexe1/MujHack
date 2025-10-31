import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/mesh' });

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'dist')));

// Store connected peers
const peers = new Map();
const peerInfo = new Map();

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

        // Notify other peers about new connection
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
      } else if (message.type === 'mesh_message') {
        // Forward mesh message to other peers
        const envelope = message.envelope;
        if (envelope && peerId) {
          broadcastToOthers(peerId, {
            type: 'mesh_message',
            envelope: envelope,
            fromPeer: peerId,
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
app.post('/gateway/submit', async (req, res) => {
  try {
    const { encryptedPayload, wrappedKey, msgId } = req.body;

    if (!encryptedPayload || !wrappedKey || !msgId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create message and key envelopes
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

    // Broadcast to all connected peers
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

    // Also send key envelope separately
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

// Serve PWA gateway page
app.get('/gateway', (req, res) => {
  res.send(`
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
    // Get admin public key from server or use a placeholder
    // In real implementation, this would be fetched from the admin node
    let adminPublicKey = null;

    async function fetchAdminPublicKey() {
      try {
        // Try to get from localStorage if available (if user visited main app)
        const stored = localStorage.getItem('nine_admin_public_key');
        if (stored) {
          adminPublicKey = stored;
          return;
        }
        
        // Otherwise, prompt user to enter it or fetch from a known admin endpoint
        // For demo, we'll show an alert
        alert('Admin public key needed. Please enter it manually or connect to an admin node.');
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
        // Load libsodium if not available
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
      
      // Generate session key
      const sessionKey = sodium.randombytes_buf(32);
      
      // Encrypt message with session key
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
      const messageBytes = new TextEncoder().encode(message);
      const ciphertext = sodium.crypto_secretbox_easy(messageBytes, nonce, sessionKey);
      
      const combined = new Uint8Array(nonce.length + ciphertext.length);
      combined.set(nonce);
      combined.set(ciphertext, nonce.length);
      const encryptedPayload = sodium.to_base64(combined);
      
      // Wrap session key with admin public key
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
  `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 NINE Mesh Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/mesh`);
  console.log(`🌐 PWA Gateway: http://localhost:${PORT}/gateway`);
});

