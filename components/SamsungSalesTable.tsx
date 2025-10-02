/**
 * Tableau de rapport des ventes Samsung avec scores
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../constants/theme';
import productsData from '../produits.json';

interface SamsungSalesTableProps {
  sales: { [productName: string]: number };
  timeSpent?: string;
  customerFeedback?: string;
}

export default function SamsungSalesTable({ sales, timeSpent, customerFeedback }: SamsungSalesTableProps) {
  const calculateScore = (sold: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((sold / target) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 100) return colors.success;
    if (score >= 75) return '#FFA500'; // Orange
    if (score >= 50) return '#FF8C00'; // Dark orange
    return colors.danger;
  };

  const totalSold = Object.values(sales).reduce((sum, count) => sum + count, 0);
  const totalTarget = productsData.reduce((sum, p) => sum + p.objectifs, 0);
  const globalScore = calculateScore(totalSold, totalTarget);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 RAPPORT DE VENTES SAMSUNG</Text>

      {/* Retours et remarques */}
      {customerFeedback && (
        <View style={styles.feedbackSection}>
          <Text style={styles.metaLabel}>💬 Remarques & Retours:</Text>
          <Text style={styles.feedbackText}>{customerFeedback}</Text>
        </View>
      )}

      {/* Score global */}
      <View style={[styles.globalScore, { backgroundColor: getScoreColor(globalScore) }]}>
        <Text style={styles.globalScoreText}>
          Score Global: {globalScore}% ({totalSold}/{totalTarget})
        </Text>
      </View>

      {/* Tableau */}
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.productNameCell]}>Produit</Text>
          <Text style={[styles.tableHeaderCell, styles.numberCell]}>Vendu</Text>
          <Text style={[styles.tableHeaderCell, styles.numberCell]}>Objectif</Text>
          <Text style={[styles.tableHeaderCell, styles.scoreCell]}>Score</Text>
        </View>

        {/* Rows */}
        {productsData.map((product, index) => {
          const sold = sales[product.nom] || 0;
          const score = calculateScore(sold, product.objectifs);
          const scoreColor = getScoreColor(score);

          return (
            <View
              key={product.nom}
              style={[
                styles.tableRow,
                index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
              ]}
            >
              <View style={styles.productNameCell}>
                <Text style={styles.productName}>{product.nom}</Text>
                <Text style={styles.productCategory}>{product.catégorie}</Text>
              </View>
              <Text style={[styles.tableCell, styles.numberCell, sold > 0 && styles.boldText]}>
                {sold}
              </Text>
              <Text style={[styles.tableCell, styles.numberCell]}>{product.objectifs}</Text>
              <View style={[styles.scoreCell, styles.scoreContainer]}>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                  <Text style={styles.scoreText}>{score}%</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 16,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  metaValue: {
    fontSize: 14,
    color: colors.gray[900],
  },
  feedbackSection: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: colors.gray[700],
    marginTop: 4,
    fontStyle: 'italic',
  },
  globalScore: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    alignItems: 'center',
  },
  globalScoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    padding: 12,
  },
  tableHeaderCell: {
    color: colors.gray[900],
    fontWeight: '700',
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tableRowEven: {
    backgroundColor: colors.white,
  },
  tableRowOdd: {
    backgroundColor: colors.gray[50],
  },
  tableCell: {
    fontSize: 14,
    color: colors.gray[700],
  },
  productNameCell: {
    flex: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
  },
  productCategory: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 2,
  },
  numberCell: {
    flex: 0.8,
    textAlign: 'center',
  },
  scoreCell: {
    flex: 1,
    alignItems: 'center',
  },
  scoreContainer: {
    justifyContent: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  boldText: {
    fontWeight: '700',
    color: colors.gray[900],
  },
});
