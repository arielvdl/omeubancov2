import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface IconProps {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: number;
  color?: string;
  className?: string;
}

export function Icon({ name, size = 24, color = '#1a1a0e', className }: IconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      className={className}
    />
  );
}
