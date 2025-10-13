/**
 * Modern Samsung Sales Table with Glassmorphism
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import productsData from '../produits.json';
import GlassContainer from './GlassContainer';
import { generateManagerialInsights, generateExecutiveSummary } from '../services/insightGenerator';
import { MOCK_SAMSUNG_SALES } from '../constants/samsungMockData';

/**
 * Formate le feedback avec support des marqueurs ** pour le gras
 */
function formatFeedback(feedback: string | null): Array<{ text: string; bold: boolean }> {
  if (!feedback) return [];

  const result: Array<{ text: string; bold: boolean }> = [];

  // Parser les ** pour le gras
  const parts = feedback.split('**');

  parts.forEach((part, index) => {
    if (!part) return;

    // Les parties impaires (index 1, 3, 5...) sont en gras
    const isBold = index % 2 === 1;

    // Remplacer les \n par de vrais retours à la ligne
    const textWithNewlines = part.replace(/\\n/g, '\n');

    result.push({ text: textWithNewlines, bold: isBold });
  });

  return result;
}

interface SamsungSalesTableProps {
  sales: { [productName: string]: number };
  timeSpent?: string;
  customerFeedback?: string;
  onSalesChange?: (sales: { [productName: string]: number }) => void;
  onFeedbackChange?: (feedback: string) => void;
}

