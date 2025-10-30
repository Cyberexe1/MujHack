import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lock, Radio } from 'lucide-react-native';
import { ChatMode } from '@/types';

interface ModeToggleProps {
  mode: ChatMode;
  onToggle: (mode: ChatMode) => void;
}

export const ModeToggle = ({ mode, onToggle }: ModeToggleProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, mode === 'BROADCAST' && styles.activeButton]}
        onPress={() => onToggle('BROADCAST')}
      >
        <Radio size={18} color={mode === 'BROADCAST' ? '#FFFFFF' : '#1A2E2E'} />
        <Text
          style={[styles.buttonText, mode === 'BROADCAST' && styles.activeButtonText]}
        >
          Broadcast
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, mode === 'SECURE' && styles.activeButton]}
        onPress={() => onToggle('SECURE')}
      >
        <Lock size={18} color={mode === 'SECURE' ? '#FFFFFF' : '#1A2E2E'} />
        <Text style={[styles.buttonText, mode === 'SECURE' && styles.activeButtonText]}>
          Secure
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeButton: {
    backgroundColor: '#1A2E2E',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2E2E',
  },
  activeButtonText: {
    color: '#FFFFFF',
  },
});
