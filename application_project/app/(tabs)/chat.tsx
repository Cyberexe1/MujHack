import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Circle } from 'lucide-react-native';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '@/context/AppContext';
import { MessageBubble } from '@/components/MessageBubble';
import { ModeToggle } from '@/components/ModeToggle';
import { Message } from '@/types';
import { generateRandomMessage } from '@/utils/dummyData';

export default function ChatScreen() {
  const { messages, addMessage, mode, setMode, meshStatus, connectedPeers, sendMeshMessage } =
    useAppContext();
  const [messageInput, setMessageInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (messageInput.trim() === '') return;

    const messageText = messageInput.trim();
    setMessageInput('');

    try {
      // Send via mesh network
      const success = await sendMeshMessage(messageText);
      
      if (!success) {
        // Fallback to local message if mesh send fails
        const localMessage: Message = {
          id: uuidv4(),
          text: messageText,
          sender: 'You',
          timestamp: Date.now(),
          type: 'sent',
          mode,
        };
        addMessage(localMessage);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add as local message on error
      const localMessage: Message = {
        id: uuidv4(),
        text: messageText,
        sender: 'You',
        timestamp: Date.now(),
        type: 'sent',
        mode,
      };
      addMessage(localMessage);
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesh Chat</Text>
        <View style={styles.statusIndicator}>
          <Circle
            size={12}
            color={meshStatus.isConnected ? '#4CAF50' : '#9E9E9E'}
            fill={meshStatus.isConnected ? '#4CAF50' : '#9E9E9E'}
          />
          <Text style={styles.statusText}>
            {meshStatus.isConnected
              ? `${connectedPeers.length} peers`
              : 'Disconnected'}
          </Text>
        </View>
      </View>

      <ModeToggle mode={mode} onToggle={setMode} />

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble message={item} />}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageInput}
            onChangeText={setMessageInput}
            placeholder={
              mode === 'BROADCAST'
                ? 'Broadcast to all peers...'
                : 'Send secure message...'
            }
            placeholderTextColor="#A0A0A0"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              messageInput.trim() === '' && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={messageInput.trim() === ''}
          >
            <Send
              size={20}
              color={messageInput.trim() === '' ? '#A0A0A0' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2E2E',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A2E2E',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A2E2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});
