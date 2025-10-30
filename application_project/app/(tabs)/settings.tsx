import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Copy, Eye, EyeOff, Trash2, Key } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useAppContext } from '@/context/AppContext';

export default function SettingsScreen() {
  const { deviceInfo, clearMessages } = useAppContext();
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Chat Logs',
      'Are you sure you want to delete all messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearMessages();
            Alert.alert('Success', 'All messages have been cleared');
          },
        },
      ]
    );
  };

  const truncateKey = (key: string, length: number = 16) => {
    if (key.length <= length) return key;
    return `${key.substring(0, length)}...`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Device & Security Configuration</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Key size={20} color="#1A2E2E" />
              <Text style={styles.cardLabel}>Device ID</Text>
            </View>
            <Text style={styles.cardValue}>{truncateKey(deviceInfo.id, 24)}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(deviceInfo.id, 'Device ID')}
            >
              <Copy size={16} color="#1A2E2E" />
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cryptographic Keys</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Key size={20} color="#4CAF50" />
              <Text style={styles.cardLabel}>Public Key</Text>
            </View>
            <Text style={styles.cardValue}>{truncateKey(deviceInfo.publicKey)}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(deviceInfo.publicKey, 'Public Key')}
            >
              <Copy size={16} color="#1A2E2E" />
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Key size={20} color="#F44336" />
              <Text style={styles.cardLabel}>Private Key</Text>
            </View>
            <View style={styles.privateKeyContainer}>
              <Text style={styles.cardValue}>
                {showPrivateKey
                  ? truncateKey(deviceInfo.privateKey)
                  : '••••••••••••••••'}
              </Text>
              <TouchableOpacity onPress={() => setShowPrivateKey(!showPrivateKey)}>
                {showPrivateKey ? (
                  <EyeOff size={20} color="#A0A0A0" />
                ) : (
                  <Eye size={20} color="#A0A0A0" />
                )}
              </TouchableOpacity>
            </View>
            {showPrivateKey && (
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(deviceInfo.privateKey, 'Private Key')}
              >
                <Copy size={16} color="#1A2E2E" />
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Keep your private key secure. Never share it with anyone.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity style={styles.dangerButton} onPress={handleClearLogs}>
            <Trash2 size={20} color="#F44336" />
            <Text style={styles.dangerButtonText}>Clear Chat Logs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Offline Mesh Chat v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Decentralized • Secure • Private
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2E2E',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2E2E',
  },
  cardValue: {
    fontSize: 13,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 12,
  },
  privateKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2E2E',
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#A0A0A0',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#CCCCCC',
  },
});
