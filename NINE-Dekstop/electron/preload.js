import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  getGatewayUrl: () => ipcRenderer.invoke('get-gateway-url'),
  onPeerUpdate: (callback) => {
    ipcRenderer.on('peer-update', (event, data) => callback(data));
  },
});

