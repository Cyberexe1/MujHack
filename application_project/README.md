# 📱 Mesh Chat - Offline Communication App

A React Native app that enables true device-to-device communication without internet using Bluetooth Low Energy and WiFi Direct.

## 🚀 Features

- **🔵 Bluetooth Low Energy Mesh** - Universal device-to-device communication
- **📶 WiFi Direct** - High-speed Android enhancement
- **🔒 End-to-End Encryption** - Secure messaging
- **📱 Cross-Platform** - Android and iOS support
- **⚡ Offline First** - No internet required

## 🛠 Build & Deploy

```bash
# Build for Android
npx eas build --platform android --profile preview

# Build for iOS
npx eas build --platform ios --profile preview
```

## 📱 Usage

1. Install on multiple devices
2. Grant Bluetooth and Location permissions
3. Tap "Start Discovery" in Mesh tab
4. Send messages in Chat tab
5. Messages sync across all connected devices

## 🔧 Tech Stack

- React Native + Expo
- Bluetooth Low Energy (react-native-ble-manager)
- WiFi Direct (react-native-wifi-p2p)
- End-to-End Encryption
- AsyncStorage for persistence

## 📡 How It Works

The app creates a mesh network using:
1. **BLE scanning** to discover nearby devices
2. **Direct connections** between devices
3. **Message routing** through the mesh
4. **Automatic failover** between protocols

Perfect for emergency communication, remote areas, or privacy-focused messaging!