import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackendDemo } from '@/components/BackendDemo';

export default function BackendScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BackendDemo />
    </SafeAreaView>
  );
}