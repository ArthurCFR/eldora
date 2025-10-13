/**
 * Glass Container - Modern glassmorphism component
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, shadows } from '../constants/theme';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'light' | 'medium' | 'strong';
  bordered?: boolean;
  shadow?: boolean;
}

export default function GlassContainer({
  children,
  style,
  intensity = 'medium',
  bordered = true,
  shadow = false,
}: GlassContainerProps) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.glass[intensity],
          borderColor: bordered ? colors.glass.border : 'transparent',
        },
        shadow && shadows.glass,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
