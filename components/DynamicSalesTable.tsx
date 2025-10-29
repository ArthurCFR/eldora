/**
 * Dynamic Sales Table - Adapts to any table structure
 * Uses AI-generated table structure to display data
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import GlassContainer from './GlassContainer';
import { TableStructure, TableColumn } from '../types/project';

interface Product {
  [key: string]: any;
}

interface DynamicSalesTableProps {
  sales: { [productName: string]: any }; // Can hold any data structure
  products: Product[];
  tableStructure: TableStructure;
  customerFeedback?: string;
  onSalesChange?: (sales: { [productName: string]: any }) => void;
  onFeedbackChange?: (feedback: string) => void;
}

export default function DynamicSalesTable({
  sales,
  products,
  tableStructure,
  customerFeedback,
  onSalesChange,
  onFeedbackChange
}: DynamicSalesTableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSales, setEditedSales] = useState(sales);

  /**
   * Get cell value for a specific product and column
   */
  const getCellValue = (product: Product, column: TableColumn, currentSales: any): any => {
    const productName = getProductName(product);

    switch (column.source) {
      case 'product':
        // Data comes from product Excel (e.g., price, category)
        return product[column.id] || product[column.label] || '-';

      case 'sales':
        // Data comes from sales tracking during conversation
        if (!currentSales[productName]) return 0;
        return currentSales[productName][column.id] || 0;

      case 'calculated':
        // Calculated field (e.g., total = quantity * price)
        if (!column.calculation) return '-';
        return calculateField(product, column.calculation, currentSales);

      default:
        return '-';
    }
  };

  /**
   * Calculate a field based on formula
   */
  const calculateField = (product: Product, calculation: string, currentSales: any): any => {
    const productName = getProductName(product);

    try {
      // Simple calculation parser
      // Supports: quantity * price, (sold / target) * 100
      let formula = calculation;

      // Replace field names with actual values
      const replacements: { [key: string]: number } = {};

      // Get all field names from products
      Object.keys(product).forEach(key => {
        const value = product[key];
        if (typeof value === 'number') {
          replacements[key] = value;
        }
      });

      // Get all field names from sales
      if (currentSales[productName]) {
        Object.keys(currentSales[productName]).forEach(key => {
          const value = currentSales[productName][key];
          if (typeof value === 'number') {
            replacements[key] = value;
          }
        });
      }

      // Find all variable names in the formula
      const variablePattern = /\b[a-z_][a-z0-9_]*\b/gi;
      const variables = formula.match(variablePattern) || [];

      // For each variable, if not in replacements, set to 0
      variables.forEach(varName => {
        if (replacements[varName] === undefined) {
          replacements[varName] = 0;
        }
      });

      // Replace in formula
      Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        formula = formula.replace(regex, replacements[key].toString());
      });

      // Evaluate formula
      const result = eval(formula);
      return isNaN(result) ? '-' : Math.round(result);
    } catch (err) {
      console.error('Error calculating field:', err);
      return '-';
    }
  };

  /**
   * Get product name from product object
   */
  const getProductName = (product: Product): string => {
    return product.display_name || product['Nom d\'affichage'] || product.name || product.Nom || product.nom || 'Unknown';
  };

  /**
   * Format value based on column type
   */
  const formatValue = (value: any, type: string): string => {
    if (value === null || value === undefined || value === '-') return '-';

    switch (type) {
      case 'currency':
        return `${value} €`;
      case 'percentage':
        return `${value}%`;
      case 'number':
        return value.toString();
      case 'text':
      default:
        return value.toString();
    }
  };

  const currentSales = isEditing ? editedSales : sales;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Rapport de ventes</Text>
          <Text style={styles.subtitle}>{tableStructure.description}</Text>
        </View>

        {/* Table */}
        <GlassContainer style={styles.table} intensity="medium">
          {/* Header Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHeader}>
                {tableStructure.columns.map((column, index) => (
                  <View
                    key={column.id}
                    style={[
                      styles.tableHeaderCell,
                      index === 0 ? styles.firstColumn : styles.regularColumn
                    ]}
                  >
                    <Text style={styles.tableHeaderText}>{column.label}</Text>
                  </View>
                ))}
              </View>

              {/* Data Rows */}
              {products.map((product, rowIndex) => (
                <View
                  key={rowIndex}
                  style={[
                    styles.tableRow,
                    rowIndex % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                  ]}
                >
                  {tableStructure.columns.map((column, colIndex) => {
                    const value = getCellValue(product, column, currentSales);
                    const formattedValue = formatValue(value, column.type);

                    return (
                      <View
                        key={column.id}
                        style={[
                          styles.tableCell,
                          colIndex === 0 ? styles.firstColumn : styles.regularColumn
                        ]}
                      >
                        <Text style={[
                          styles.tableCellText,
                          colIndex === 0 && styles.tableCellTextBold
                        ]}>
                          {formattedValue}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </GlassContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  table: {
    padding: 0,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.glass.light,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  tableHeaderCell: {
    justifyContent: 'center',
  },
  tableHeaderText: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  tableRowEven: {
    backgroundColor: 'transparent',
  },
  tableRowOdd: {
    backgroundColor: colors.glass.light,
  },
  tableCell: {
    justifyContent: 'center',
  },
  tableCellText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  tableCellTextBold: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  firstColumn: {
    width: 150,
    minWidth: 150,
  },
  regularColumn: {
    width: 100,
    minWidth: 100,
    alignItems: 'center',
  },
});
