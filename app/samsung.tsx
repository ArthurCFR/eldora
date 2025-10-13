/**
 * Écran vendeur Samsung - Rapport de journée salon
 * V2: Utilise LiveKit pour conversation en temps réel
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import SalesSummary from '../components/SalesSummary';
import LiveKitVoiceButton from '../components/LiveKitVoiceButton';
import SamsungSalesTable from '../components/SamsungSalesTable';
import ReportTable from '../components/ReportTable';
import Header from '../components/Header';

import { MOCK_SAMSUNG_SALES } from '../constants/samsungMockData';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';
import productsData from '../produits.json';
import {
  DailyReport,
  loadTodayReport,
  createReport,
  updateReport,
  sendReport,
  deleteTodayReport,
} from '../services/dailyReportService';

export default function SamsungSales() {
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sales, setSales] = useState<{ [productName: string]: number }>({});
  const [timeSpent, setTimeSpent] = useState<string | null>(null);
  const [customerFeedback, setCustomerFeedback] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [reportText, setReportText] = useState('');

  const handleTranscription = (text: string, isFinal: boolean) => {
    // Afficher la transcription en temps réel
    setTranscription(text);
  };

  const [reportData, setReportData] = useState<any>(null);

  // Charger le rapport du jour au montage
  React.useEffect(() => {
    loadDailyReport();
  }, []);

  const loadDailyReport = async () => {
    const report = await loadTodayReport(MOCK_SAMSUNG_SALES.salesRepName);
    if (report) {
      console.log('📄 Found existing report for today');
      setDailyReport(report);
      setIsEditMode(true);
      // Afficher le rapport existant
      setSales(report.sales);
      setCustomerFeedback(report.customerFeedback);
      const comment = generateCommentSection({
        key_insights: report.keyInsights,
        emotional_context: report.emotionalContext,
      }, report.customerFeedback);
      setReportText(comment);
    } else {
      console.log('📄 No report found for today, will create new one');
      setIsEditMode(false);
    }
  };

  const handleConversationComplete = async (data: any) => {
    // Quand la conversation est terminée, créer ou mettre à jour le rapport
    console.log('Samsung conversation complete, data:', data);

    // Parser les données de l'agent
    const parsedSales = data.sales || {};
    const parsedTimeSpent = data.time_spent || null;
    const parsedFeedback = data.customer_feedback || null;
    const parsedInsights = data.key_insights || [];
    const parsedEmotionalContext = data.emotional_context || null;

    try {
      let updatedReport: DailyReport;

      if (dailyReport) {
        // MODE ÉDITION : Mettre à jour le rapport existant
        console.log('📝 Updating existing report');
        updatedReport = await updateReport(dailyReport, {
          sales: parsedSales,
          customerFeedback: parsedFeedback,
          keyInsights: parsedInsights,
          emotionalContext: parsedEmotionalContext,
        });
      } else {
        // MODE CRÉATION : Créer un nouveau rapport
        console.log('📝 Creating new report');
        updatedReport = await createReport(
          MOCK_SAMSUNG_SALES.salesRepName,
          MOCK_SAMSUNG_SALES.eventName,
          {
            sales: parsedSales,
            customerFeedback: parsedFeedback || '',
            keyInsights: parsedInsights,
            emotionalContext: parsedEmotionalContext,
          }
        );
      }

      // Mettre à jour l'état avec le rapport mis à jour
      setDailyReport(updatedReport);
      setIsEditMode(true);
      setSales(updatedReport.sales);
      setCustomerFeedback(updatedReport.customerFeedback);
      setTimeSpent(parsedTimeSpent);

      // Store full data for the report
      setReportData(data);

      // Generate comment section
      const comment = generateCommentSection({
        key_insights: updatedReport.keyInsights,
        emotional_context: updatedReport.emotionalContext,
      }, updatedReport.customerFeedback);
      setReportText(comment);
      setShowReport(true);
    } catch (error) {
      console.error('Error saving report:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le rapport');
    }
  };

  const generateCommentSection = (
    data: any,
    feedbackData: string | null
  ): string => {
    // Build comment section (feedback + insights)
    let commentSection = '';
    if (feedbackData) {
      commentSection += feedbackData;
    }
    if (data.key_insights && data.key_insights.length > 0) {
      if (commentSection) commentSection += '\n\n';
      // Add line breaks between insights for better readability
      commentSection += data.key_insights.map((insight: string) => `• ${insight}`).join('\n');
    }
    if (!commentSection) {
      commentSection = 'Aucun commentaire spécifique.';
    }
    return commentSection;
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setSales({});
    setTimeSpent(null);
    setCustomerFeedback(null);
    setTranscription('');
    setReportText('');
    setReportData(null);
  };

  const handleSendReport = async () => {
    if (!dailyReport) {
      Alert.alert('Erreur', 'Aucun rapport à envoyer');
      return;
    }

    Alert.alert(
      'Envoyer le rapport',
      'Êtes-vous sûr de vouloir envoyer ce rapport ? Il ne pourra plus être modifié.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          style: 'default',
          onPress: async () => {
            try {
              await sendReport(dailyReport);
              Alert.alert('Succès', 'Votre rapport a été envoyé avec succès !');
              // Réinitialiser l'interface
              setDailyReport(null);
              setIsEditMode(false);
              setSales({});
              setCustomerFeedback(null);
              setReportText('');
              setShowReport(false);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'envoyer le rapport');
            }
          },
        },
      ]
    );
  };

  const handleDeleteReport = () => {
    console.log('🗑️ handleDeleteReport called - START');
    console.log('🗑️ dailyReport exists:', !!dailyReport);

    if (Platform.OS === 'web') {
      // Sur web, utiliser confirm natif
      const confirmed = (window as any).confirm('Supprimer le rapport du jour pour recommencer les tests ?');
      if (confirmed) {
        console.log('🗑️ User confirmed deletion');
        performDelete();
      }
    } else {
      // Sur mobile, utiliser Alert
      Alert.alert(
        'Supprimer le rapport',
        'Supprimer le rapport du jour pour recommencer les tests ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => performDelete(),
          },
        ]
      );
    }
  };

  const performDelete = async () => {
    console.log('🗑️ performDelete called');
    try {
      const success = await deleteTodayReport(MOCK_SAMSUNG_SALES.salesRepName);
      console.log('🗑️ deleteTodayReport result:', success);

      if (success) {
        // Réinitialiser l'interface
        setDailyReport(null);
        setIsEditMode(false);
        setSales({});
        setCustomerFeedback(null);
        setReportText('');
        setReportData(null);
        setShowReport(false);
        setTranscription('');

        console.log('✅ Interface reset complete');

        if (Platform.OS === 'web') {
          (window as any).alert('✅ Rapport supprimé. Vous pouvez recommencer comme une nouvelle journée.');
        } else {
          Alert.alert('Succès', 'Rapport supprimé. Vous pouvez recommencer comme une nouvelle journée.');
        }
      } else {
        console.error('❌ Failed to delete report');
        if (Platform.OS === 'web') {
          (window as any).alert('Erreur: Impossible de supprimer le rapport');
        } else {
          Alert.alert('Erreur', 'Impossible de supprimer le rapport');
        }
      }
    } catch (error) {
      console.error('❌ Exception during delete:', error);
      if (Platform.OS === 'web') {
        (window as any).alert('Erreur: ' + error);
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer le rapport');
      }
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <Header />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SalesSummary sales={MOCK_SAMSUNG_SALES} />

          <View style={styles.centerContent}>
            {/* Indicateur de rapport en cours */}
            {dailyReport && (
              <View style={styles.reportStatusBanner}>
                <Text style={styles.reportStatusText}>
                  Rapport en cours • Dernière modification : {new Date(dailyReport.lastModifiedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}

            <LiveKitVoiceButton
              userName={MOCK_SAMSUNG_SALES.salesRepName}
              eventName={MOCK_SAMSUNG_SALES.eventName}
              existingReport={dailyReport}
              onTranscription={handleTranscription}
              onConversationComplete={handleConversationComplete}
            />

            {transcription && (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionLabel}>Transcription:</Text>
                <Text style={styles.transcriptionText}>{transcription}</Text>
              </View>
            )}

            <Text style={styles.instructionText}>
              {isEditMode ? 'Ajoutez ou modifiez des informations' : 'Appuyez pour raconter votre journée de salon'}
            </Text>

            {/* Boutons d'action si un rapport existe */}
            {dailyReport && (
              <View style={styles.actionButtonsContainer}>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.viewReportButton}
                    onPress={() => {
                      // Ensure reportText and sales are up to date from dailyReport
                      const comment = generateCommentSection({
                        key_insights: dailyReport.keyInsights,
                        emotional_context: dailyReport.emotionalContext,
                      }, dailyReport.customerFeedback);
                      setReportText(comment);
                      setSales(dailyReport.sales); // Update sales data for the modal
                      setShowReport(true);
                    }}
                  >
                    <Text style={styles.viewReportButtonText}>Voir le rapport</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sendFinalButton}
                    onPress={handleSendReport}
                  >
                    <Image
                      source={require('../assets/Logo/BulletYellow.png')}
                      style={styles.bulletIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.sendFinalButtonText}>Envoyer définitivement</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.deleteTestButton}
                  onPress={() => {
                    console.log('🗑️ TouchableOpacity pressed');
                    handleDeleteReport();
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteTestButtonText}>Supprimer le rapport</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Tableau des ventes si disponible */}
          {Object.keys(sales).length > 0 && (
            <View style={styles.tableContainer}>
              <SamsungSalesTable sales={sales} />
            </View>
          )}
        </ScrollView>

        {/* Modal de rapport */}
        <Modal
          visible={showReport}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseReport}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rapport Samsung</Text>
                <TouchableOpacity onPress={handleCloseReport}>
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Report Header */}
                <View style={styles.reportHeader}>
                  <Text style={styles.reportEventName}>
                    {reportData?.event_name || MOCK_SAMSUNG_SALES.eventName || 'Événement'}
                  </Text>
                  <Text style={styles.reportMeta}>
                    {MOCK_SAMSUNG_SALES.salesRepName}
                  </Text>
                  <Text style={styles.reportMeta}>
                    {new Date().toLocaleDateString('fr-FR')}
                  </Text>
                </View>

                {/* Comment Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>COMMENTAIRE</Text>
                  <View style={styles.commentBox}>
                    <Text style={styles.commentText}>{reportText}</Text>
                  </View>
                </View>

                {/* Sales Table */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>TABLEAU DES VENTES</Text>
                  <ReportTable salesData={sales} />
                </View>

                {/* Performance */}
                {reportData && (
                  <View style={styles.performanceContainer}>
                    <Text style={styles.performanceText}>
                      Performance globale :{' '}
                      <Text style={styles.performanceValue}>
                        {(() => {
                          const totalSold = Object.values(sales).reduce((sum, val) => sum + val, 0);
                          const totalObjectives = productsData.reduce((sum, p) => sum + p.objectifs, 0);
                          return totalObjectives > 0 ? Math.round((totalSold / totalObjectives) * 100) : 0;
                        })()}
                        %
                      </Text>
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCloseReport}
                >
                  <Text style={styles.cancelButtonText}>Fermer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.sendButton]}
                  onPress={handleSendReport}
                >
                  <Image
                    source={require('../assets/Logo/BulletYellow.png')}
                    style={styles.bulletIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.sendButtonText}>Envoyer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  transcriptionBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glass.border,
    maxWidth: '90%',
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  transcriptionText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  instructionText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: spacing.xl,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  tableContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  closeButton: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.text.secondary,
    lineHeight: 36,
  },
  modalBody: {
    flex: 1,
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
  },
  commentBox: {
    backgroundColor: colors.glass.background,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
  },
  performanceContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.glass.light,
    borderRadius: 8,
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
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  cancelButton: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sendButton: {
    backgroundColor: colors.accent.gold,
    ...shadows.gold,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  reportStatusBanner: {
    backgroundColor: 'rgba(255, 209, 102, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    marginBottom: spacing.lg,
  },
  reportStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    width: '100%',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  viewReportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.dark,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  viewReportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.onDark,
  },
  sendFinalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.gold,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.gold,
  },
  sendFinalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  deleteTestButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent.danger,
    borderRadius: borderRadius.sm,
    minHeight: 36,
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 999,
  },
  deleteTestButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.accent.danger,
    textAlign: 'center',
  },
  bulletIcon: {
    width: 20,
    height: 20,
  },
});
