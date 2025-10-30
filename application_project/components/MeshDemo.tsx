import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Wifi, Bluetooth, Users, MessageCircle } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { DeviceInfo } from './DeviceInfo';
import { RealMeshTest } from './RealMeshTest';

export const MeshDemo = () => {
  const { meshStatus, connectedPeers, meshManager } = useAppContext();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (meshManager) {
        try {
          const stats = await meshManager.getStats();
          setStats(stats);
        } catch (error) {
          console.error('Failed to get mesh stats:', error);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [meshManager]);

  const handleStartDiscovery = async () => {
    if (meshManager) {
      try {
        await meshManager.startDiscovery();
      } catch (error) {
        console.error('Discovery failed:', error);
      }
    }
  };

  const handleConnectToMesh = async () => {
    if (meshManager) {
      try {
        await meshManager.connectToMesh();
      } catch (error) {
        console.error('Connection failed:', error);
      }
    }
  };

  const handleSendTestMessage = async () => {
    if (meshManager) {
      try {
        await meshManager.sendMessage('BROADCAST', 'Test message from mesh demo!');
      } catch (error) {
        console.error('Send failed:', error);
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mesh Network Demo</Text>
      
      {/* Device Info */}
      <DeviceInfo />
      
      {/* Real Device Communication Test */}
      <RealMeshTest />
      
      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Bluetooth 
              size={24} 
              color={meshStatus.bluetooth ? '#4CAF50' : '#9E9E9E'} 
            />
            <Text style={styles.statusLabel}>Bluetooth</Text>
            <Text style={[
              styles.statusValue,
              { color: meshStatus.bluetooth ? '#4CAF50' : '#9E9E9E' }
            ]}>
              {meshStatus.bluetooth ? 'Ready' : 'Offline'}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Wifi 
              size={24} 
              color={meshStatus.wifiDirect ? '#4CAF50' : '#9E9E9E'} 
            />
            <Text style={styles.statusLabel}>Wi-Fi Direct</Text>
            <Text style={[
              styles.statusValue,
              { color: meshStatus.wifiDirect ? '#4CAF50' : '#9E9E9E' }
            ]}>
              {meshStatus.wifiDirect ? 'Ready' : 'Offline'}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Users 
              size={24} 
              color={meshStatus.isConnected ? '#4CAF50' : '#9E9E9E'} 
            />
            <Text style={styles.statusLabel}>Mesh Network</Text>
            <Text style={[
              styles.statusValue,
              { color: meshStatus.isConnected ? '#4CAF50' : '#9E9E9E' }
            ]}>
              {meshStatus.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>
      </View>

      {/* Peers Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Peers ({connectedPeers.length})</Text>
        {connectedPeers.length === 0 ? (
          <Text style={styles.emptyText}>No peers connected</Text>
        ) : (
          connectedPeers.map((peer) => (
            <View key={peer.id} style={styles.peerItem}>
              <View style={styles.peerInfo}>
                <Text style={styles.peerName}>{peer.name}</Text>
                <Text style={styles.peerStatus}>{peer.status}</Text>
              </View>
              <Text style={styles.peerDistance}>{peer.distance}m</Text>
            </View>
          ))
        )}
      </View>

      {/* Stats Section */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mesh Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalPeers}</Text>
              <Text style={styles.statLabel}>Total Peers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.connectedPeers}</Text>
              <Text style={styles.statLabel}>Connected</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.cache?.size || 0}</Text>
              <Text style={styles.statLabel}>Cached Messages</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pendingAcks}</Text>
              <Text style={styles.statLabel}>Pending ACKs</Text>
            </View>
          </View>
        </View>
      )}

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mesh Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleStartDiscovery}
        >
          <Text style={styles.actionButtonText}>Start Discovery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleConnectToMesh}
        >
          <Text style={styles.actionButtonText}>Connect to Mesh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]} 
          onPress={handleSendTestMessage}
        >
          <MessageCircle size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Send Test Message</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔵 BLE + 📶 WiFi Direct Hybrid Mesh System Active
          True device-to-device communication without infrastructure!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2E2E',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2E2E',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#A0A0A0',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  peerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  peerInfo: {
    flex: 1,
  },
  peerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2E2E',
  },
  peerStatus: {
    fontSize: 12,
    color: '#4CAF50',
    textTransform: 'capitalize',
  },
  peerDistance: {
    fontSize: 14,
    color: '#666666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2E2E',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2E2E',
  },
  primaryButton: {
    backgroundColor: '#1A2E2E',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  footerText: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});