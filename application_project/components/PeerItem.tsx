import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Peer } from '@/types';

interface PeerItemProps {
  peer: Peer;
}

export const PeerItem = ({ peer }: PeerItemProps) => {
  const getStatusColor = () => {
    switch (peer.status) {
      case 'connected':
        return '#4CAF50';
      case 'nearby':
        return '#FFC107';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      <View style={styles.textContainer}>
        <Text style={styles.name}>{peer.name}</Text>
        <Text style={styles.status}>{peer.status}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2E2E',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    color: '#A0A0A0',
    textTransform: 'capitalize',
  },
});
