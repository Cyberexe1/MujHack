import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View
      style={[
        styles.container,
        message.type === 'sent' ? styles.senderContainer : styles.receiverContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          message.type === 'sent' ? styles.senderBubble : styles.receiverBubble,
        ]}
      >
        {message.type === 'received' && (
          <Text style={styles.senderName}>{message.sender}</Text>
        )}
        <View style={styles.textRow}>
          {message.mode === 'SECURE' && (
            <Lock size={14} color={message.type === 'sent' ? '#FFFFFF' : '#1A2E2E'} />
          )}
          <Text
            style={[
              styles.messageText,
              message.type === 'sent' ? styles.senderText : styles.receiverText,
            ]}
          >
            {message.text}
          </Text>
        </View>
        <Text
          style={[
            styles.timestamp,
            message.type === 'sent' ? styles.senderTimestamp : styles.receiverTimestamp,
          ]}
        >
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  senderContainer: {
    alignItems: 'flex-end',
  },
  receiverContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  senderBubble: {
    backgroundColor: '#1A2E2E',
    borderBottomRightRadius: 4,
  },
  receiverBubble: {
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2E2E',
    marginBottom: 4,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  senderText: {
    color: '#FFFFFF',
  },
  receiverText: {
    color: '#1A2E2E',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  senderTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receiverTimestamp: {
    color: '#A0A0A0',
  },
});
