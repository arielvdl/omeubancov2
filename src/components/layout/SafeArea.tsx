import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

interface SafeAreaProps {
  children: React.ReactNode;
  className?: string;
  edges?: Edge[];
}

export function SafeArea({
  children,
  className = '',
  edges = ['top', 'left', 'right'],
}: SafeAreaProps) {
  return (
    <SafeAreaView
      edges={edges}
      className={`flex-1 bg-background-light ${className}`}
    >
      {children}
    </SafeAreaView>
  );
}
