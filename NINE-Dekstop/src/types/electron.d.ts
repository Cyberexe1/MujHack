export interface ElectronAPI {
  getServerUrl: () => Promise<string>;
  getGatewayUrl: () => Promise<string>;
  onPeerUpdate: (callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

