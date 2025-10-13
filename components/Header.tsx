import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { spacing } from '../constants/theme';

export default function Header() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/Logo/IconeDark.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  logo: {
    width: 50,
    height: 50,
  },
});
