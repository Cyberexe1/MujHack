import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Smartphone, Users, MessageCircle, Wifi } from 'lucide-react-native';
import { NetworkMesh } from '@/services/NetworkMesh';
import { useAppContext } from '@/context/AppContext';

export const RealMeshTest = () => {
  const { deviceInfo } = useAppContext();
  const [networkMesh] = useState(() => NetworkMesh.getInstance());
  const [stats, setStats] = useState<any>(null);
  const [realPeers, setRealPeers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    initializeSharedMesh();

    const interval = setInterval(() => {
      const currentStats = networkMesh.getStats();
      setStats(currentStats);
      setIsConnected(currentStats.isActive);
    }, 2000);

    return () => {
      clearInterval(interval);
      networkMesh.leaveMesh();
    };
  }, []);

  const initializeSharedMesh = async () => {
    try {
      await networkMesh.initialize(deviceInfo.id, `Device-${deviceInfo.id.slice(-4)}`);

      // Set up callbacks for real peer updates
      networkMesh.setPeerCallback((peers) => {
        setRealPeers(peers);
        console.log('Network peers updated:', peers.length);
      });

      networkMesh.setMessageCallback((message) => {
        Alert.alert(
          'Network Message Received!',
          `From: ${message.from}\nMessage: ${message.payload}`,
          [{ text: 'OK' }]
        );
      });

    } catch (error) {
      console.error('Failed to initialize shared mesh:', error);
    }
  };

  const handleJoinMesh = async () => {
    try {
      await networkMesh.joinMesh();
      Alert.alert('Success', 'Joined real mesh network!');
    } catch (error) {
      console.error('Failed to join mesh:', error);
      Alert.alert('Error', 'Failed to join mesh network');
    }
  };

  const handleSendTestMessage = async () => {
    try {
      const message = {
        id: `test-${Date.now()}`,
        from: deviceInfo.id,
        to: 'all',
        mode: 'BROADCAST' as const,
        timestamp: Date.now(),
        payload: `Hello from ${deviceInfo.id.slice(-4)}!`,
        ack: false,
      };

      const success = await networkMesh.sendMessage(message);

      if (success) {
        Alert.alert('Success', 'Message sent to all real devices!');
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleClearData = async () => {
    try {
      await networkMesh.clearSharedData();
      Alert.alert('Success', 'Shared mesh data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Wifi size={24} color="#1A2E2E" />
        <Text style={styles.title}>Real Device Communication</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.statusSection}>
        <View style={styles.statusItem}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isConnected ? '#4CAF50' : '#9E9E9E' }
          ]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected to Real Mesh' : 'Not Connected'}
          </Text>
        </View>
      </View>

      {/* Real Peers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={20} color="#1A2E2E" />
          <Text style={styles.sectionTitle}>Real Devices ({realPeers.length})</Text>
        </View>

        {realPeers.length === 0 ? (
          <Text style={styles.emptyText}>
            No other devices found. Install app on another device to test!
          </Text>
        ) : (
          realPeers.map((peer) => (
            <View key={peer.id} style={styles.peerItem}>
              <Smartphone size={16} color="#4CAF50" />
              <Text style={styles.peerName}>{peer.name}</Text>
              <Text style={styles.peerStatus}>Online</Text>
            </View>
          ))
        )}
      </View>

      {/* Statistics */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Real Mesh Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.deviceCount}</Text>
              <Text style={styles.statLabel}>Total Devices</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.messageCount}</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
          </View>

          {/* Debug Info */}
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText}>Device: {stats.deviceName}</Text>
            <Text style={styles.debugText}>Active: {stats.isActive ? 'Yes' : 'No'}</Text>
            {stats.otherDevices && stats.otherDevices.length > 0 && (
              <Text style={styles.debugText}>
                Other Devices: {stats.otherDevices.join(', ')}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleJoinMesh}
        >
          <Text style={styles.actionButtonText}>Join Real Mesh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleSendTestMessage}
          disabled={!isConnected}
        >
          <MessageCircle size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Send Real Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleClearData}
        >
          <Text style={styles.dangerButtonText}>Clear Shared Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This tests REAL device-to-device communication via shared storage.
          Install the app on multiple devices to see it work!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2E2E',
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A2E2E',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2E2E',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#A0A0A0',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  peerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  peerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2E2E',
    flex: 1,
  },
  peerStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
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
  dangerButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  footer: {
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
  },
  debugSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 2,
  },
});