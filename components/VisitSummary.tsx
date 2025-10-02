/**
 * Composant affichant le résumé de la visite en cours
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VisitInfo } from '../types';
import { colors, typography } from '../constants/theme';

interface VisitSummaryProps {
  visit: VisitInfo;
}

export default function VisitSummary({ visit }: VisitSummaryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="medkit" size={32} color={colors.primary} />
        <Text style={styles.title}>{visit.pharmacyName}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={16} color={colors.gray[500]} />
        <Text style={styles.infoText}>{visit.pharmacistName}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={16} color={colors.gray[500]} />
        <Text style={styles.infoText}>{visit.visitDate} à {visit.visitTime}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={16} color={colors.gray[500]} />
        <Text style={styles.infoText}>{visit.sector}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    ...typography.h1,
    color: colors.gray[900],
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    ...typography.body,
    color: colors.gray[500],
  },
});
