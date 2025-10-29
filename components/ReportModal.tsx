/**
 * Modern Report Modal Component
 * Displays report with loading state and professional styling
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import ReportTable from './ReportTable';
import StockAlertsTable from './StockAlertsTable';

interface ReportConfiguration {
  attentionPointsTracking: boolean;
  productTableTracking: boolean;
  productSalesTracking: boolean;
  stockAlertsTracking: boolean;
  additionalRemarksTracking: boolean;
}

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSend: () => void;
  isLoading: boolean;
  // Report data
  projectName?: string;
  userName?: string;
  reportText?: string;
  sales?: { [productName: string]: number };
  products?: any[];
  reportData?: any;
  reportConfiguration?: ReportConfiguration;
  reportStatus?: 'draft' | 'sent';
}

export default function ReportModal({
  visible,
  onClose,
  onEdit,
  onSend,
  isLoading,
  projectName,
  userName,
  reportText,
  sales = {},
  products = [],
  reportData,
  reportConfiguration,
  reportStatus,
}: ReportModalProps) {
  // Parse reportText to separate attention points from additional remarks
  const parseReportSections = (text: string) => {
    if (!text) return { attentionPoints: '', additionalRemarks: '' };

    // Split by double newline to separate sections
    const parts = text.split('\n\n');

    // Find where additional remarks start (lines beginning with •)
    let attentionPointsText = '';
    let additionalRemarksText = '';
    let foundRemarks = false;

    parts.forEach(part => {
      const trimmedPart = part.trim();
      if (trimmedPart.startsWith('•')) {
        foundRemarks = true;
        additionalRemarksText += (additionalRemarksText ? '\n' : '') + trimmedPart;
      } else if (!foundRemarks && trimmedPart) {
        attentionPointsText += (attentionPointsText ? '\n\n' : '') + trimmedPart;
      }
    });

    return { attentionPoints: attentionPointsText, additionalRemarks: additionalRemarksText };
  };

  // Render attention points (with **BOLD** and BulletYellow.png)
  const renderAttentionPoints = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      if (!line.trim()) {
        return <Text key={`attention-${lineIndex}`}>{'\n'}</Text>;
      }

      const startsWithBold = line.trim().startsWith('**');
      const parts = line.split(/(\*\*[^*]+\*\*)/g);

      return (
        <View key={`attention-${lineIndex}`} style={styles.commentLine}>
          {startsWithBold && (
            <Image
              source={require('../assets/Logo/BulletYellow.png')}
              style={styles.bulletPointYellow}
              resizeMode="contain"
            />
          )}
          <Text style={styles.commentText}>
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2);
                return (
                  <Text key={`part-${partIndex}`} style={styles.commentTextBold}>
                    {boldText}
                  </Text>
                );
              }
              return <Text key={`part-${partIndex}`}>{part}</Text>;
            })}
          </Text>
        </View>
      );
    });
  };

  // Render additional remarks (with • and BulletDark.png - smaller)
  const renderAdditionalRemarks = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      if (!line.trim()) return null;

      // Remove the • prefix if present
      const cleanedLine = line.trim().replace(/^•\s*/, '');

      return (
        <View key={`remark-${lineIndex}`} style={styles.remarkLine}>
          <Image
            source={require('../assets/Logo/BulletDark.png')}
            style={styles.bulletPointDark}
            resizeMode="contain"
          />
          <Text style={styles.remarkText}>{cleanedLine}</Text>
        </View>
      );
    });
  };

  const { attentionPoints, additionalRemarks } = parseReportSections(reportText || '');

  // Get financial data directly from reportData (calculated by agent)
  const totalSalesAmount = reportData?.total_amount || 0;
  const salesAmounts = reportData?.sales_amounts || {};

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
            <Ionicons name="document-text" size={24} color={colors.accent.gold} />
            <View>
              <Text style={styles.headerTitle}>Rapport</Text>
              <Text style={styles.headerSubtitle}>{projectName || 'Projet'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.gold} />
            <Text style={styles.loadingText}>Un instant, je te propose un rapport.</Text>
          </View>
        ) : (
          <>
            {/* Report Content */}
            <ScrollView
              style={styles.contentContainer}
              contentContainerStyle={styles.contentPadding}
              showsVerticalScrollIndicator={true}
            >
              {/* Report Header */}
              <View style={styles.reportHeader}>
                <Text style={styles.reportEventName}>
                  {reportData?.event_name || projectName || 'Événement'}
                </Text>
                <Text style={styles.reportMeta}>{userName || 'Utilisateur'}</Text>
                <Text style={styles.reportMeta}>
                  {new Date().toLocaleDateString('fr-FR')}
                </Text>
              </View>

              {/* Attention Points Section */}
              {reportConfiguration?.attentionPointsTracking !== false && attentionPoints && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>POINTS D'ATTENTION</Text>
                  <View style={styles.commentBox}>
                    {renderAttentionPoints(attentionPoints)}
                  </View>
                </View>
              )}

              {/* Additional Remarks Section */}
              {reportConfiguration?.additionalRemarksTracking !== false && additionalRemarks && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>REMARQUES COMPLÉMENTAIRES</Text>
                  <View style={styles.remarksBox}>
                    {renderAdditionalRemarks(additionalRemarks)}
                  </View>
                </View>
              )}

              {/* Product Sales Table */}
              {reportConfiguration?.productSalesTracking && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>TABLEAU DES VENTES</Text>
                  <ReportTable
                    salesData={sales}
                    salesAmounts={salesAmounts}
                    products={products}
                  />
                </View>
              )}

              {/* Stock Alerts Table */}
              {reportConfiguration?.stockAlertsTracking && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>ALERTES DE RUPTURE DE STOCK</Text>
                  <StockAlertsTable
                    stockAlerts={reportData?.stock_alerts || {}}
                    products={products}
                  />
                </View>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Fermer</Text>
              </TouchableOpacity>

              {/* Only show edit and send buttons if report is not sent */}
              {(!reportStatus || reportStatus !== 'sent') && (
                <>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={onEdit}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pencil" size={18} color={colors.text.primary} />
                    <Text style={styles.editButtonText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={onSend}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={require('../assets/Logo/BulletYellow.png')}
                      style={styles.bulletIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.sendButtonText}>Envoyer</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  contentPadding: {
    padding: spacing.lg,
  },
  reportHeader: {
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    marginBottom: spacing.lg,
  },
  reportEventName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  reportMeta: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commentBox: {
    backgroundColor: colors.glass.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  commentLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  bulletPointYellow: {
    width: 16,
    height: 16,
    marginRight: spacing.sm,
    marginTop: 3,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
    flex: 1,
  },
  commentTextBold: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
    fontWeight: '700',
  },
  remarksBox: {
    backgroundColor: colors.glass.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  remarkLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bulletPointDark: {
    width: 12,
    height: 12,
    marginRight: spacing.sm,
    marginTop: 4,
  },
  remarkText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.secondary,
    flex: 1,
  },
  performanceContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.glass.light,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  performanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent.gold,
  },
  discountText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    backgroundColor: colors.background.secondary,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.glass.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  cancelButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.glass.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  editButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent.gold,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.gold,
  },
  sendButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '700',
  },
  bulletIcon: {
    width: 20,
    height: 20,
  },
});
