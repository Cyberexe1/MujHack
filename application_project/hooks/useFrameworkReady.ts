import { useEffect } from 'react';

export function useFrameworkReady() {
  useEffect(() => {
    // Framework ready hook for React Native
    // No window object in React Native, so this is a no-op
  }, []);
}
