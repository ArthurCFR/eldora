import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Text, Animated } from 'react-native';
import { spacing, colors, borderRadius } from '../constants/theme';

interface HeaderProps {
  agentName?: string;
  centered?: boolean; // Logo centered mode (for login screen)
  animated?: boolean; // Enable animation on mount
}

export default function Header({ agentName = 'Assistant', centered = false, animated = false }: HeaderProps) {
  const logoPosition = useRef(new Animated.Value(centered ? 0 : 1)).current;
  const nameOpacity = useRef(new Animated.Value(centered ? 0 : 1)).current;

  useEffect(() => {
    if (animated && !centered) {
      // Animate from center to left
      Animated.parallel([
        Animated.spring(logoPosition, {
          toValue: 1,
          useNativeDriver: false,
          friction: 8,
          tension: 40,
          delay: 300, // Small delay after login
        }),
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 400,
          delay: 600, // Fade in name after logo moves
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [centered, animated]);

  // Interpolate logo position: 0 = center, 1 = left
  const logoLeft = logoPosition.interpolate({
    inputRange: [0, 1],
    outputRange: ['50%', '0%'],
  });

  const logoTranslateX = logoPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 0], // -16 to center the 32px logo
  });

  if (centered) {
    // Centered mode (login screen)
    return (
      <View style={styles.container}>
        <View style={styles.centeredLogoContainer}>
          <Image
            source={require('../assets/Logo/IconeDark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  // Normal mode with animation support
  return (
    <View style={styles.container}>
      {/* Animated Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            left: logoLeft,
            transform: [{ translateX: logoTranslateX }],
          },
        ]}
      >
        <Image
          source={require('../assets/Logo/IconeDark.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Agent name centered */}
      <Animated.View style={[styles.nameContainer, { opacity: nameOpacity }]}>
        <Text style={styles.nameText}>{agentName}</Text>
      </Animated.View>

      {/* Spacer to balance the layout */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 60,
    position: 'relative',
  },
  centeredLogoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'absolute',
    paddingHorizontal: spacing.md,
  },
  logo: {
    width: 32,
    height: 32,
  },
  nameContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  nameText: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  spacer: {
    width: 32,
  },
});
