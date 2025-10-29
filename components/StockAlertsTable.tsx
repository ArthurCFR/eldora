/**
 * Stock Alerts Table Component
 * Displays stock rupture alerts for products (Yes/No format)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

interface Product {
  [key: string]: any;
}

interface StockAlertsTableProps {
  stockAlerts: { [productName: string]: boolean }; // true = rupture, false = pas de rupture
  products: Product[];
}

export default function StockAlertsTable({
  stockAlerts,
  products,
}: StockAlertsTableProps) {
  /**
   * Get product name from product object
   */
  const getProductName = (product: Product): string => {
    return product.display_name || product['Nom d\'affichage'] || product.name || product.Nom || product.nom || 'Unknown';
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.productColumn}>
              <Text style={styles.headerText}>Produit</Text>
            </View>
            <View style={styles.statusColumn}>
              <Text style={styles.headerText}>Rupture de stock ?</Text>
            </View>
          </View>

          {/* Data Rows */}
          {products.map((product, index) => {
            const productName = getProductName(product);
            const isOutOfStock = stockAlerts[productName] || false;

            return (
              <View
                key={index}
                style={[
                  styles.row,
                  index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                ]}
              >
                <View style={styles.productColumn}>
                  <Text style={styles.productText}>{productName}</Text>
                </View>
                <View style={styles.statusColumn}>
                  <View style={[styles.statusBadge, isOutOfStock ? styles.statusBadgeAlert : styles.statusBadgeOk]}>
                    <Ionicons
                      name={isOutOfStock ? 'alert-circle' : 'checkmark-circle'}
                      size={16}
                      color={isOutOfStock ? colors.accent.danger : colors.accent.success}
                    />
                    <Text style={[styles.statusText, isOutOfStock ? styles.statusTextAlert : styles.statusTextOk]}>
                      {isOutOfStock ? 'Oui' : 'Non'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  table: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.glass.light,
    padding: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.glass.border,
  },
  headerText: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  rowEven: {
    backgroundColor: 'transparent',
  },
  rowOdd: {
    backgroundColor: colors.glass.light,
  },
  productColumn: {
    width: 200,
    minWidth: 200,
    justifyContent: 'center',
  },
  statusColumn: {
    width: 150,
    minWidth: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusBadgeAlert: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
  },
  statusBadgeOk: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  statusTextAlert: {
    color: colors.accent.danger,
  },
  statusTextOk: {
    color: colors.accent.success,
  },
});
