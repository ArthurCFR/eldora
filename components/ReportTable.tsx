/**
 * ReportTable Component
 * Displays a beautiful sales table with products, sales, objectives, and ratios
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../constants/theme';
import productsData from '../agent/config/products.json';

interface ReportTableProps {
  salesData: { [productName: string]: number };
}

export default function ReportTable({ salesData }: ReportTableProps) {
  // Calculate totals
  let totalSales = 0;
  let totalObjectives = 0;

  const rows = productsData.products.map((product: any) => {
    const sold = salesData[product.name] || 0;
    const objective = product.target_quantity;
    const ratio = objective > 0 ? Math.round((sold / objective) * 100) : 0;

    totalSales += sold;
    totalObjectives += objective;

    return {
      name: product.display_name,
      sold,
      objective,
      ratio,
    };
  });

  const totalRatio = totalObjectives > 0
    ? Math.round((totalSales / totalObjectives) * 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.headerCell, styles.productCell]}>Produit</Text>
        <Text style={[styles.cell, styles.headerCell, styles.numberCell]}>Ventes</Text>
        <Text style={[styles.cell, styles.headerCell, styles.numberCell]}>Objectif</Text>
        <Text style={[styles.cell, styles.headerCell, styles.numberCell, styles.lastCell]}>Ratio</Text>
      </View>

      {/* Rows */}
      {rows.map((row, index) => (
        <View
          key={row.name}
          style={[
            styles.row,
            styles.dataRow,
            index % 2 === 0 ? styles.evenRow : styles.oddRow
          ]}
        >
          <Text style={[styles.cell, styles.productCell]} numberOfLines={2}>
            {row.name}
          </Text>
          <Text style={[styles.cell, styles.numberCell, styles.numberText]}>
            {row.sold}
          </Text>
          <Text style={[styles.cell, styles.numberCell, styles.numberText]}>
            {row.objective}
          </Text>
          <Text
            style={[
              styles.cell,
              styles.numberCell,
              styles.lastCell,
              styles.ratioText,
              row.ratio >= 100 ? styles.successRatio : row.ratio >= 50 ? styles.warningRatio : styles.dangerRatio
            ]}
          >
            {row.ratio}%
          </Text>
        </View>
      ))}

      {/* Total Row */}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={[styles.cell, styles.totalCell, styles.productCell]}>TOTAL</Text>
        <Text style={[styles.cell, styles.totalCell, styles.numberCell, styles.numberText]}>
          {totalSales}
        </Text>
        <Text style={[styles.cell, styles.totalCell, styles.numberCell, styles.numberText]}>
          {totalObjectives}
        </Text>
        <Text
          style={[
            styles.cell,
            styles.totalCell,
            styles.numberCell,
            styles.lastCell,
            styles.ratioText,
            totalRatio >= 100 ? styles.successRatio : totalRatio >= 50 ? styles.warningRatio : styles.dangerRatio
          ]}
        >
          {totalRatio}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  headerRow: {
    backgroundColor: colors.glass.light,
  },
  dataRow: {
    minHeight: 44,
  },
  evenRow: {
    backgroundColor: colors.background.secondary,
  },
  oddRow: {
    backgroundColor: colors.glass.light,
  },
  totalRow: {
    backgroundColor: colors.glass.medium,
    borderBottomWidth: 0,
  },
  cell: {
    padding: spacing.sm,
    justifyContent: 'center',
  },
  headerCell: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.text.primary,
  },
  totalCell: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.text.primary,
  },
  productCell: {
    flex: 3,
    borderRightWidth: 1,
    borderRightColor: colors.glass.border,
  },
  numberCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.glass.border,
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
  ratioText: {
    fontSize: 14,
    fontWeight: '700',
  },
  successRatio: {
    color: colors.status.excellent,
  },
  warningRatio: {
    color: colors.status.warning,
  },
  dangerRatio: {
    color: colors.status.poor,
  },
});
