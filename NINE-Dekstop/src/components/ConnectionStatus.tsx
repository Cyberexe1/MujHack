import { MeshNetwork } from '../services/meshNetwork';
import { Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);

  useEffect(() => {
    const meshNetwork = MeshNetwork.getInstance();
    let interval: NodeJS.Timeout | null = null;
    
    const initAndUpdate = async () => {
      await meshNetwork.initialize();
      const updateStatus = () => {
        setConnected(meshNetwork.isConnected());
        setPeerCount(meshNetwork.getPeers().length);
      };

      meshNetwork.onPeerDiscovered(() => updateStatus());
      meshNetwork.onPeerLost(() => updateStatus());

      interval = setInterval(updateStatus, 1000);
      updateStatus();
    };

    initAndUpdate();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
      {connected ? (
        <>
          <Wifi className="w-4 h-4 text-green-600" />
          <span className="text-gray-700">
            Connected {peerCount > 0 && `(${peerCount} peer${peerCount !== 1 ? 's' : ''})`}
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-600" />
          <span className="text-gray-700">Connecting...</span>
        </>
      )}
    </div>
  );
}

