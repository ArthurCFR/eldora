/**
 * ReportTable Component
 * Displays a simple sales table with product names and sales numbers
 * Uses modern CatalogueModal styling for consistency
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import productsData from '../agent/config/products.json';

interface ReportTableProps {
  salesData: { [productName: string]: number };
  salesAmounts?: { [productName: string]: number }; // Individual amounts per product
  products?: any[];
}

export default function ReportTable({ salesData, salesAmounts, products }: ReportTableProps) {
  // Use provided products or fallback to Samsung products
  const productsList = products && products.length > 0 ? products : productsData.products;

  // Calculate total sales and total amount
  let totalSales = 0;
  let totalAmount = 0;

  const rows = productsList.map((product: any) => {
    // Handle different product name fields
    const productName = product.display_name || product["Nom d'affichage"] || product.name || product.Nom || product.nom;
    const displayName = product.display_name || product["Nom d'affichage"] || productName;
    const sold = salesData[productName] || 0;
    const amount = salesAmounts && salesAmounts[productName] ? salesAmounts[productName] : 0;

    totalSales += sold;
    totalAmount += amount;

    return {
      name: displayName,
      sold,
      amount,
    };
  });

  // Sort rows: products with sales first, then alphabetically
  rows.sort((a, b) => {
    if (a.sold !== b.sold) {
      return b.sold - a.sold; // Higher sales first
    }
    return a.name.localeCompare(b.name); // Alphabetical for same sales
  });

  return (
    <View style={styles.container}>
      {/* Header Row - Professional dark style */}
      <View style={styles.headerRow}>
        <View style={[styles.cell, styles.headerCell, styles.productCell]}>
          <Text style={styles.headerCellText}>NOM DU PRODUIT</Text>
        </View>
        <View style={[styles.cell, styles.headerCell, styles.salesCell]}>
          <Text style={styles.headerCellText}>NOMBRE VENTE</Text>
        </View>
        <View style={[styles.cell, styles.headerCell, styles.amountCell, styles.lastCell]}>
          <Text style={styles.headerCellText}>MONTANT</Text>
        </View>
      </View>

      {/* Data Rows - Alternating colors with grayed out zero sales */}
      {rows.map((row, index) => {
        const hasZeroSales = row.sold === 0;
        return (
          <View
            key={row.name}
            style={[
              styles.dataRow,
              index % 2 === 0 ? styles.dataRowEven : styles.dataRowOdd,
              hasZeroSales && styles.dataRowZero,
            ]}
          >
            <View style={[styles.cell, styles.dataCell, styles.productCell]}>
              <Text
                style={[
                  styles.dataCellText,
                  hasZeroSales && styles.zeroSalesText,
                ]}
                numberOfLines={2}
              >
                {row.name}
              </Text>
            </View>
            <View style={[styles.cell, styles.dataCell, styles.salesCell]}>
              <Text
                style={[
                  styles.numberText,
                  hasZeroSales && styles.zeroSalesText,
                ]}
              >
                {row.sold}
              </Text>
            </View>
            <View style={[styles.cell, styles.dataCell, styles.amountCell, styles.lastCell]}>
              <Text
                style={[
                  styles.amountText,
                  hasZeroSales && styles.zeroSalesText,
                ]}
              >
                {row.amount > 0 ? `${row.amount.toFixed(2)} €` : '-'}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Total Row - Gold accent */}
      <View style={styles.totalRow}>
        <View style={[styles.cell, styles.totalCell, styles.productCell]}>
          <Text style={styles.totalCellText}>TOTAL</Text>
        </View>
        <View style={[styles.cell, styles.totalCell, styles.salesCell]}>
          <Text style={styles.totalNumberText}>{totalSales}</Text>
        </View>
        <View style={[styles.cell, styles.totalCell, styles.amountCell, styles.lastCell]}>
          <Text style={styles.totalAmountText}>
            {totalAmount > 0 ? `${totalAmount.toFixed(2)} €` : '-'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
  },
  // Base cell styling
  cell: {
    // Base cell styles - extended by specific cell types
  },
  // Header styling - dark professional look
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.dark,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent.gold,
  },
  headerCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.glass.border,
  },
  headerCellText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.text.onDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  // Data rows - alternating colors
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    minHeight: 48,
  },
  dataRowEven: {
    backgroundColor: colors.background.secondary,
  },
  dataRowOdd: {
    backgroundColor: 'transparent',
  },
  dataRowZero: {
    opacity: 0.5,
  },
  dataCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.glass.border,
  },
  dataCellText: {
    ...typography.small,
    color: colors.text.primary,
    lineHeight: 18,
  },
  // Total row - gold accent
  totalRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
    borderBottomWidth: 0,
    minHeight: 52,
  },
  totalCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.accent.gold,
  },
  totalCellText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  totalNumberText: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Cell types - 3 columns with amount
  productCell: {
    flex: 3,
  },
  salesCell: {
    flex: 1.5,
    alignItems: 'center',
  },
  amountCell: {
    flex: 2,
    alignItems: 'center',
  },
  lastCell: {
    borderRightWidth: 0,
  },
  numberText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  amountText: {
    fontSize: 14,
    color: colors.accent.gold,
    fontWeight: '600',
    textAlign: 'center',
  },
  totalAmountText: {
    fontSize: 15,
    color: colors.accent.gold,
    fontWeight: '700',
    textAlign: 'center',
  },
  zeroSalesText: {
    color: colors.text.tertiary,
  },
});
