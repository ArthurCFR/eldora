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
      <View style={styles.header}>
        <Text style={styles.title}>Session de vente</Text>
      </View>

      <View style={styles.infoContainer}>
        <InfoRow text={`${sales.salesDate} • ${sales.salesTime}`} />
        <InfoRow text={sales.eventName} />
        <InfoRow text={sales.eventLocation} />
        <InfoRow text={`Stand ${sales.boothNumber}`} />
        <InfoRow text={sales.salesRepName} />
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
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  infoContainer: {
    gap: spacing.sm,
  },
  infoRow: {
    paddingVertical: spacing.xs / 2,
  },
  infoText: {
    ...typography.small,
    color: colors.text.secondary,
    flex: 1,
  },
});
