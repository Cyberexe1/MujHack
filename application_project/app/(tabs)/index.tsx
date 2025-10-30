import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bluetooth, Wifi, RefreshCw } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { PeerItem } from '@/components/PeerItem';
import { dummyPeers } from '@/utils/dummyData';

export default function HomeScreen() {
  const { meshStatus, connectToMesh, connectedPeers } = useAppContext();
  const [isConnecting, setIsConnecting] = useState(false);
  const [discoveredPeers, setDiscoveredPeers] = useState(dummyPeers);

  const handleConnect = async () => {
    setIsConnecting(true);
    await connectToMesh();
    setIsConnecting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offline Mesh Chat</Text>
        <Text style={styles.subtitle}>Decentralized Communication</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Mesh Network Status</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Bluetooth size={24} color={meshStatus.bluetooth ? '#4CAF50' : '#E0E0E0'} />
            <Text style={styles.statusLabel}>Bluetooth</Text>
            <Text
              style={[
                styles.statusValue,
                meshStatus.bluetooth ? styles.statusActive : styles.statusInactive,
              ]}
            >
              {meshStatus.bluetooth ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Wifi size={24} color={meshStatus.wifiDirect ? '#4CAF50' : '#E0E0E0'} />
            <Text style={styles.statusLabel}>Wi-Fi Direct</Text>
            <Text
              style={[
                styles.statusValue,
                meshStatus.wifiDirect ? styles.statusActive : styles.statusInactive,
              ]}
            >
              {meshStatus.wifiDirect ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Discovered Peers</Text>
          <TouchableOpacity onPress={handleConnect}>
            <RefreshCw size={20} color="#1A2E2E" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.peersList} showsVerticalScrollIndicator={false}>
          {discoveredPeers.map((peer) => (
            <PeerItem key={peer.id} peer={peer} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.connectButton,
            meshStatus.isConnected && styles.connectedButton,
          ]}
          onPress={handleConnect}
          disabled={isConnecting || meshStatus.isConnected}
        >
          {isConnecting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {meshStatus.isConnected ? 'Connected to Mesh' : 'Connect to Mesh'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2E2E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2E2E',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusActive: {
    color: '#4CAF50',
  },
  statusInactive: {
    color: '#9E9E9E',
  },
  section: {
    flex: 1,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2E2E',
  },
  peersList: {
    flex: 1,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  connectButton: {
    backgroundColor: '#1A2E2E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectedButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
