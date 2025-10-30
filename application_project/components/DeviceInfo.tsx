import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Smartphone, Wifi, Bluetooth } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import * as Device from 'expo-device';

export const DeviceInfo = () => {
  const { deviceInfo, meshStatus } = useAppContext();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Smartphone size={20} color="#1A2E2E" />
        <Text style={styles.title}>Device Information</Text>
      </View>
      
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.label}>Device Name</Text>
          <Text style={styles.value}>{Device.deviceName || 'Unknown Device'}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.label}>Platform</Text>
          <Text style={styles.value}>{Device.osName} {Device.osVersion}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.label}>Device ID</Text>
          <Text style={styles.value}>{deviceInfo.id.slice(0, 8)}...</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.label}>Model</Text>
          <Text style={styles.value}>{Device.modelName || 'Unknown'}</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <Bluetooth 
            size={16} 
            color={meshStatus.bluetooth ? '#4CAF50' : '#9E9E9E'} 
          />
          <Text style={[
            styles.statusText,
            { color: meshStatus.bluetooth ? '#4CAF50' : '#9E9E9E' }
          ]}>
            Bluetooth
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Wifi 
            size={16} 
            color={meshStatus.wifiDirect ? '#4CAF50' : '#9E9E9E'} 
          />
          <Text style={[
            styles.statusText,
            { color: meshStatus.wifiDirect ? '#4CAF50' : '#9E9E9E' }
          ]}>
            Wi-Fi Direct
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2E2E',
  },
  infoGrid: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#666666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2E2E',
    flex: 1,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});