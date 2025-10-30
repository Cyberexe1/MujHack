import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MeshDemo } from '@/components/MeshDemo';

export default function MeshScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MeshDemo />
    </SafeAreaView>
  );
}