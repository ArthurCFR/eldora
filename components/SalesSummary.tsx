/**
 * Résumé des informations de vente Samsung
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { SamsungSalesInfo } from '../constants/samsungMockData';

interface SalesSummaryProps {
  sales: SamsungSalesInfo;
}

export default function SalesSummary({ sales }: SalesSummaryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="storefront" size={24} color={colors.primary} />
        <Text style={styles.title}>📱 Journée de Salon</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={18} color={colors.gray[600]} />
          <Text style={styles.infoText}>
            {sales.salesDate} • {sales.salesTime}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color={colors.gray[600]} />
          <Text style={styles.infoText}>{sales.eventName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="business" size={18} color={colors.gray[600]} />
          <Text style={styles.infoText}>{sales.eventLocation}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="pricetag" size={18} color={colors.gray[600]} />
          <Text style={styles.infoText}>Stand {sales.boothNumber}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={18} color={colors.gray[600]} />
          <Text style={styles.infoText}>{sales.salesRepName}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.gray[700],
    flex: 1,
  },
});