export default function SamsungSalesTable({
  sales,
  timeSpent,
  customerFeedback,
  onSalesChange,
  onFeedbackChange
}: SamsungSalesTableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSales, setEditedSales] = useState(sales);
  const [editedFeedback, setEditedFeedback] = useState(
    typeof customerFeedback === 'string' ? customerFeedback : JSON.stringify(customerFeedback, null, 2)
  );
  const [executiveSummary, setExecutiveSummary] = useState<string>('');

  // Générer le résumé exécutif quand les données changent
  useEffect(() => {
    const summary = generateExecutiveSummary(sales, customerFeedback || null);
    setExecutiveSummary(summary);
  }, [sales, customerFeedback]);

  const calculateScore = (sold: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((sold / target) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 100) return colors.status.excellent;
    if (score >= 75) return colors.status.good;
    if (score >= 50) return colors.status.warning;
    return colors.status.poor;
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      // Valider les modifications
      if (onSalesChange) onSalesChange(editedSales);
      if (onFeedbackChange) onFeedbackChange(editedFeedback);
    }
    setIsEditing(!isEditing);
  };

  const handleIncrementSale = (productName: string) => {
    setEditedSales(prev => ({
      ...prev,
      [productName]: (prev[productName] || 0) + 1
    }));
  };

  const handleDecrementSale = (productName: string) => {
    setEditedSales(prev => ({
      ...prev,
      [productName]: Math.max(0, (prev[productName] || 0) - 1)
    }));
  };

  const currentSales = isEditing ? editedSales : sales;
  const totalSold = Object.values(currentSales).reduce((sum, count) => sum + count, 0);
  const totalTarget = productsData.reduce((sum, p) => sum + p.objectifs, 0);
  const globalScore = calculateScore(totalSold, totalTarget);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Rapport de ventes</Text>
      </View>

      {/* Executive Summary */}
      {executiveSummary && (
        <GlassContainer style={styles.summarySection} intensity="strong">
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Résumé</Text>
          </View>
          <Text style={styles.summaryText}>{executiveSummary}</Text>
        </GlassContainer>
      )}

      {/* Bouton Modifier/Valider */}
      <TouchableOpacity
        style={[styles.editButton, isEditing && styles.editButtonActive]}
        onPress={handleToggleEdit}
      >
        <Text style={styles.editButtonText}>
          {isEditing ? 'Valider les modifications' : 'Modifier le rapport'}
        </Text>
      </TouchableOpacity>

      {/* Retours et remarques */}
      <GlassContainer style={styles.feedbackSection} intensity="medium">
        <View style={styles.feedbackHeader}>
          <Text style={styles.metaLabel}>Remarques & Retours</Text>
        </View>
        {isEditing ? (
          <TextInput
            style={styles.feedbackInput}
            value={editedFeedback}
            onChangeText={setEditedFeedback}
            multiline
            numberOfLines={4}
            placeholder="Ajoutez vos remarques ici..."
            placeholderTextColor={colors.text.muted}
          />
        ) : customerFeedback ? (
          <Text style={styles.feedbackText}>
            {formatFeedback(customerFeedback).map((segment, index) => (
              <Text
                key={index}
                style={segment.bold ? styles.feedbackTextBold : styles.feedbackTextNormal}
              >
                {segment.text}
              </Text>
            ))}
          </Text>
        ) : (
          <Text style={styles.feedbackText}>Aucune remarque</Text>
        )}
      </GlassContainer>

      {/* Score global */}
      <GlassContainer style={styles.globalScore} intensity="strong" bordered={false}>
        <View style={[styles.scoreGradient, { backgroundColor: getScoreColor(globalScore) }]} />
        <View style={styles.globalScoreContent}>
          <Text style={styles.globalScoreLabel}>Score Global</Text>
          <Text style={styles.globalScoreValue}>{globalScore}%</Text>
          <Text style={styles.globalScoreSubtext}>
            {totalSold} / {totalTarget} produits vendus
          </Text>
        </View>
      </GlassContainer>

      {/* Tableau */}
      <GlassContainer style={styles.table} intensity="medium">
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.productNameCell]}>Produit</Text>
          <Text style={[styles.tableHeaderCell, styles.numberCell]}>Vendu</Text>
          <Text style={[styles.tableHeaderCell, styles.numberCell]}>Objectif</Text>
          <Text style={[styles.tableHeaderCell, styles.scoreCell]}>Score</Text>
        </View>

        {/* Rows */}
        {productsData.map((product, index) => {
          const sold = currentSales[product.nom] || 0;
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

              {/* Colonne Vendu avec boutons +/- en mode édition */}
              {isEditing ? (
                <View style={[styles.numberCell, styles.editableNumberCell]}>
                  <TouchableOpacity
                    style={styles.decrementButton}
                    onPress={() => handleDecrementSale(product.nom)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.decrementButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.editableNumberText, sold > 0 && styles.boldText]}>
                    {sold}
                  </Text>
                  <TouchableOpacity
                    style={styles.incrementButton}
                    onPress={() => handleIncrementSale(product.nom)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.incrementButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.numberCell}>
                  <Text style={[styles.tableCell, sold > 0 && styles.boldText]}>
                    {sold}
                  </Text>
                </View>
              )}

              <View style={styles.numberCell}>
                <Text style={styles.tableCell}>{product.objectifs}</Text>
              </View>
              <View style={[styles.scoreCell, styles.scoreContainer]}>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                  <Text style={styles.scoreText}>{score}%</Text>
                </View>
              </View>
            </View>
          );
        })}
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
    paddingBottom: spacing.xl * 2, // Extra padding en bas pour le clavier
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.medium,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: spacing.sm,
  },
  editButtonActive: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.accent.gold,
  },
  editButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  summarySection: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  summaryHeader: {
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  summaryText: {
    ...typography.small,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  feedbackSection: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  feedbackHeader: {
    marginBottom: spacing.sm,
  },
  metaLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  feedbackText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  feedbackTextNormal: {
    ...typography.body,
    color: colors.text.secondary,
  },
  feedbackTextBold: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  feedbackInput: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.glass.light,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  globalScore: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  scoreGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  globalScoreContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  globalScoreLabel: {
    ...typography.small,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  globalScoreValue: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  globalScoreSubtext: {
    ...typography.small,
    color: colors.text.secondary,
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
    ...typography.small,
    color: colors.text.secondary,
  },
  productNameCell: {
    flex: 1.8,
  },
  productName: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text.primary,
  },
  productCategory: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs / 2,
  },
  numberCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCell: {
    flex: 1,
    alignItems: 'center',
  },
  scoreContainer: {
    justifyContent: 'center',
  },
  scoreBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  scoreText: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '700',
  },
  boldText: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  editableNumberCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  editableNumberText: {
    ...typography.small,
    color: colors.text.secondary,
    minWidth: 20,
    textAlign: 'center',
  },
  decrementButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  decrementButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  incrementButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.gold,
  },
  incrementButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
});
