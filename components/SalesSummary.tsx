/**
 * Modern Sales Summary with Glassmorphism
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { SamsungSalesInfo } from '../constants/samsungMockData';
import GlassContainer from './GlassContainer';

interface SalesSummaryProps {
  sales: SamsungSalesInfo;
}

export default function SalesSummary({ sales }: SalesSummaryProps) {
  return (
    <GlassContainer
      style={styles.container}
      intensity="medium"
      shadow
    >
      <View style={styles.infoContainer}>
        <Text style={styles.eventName}>{sales.eventName}</Text>
        <InfoRow text={`${sales.salesDate} • ${sales.eventLocation} • Stand ${sales.boothNumber}`} />
      </View>
    </GlassContainer>
  );
}

interface InfoRowProps {
  text: string;
}

function InfoRow({ text }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  infoContainer: {
    gap: spacing.xs,
  },
  eventName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  infoRow: {
    paddingVertical: 2,
  },
  infoText: {
    fontSize: 11,
    color: colors.text.secondary,
    flex: 1,
  },
});
