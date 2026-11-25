import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <SafeAreaView className={`flex-1 bg-surface px-6 ${className}`}>{children}</SafeAreaView>;
}
