/**
 * Modern Catalogue Modal Component
 * Professional table display with fixed headers, alternating rows, and better alignment
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';

interface CatalogueModalProps {
  visible: boolean;
  onClose: () => void;
  products: any[];
  projectName: string;
}

export default function CatalogueModal({
  visible,
  onClose,
  products,
  projectName,
}: CatalogueModalProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  if (!products || products.length === 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Catalogue - {projectName}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={28} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Aucun produit disponible</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const columns = Object.keys(products[0]);

  // Get column width based on content
  const getColumnWidth = (columnName: string): number => {
    const maxLength = Math.max(
      columnName.length,
      ...products.map(p => {
        const value = p[columnName];
        return value !== null && value !== undefined ? String(value).length : 0;
      })
    );
    // Min 100px, max 250px, ~8px per character
    return Math.min(Math.max(maxLength * 8 + 24, 100), 250);
  };

  // Sort products
  const sortedProducts = [...products];
  if (sortColumn) {
    sortedProducts.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

      // Compare
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="book" size={24} color={colors.accent.gold} />
            <View>
              <Text style={styles.headerTitle}>Catalogue</Text>
              <Text style={styles.headerSubtitle}>{projectName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>Produits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{columns.length}</Text>
            <Text style={styles.statLabel}>Colonnes</Text>
          </View>
        </View>

        {/* Table */}
        <ScrollView
          style={styles.tableContainer}
          contentContainerStyle={styles.tableContent}
          showsVerticalScrollIndicator={true}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.horizontalScroll}
          >
            <View style={styles.table}>
              {/* Header Row */}
              <View style={styles.headerRow}>
                {columns.map((column, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.headerCell,
                      { width: getColumnWidth(column) },
                      sortColumn === column && styles.headerCellActive,
                    ]}
                    onPress={() => handleSort(column)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.headerCellText} numberOfLines={1}>
                      {column}
                    </Text>
                    {sortColumn === column && (
                      <Ionicons
                        name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={colors.accent.gold}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Data Rows */}
              {sortedProducts.map((product, rowIndex) => (
                <View
                  key={rowIndex}
                  style={[
                    styles.dataRow,
                    rowIndex % 2 === 0 ? styles.dataRowEven : styles.dataRowOdd,
                    rowIndex === sortedProducts.length - 1 && styles.dataRowLast,
                  ]}
                >
                  {columns.map((column, colIndex) => (
                    <View
                      key={colIndex}
                      style={[
                        styles.dataCell,
                        { width: getColumnWidth(column) },
                      ]}
                    >
                      <Text style={styles.dataCellText} numberOfLines={2}>
                        {product[column] !== null && product[column] !== undefined
                          ? String(product[column])
                          : '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    backgroundColor: colors.background.secondary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.lg,
    backgroundColor: colors.glass.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.accent.gold,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.glass.border,
  },
  tableContainer: {
    flex: 1,
  },
  tableContent: {
    flexGrow: 1,
  },
  horizontalScroll: {
    flex: 1,
  },
  table: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.dark,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent.gold,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.glass.border,
    gap: spacing.xs,
  },
  headerCellActive: {
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
  },
  headerCellText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.text.onDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
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
  dataRowLast: {
    borderBottomWidth: 0,
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
    color: colors.text.secondary,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    backgroundColor: colors.background.secondary,
  },
  closeButton: {
    backgroundColor: colors.accent.gold,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.gold,
  },
  closeButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '700',
  },
});
