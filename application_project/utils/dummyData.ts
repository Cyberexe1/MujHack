export const dummyPeers = [
  { id: 'peer-1', name: 'Device Alpha', status: 'connected', lastSeen: Date.now(), distance: 25 },
  { id: 'peer-2', name: 'Device Beta', status: 'connected', lastSeen: Date.now(), distance: 45 },
  { id: 'peer-3', name: 'Device Gamma', status: 'nearby', lastSeen: Date.now() - 60000, distance: 75 },
  { id: 'peer-4', name: 'Device Delta', status: 'nearby', lastSeen: Date.now() - 120000, distance: 90 },
];

import { Message } from '@/types';

export const dummyMessages: Message[] = [
  {
    id: '1',
    text: 'Hello everyone!',
    sender: 'Device Alpha',
    timestamp: Date.now() - 300000,
    type: 'received',
    mode: 'BROADCAST',
  },
  {
    id: '2',
    text: 'Hi there!',
    sender: 'You',
    timestamp: Date.now() - 240000,
    type: 'sent',
    mode: 'BROADCAST',
  },
];

export const generateRandomMessage = (): string => {
  const messages = [
    'Anyone nearby?',
    'Connection looks stable',
    'Testing the mesh network',
    'Can you see this message?',
    'Signal strength is good',
    'All systems operational',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};
