/**
 * Modern Visit Summary with Glassmorphism
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VisitInfo } from '../types';
import { colors, typography, spacing, borderRadius } from '../constants/theme';
import GlassContainer from './GlassContainer';

interface VisitSummaryProps {
  visit: VisitInfo;
}

export default function VisitSummary({ visit }: VisitSummaryProps) {
  return (
    <GlassContainer style={styles.container} intensity="medium" shadow>
      <View style={styles.header}>
        <Text style={styles.title}>{visit.pharmacyName}</Text>
      </View>

      <View style={styles.infoContainer}>
        <InfoRow text={visit.pharmacistName} />
        <InfoRow text={`${visit.visitDate} à ${visit.visitTime}`} />
        <InfoRow text={visit.sector} />
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
