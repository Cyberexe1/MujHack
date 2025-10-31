import { useState, useEffect } from 'react';
import { MeshNetwork } from './services/meshNetwork';
import { BroadcastService } from './services/broadcastService';
import { E2EService } from './services/e2eService';
import { AdminKeyStore } from './services/adminKeyStore';
import { AdminKeyGenerator } from './utils/adminKeyGenerator';
import { BroadcastForm } from './components/BroadcastForm';
import { E2EForm } from './components/E2EForm';
import { MessageCard } from './components/MessageCard';
import { MeshGraph } from './components/MeshGraph';
import { ConnectionStatus } from './components/ConnectionStatus';
import {
  MessageSquare,
  Lock,
  Settings,
  Plus,
  Shield,
  Eye,
  Download,
} from 'lucide-react';
import { MessageEnvelope, DecryptedMessage } from './types/message';

type Tab = 'broadcasts' | 'e2e' | 'admin';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('broadcasts');
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [showE2EForm, setShowE2EForm] = useState(false);
  const [broadcasts, setBroadcasts] = useState<MessageEnvelope[]>([]);
  const [e2eMessages, setE2eMessages] = useState<MessageEnvelope[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageEnvelope | null>(null);
  const [selectedDecrypted, setSelectedDecrypted] = useState<DecryptedMessage | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPublicKey, setAdminPublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Initialize mesh network
    const initializeMesh = async () => {
      const meshNetwork = MeshNetwork.getInstance();
      await meshNetwork.initialize();

    // Check admin status
    setIsAdmin(AdminKeyStore.isAdminMode());
    setAdminPublicKey(AdminKeyStore.getAdminPublicKey());

    // Set up message listeners
    const broadcastService = new BroadcastService();
    const e2eService = new E2EService();

    const refreshBroadcasts = () => {
      setBroadcasts(broadcastService.getAllBroadcastsSorted());
    };

    const refreshE2E = () => {
      setE2eMessages(e2eService.getE2EMessageEnvelopes());
      if (AdminKeyStore.isAdminMode()) {
        setDecryptedMessages(e2eService.getDecryptedMessages());
      }
    };

    meshNetwork.onMessage((message) => {
      if (message.type === 'broadcast') {
        refreshBroadcasts();
      } else if (message.type === 'e2e') {
        refreshE2E();
      }
    });

    meshNetwork.onKeyEnvelope(() => {
      refreshE2E();
    });

    // Initial load
    refreshBroadcasts();
    refreshE2E();

      // Poll for updates
      const interval = setInterval(() => {
        refreshBroadcasts();
        refreshE2E();
      }, 2000);

      return () => clearInterval(interval);
    };

    initializeMesh();
  }, []);

  const handleInitAdmin = async () => {
    try {
      await AdminKeyGenerator.initializeAdminMode();
      setIsAdmin(true);
      setAdminPublicKey(AdminKeyStore.getAdminPublicKey());
    } catch (error) {
      alert('Failed to initialize admin mode: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleExportData = () => {
    import('./services/messageStore').then(({ MessageStore }) => {
      const data = MessageStore.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nine-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleViewDecrypted = (msg: MessageEnvelope) => {
    const e2eService = new E2EService();
    const decrypted = e2eService.getDecryptedMessageById(msg.msg_id);
    if (decrypted) {
      setSelectedDecrypted(decrypted);
    } else {
      setSelectedMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                N
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NINE</h1>
                <p className="text-xs text-gray-500">No-Infrastructure Network eXchange</p>
              </div>
            </div>
            <ConnectionStatus />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('broadcasts')}
              className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'broadcasts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Broadcasts ({broadcasts.length})
            </button>
            <button
              onClick={() => setActiveTab('e2e')}
              className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'e2e'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Lock className="w-4 h-4 inline mr-2" />
              Encrypted ({e2eMessages.length})
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'admin'
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Broadcasts Tab */}
        {activeTab === 'broadcasts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Emergency Broadcasts</h2>
              <button
                onClick={() => setShowBroadcastForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Broadcast
              </button>
            </div>

            {broadcasts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No broadcasts yet</p>
                <button
                  onClick={() => setShowBroadcastForm(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first broadcast
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {broadcasts.map((msg) => (
                  <MessageCard
                    key={msg.msg_id}
                    message={msg}
                    onViewDetails={() => setSelectedMessage(msg)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* E2E Tab */}
        {activeTab === 'e2e' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Encrypted Messages</h2>
              <button
                onClick={() => setShowE2EForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Encrypted Message
              </button>
            </div>

            {isAdmin && decryptedMessages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Decrypted Messages</h3>
                <div className="space-y-4">
                  {decryptedMessages.map((msg) => (
                    <div
                      key={msg.msg_id}
                      className="bg-white rounded-lg border border-purple-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                          DECRYPTED
                        </span>
                        <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-900 font-medium mb-2">{msg.content}</p>
                      {msg.meta && (
                        <div className="text-sm text-gray-600 space-y-1">
                          {msg.meta.name && <div>From: {msg.meta.name}</div>}
                          {msg.meta.location && <div>Location: {msg.meta.location}</div>}
                        </div>
                      )}
                      <div className="mt-3">
                        <MeshGraph messagePath={msg.messagePath} keyPath={msg.keyPath} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {e2eMessages.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No encrypted messages yet</p>
                <button
                  onClick={() => setShowE2EForm(true)}
                  className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                >
                  Send your first encrypted message
                </button>
              </div>
            ) : (
              <div>
                {!isAdmin && (
                  <div className="mb-4 bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg text-sm">
                    These messages are encrypted. Only admins can decrypt them.
                  </div>
                )}
                <div className="space-y-4">
                  {e2eMessages.map((msg) => (
                    <MessageCard
                      key={msg.msg_id}
                      message={msg}
                      onViewDetails={() => handleViewDecrypted(msg)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>

            {!isAdmin ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Shield className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Mode Not Active</h3>
                <p className="text-gray-600 mb-6">
                  Initialize admin mode to decrypt encrypted messages and view mesh visualizations.
                </p>
                <button
                  onClick={handleInitAdmin}
                  className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  Initialize Admin Mode
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Admin Mode Active</span>
                  </div>
                  <p className="text-sm text-green-700">
                    You can now decrypt encrypted messages and view mesh graphs.
                  </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Admin Public Key
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Share this public key with users who want to send encrypted messages:
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs break-all">
                    {adminPublicKey}
                  </div>
                  <button
                    onClick={() => {
                      if (adminPublicKey) {
                        navigator.clipboard.writeText(adminPublicKey);
                        alert('Public key copied to clipboard!');
                      }
                    }}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Copy to Clipboard
                  </button>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Data
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Export all messages and mesh data for audit or backup.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Export JSON
                  </button>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{broadcasts.length}</div>
                      <div className="text-sm text-gray-600">Broadcasts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{e2eMessages.length}</div>
                      <div className="text-sm text-gray-600">Encrypted Messages</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{decryptedMessages.length}</div>
                      <div className="text-sm text-gray-600">Decrypted</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {MeshNetwork.getInstance().getPeers().length}
                      </div>
                      <div className="text-sm text-gray-600">Connected Peers</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Message Details</h2>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {selectedMessage.type === 'broadcast' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-900 font-medium">{selectedMessage.payload}</p>
                  </div>
                  {selectedMessage.meta && (
                    <div className="space-y-2 text-sm">
                      {selectedMessage.meta.name && <div><strong>Name:</strong> {selectedMessage.meta.name}</div>}
                      {selectedMessage.meta.location && <div><strong>Location:</strong> {selectedMessage.meta.location}</div>}
                      {selectedMessage.meta.contact && <div><strong>Contact:</strong> {selectedMessage.meta.contact}</div>}
                    </div>
                  )}
                  <div className="mt-4">
                    <MeshGraph messagePath={selectedMessage.hops} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-gray-100 p-4 rounded-lg font-mono text-xs mb-4 break-all">
                    {selectedMessage.payload}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    This message is encrypted. Only admins can decrypt it.
                  </p>
                  <div className="mt-4">
                    <MeshGraph messagePath={selectedMessage.hops} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decrypted Message Modal */}
      {selectedDecrypted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Decrypted Message</h2>
              <button
                onClick={() => setSelectedDecrypted(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-gray-900 font-medium">{selectedDecrypted.content}</p>
              </div>
              {selectedDecrypted.meta && (
                <div className="space-y-2 text-sm">
                  {selectedDecrypted.meta.name && <div><strong>Name:</strong> {selectedDecrypted.meta.name}</div>}
                  {selectedDecrypted.meta.location && <div><strong>Location:</strong> {selectedDecrypted.meta.location}</div>}
                  {selectedDecrypted.meta.contact && <div><strong>Contact:</strong> {selectedDecrypted.meta.contact}</div>}
                </div>
              )}
              <div className="mt-4">
                <MeshGraph messagePath={selectedDecrypted.messagePath} keyPath={selectedDecrypted.keyPath} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forms */}
      {showBroadcastForm && (
        <BroadcastForm
          onClose={() => setShowBroadcastForm(false)}
          onSuccess={() => {
            const service = new BroadcastService();
            setBroadcasts(service.getAllBroadcastsSorted());
          }}
        />
      )}

      {showE2EForm && (
        <E2EForm
          onClose={() => setShowE2EForm(false)}
          onSuccess={() => {
            const service = new E2EService();
            setE2eMessages(service.getE2EMessageEnvelopes());
            if (AdminKeyStore.isAdminMode()) {
              setDecryptedMessages(service.getDecryptedMessages());
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
