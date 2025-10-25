/**
 * Écran vendeur Samsung - Rapport de journée salon
 * V2: Utilise LiveKit pour conversation en temps réel
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  TextInput,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import SalesSummary from '../components/SalesSummary';
import LiveKitVoiceButton from '../components/LiveKitVoiceButton';
import SamsungSalesTable from '../components/SamsungSalesTable';
import ReportTable from '../components/ReportTable';
import Header from '../components/Header';
import ConversationHistory, { Message } from '../components/ConversationHistory';
import SoundWaveBar from '../components/SoundWaveBar';
import { useApp } from '../contexts/AppContext';

import { MOCK_SAMSUNG_SALES } from '../constants/samsungMockData';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';
import productsData from '../agent/config/products.json';
import {
  DailyReport,
  loadTodayReport,
  createReport,
  updateReport,
  sendReport,
  deleteTodayReport,
} from '../services/dailyReportService';

export default function SamsungSales() {
  const { userName, justLoggedIn } = useApp();
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sales, setSales] = useState<{ [productName: string]: number }>({});
  const [timeSpent, setTimeSpent] = useState<string | null>(null);
  const [customerFeedback, setCustomerFeedback] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [reportText, setReportText] = useState('');
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [screenHeight] = useState(Dimensions.get('window').height);
  const [agentAudioStream, setAgentAudioStream] = useState<MediaStream | null>(null);
  const [userAudioStream, setUserAudioStream] = useState<MediaStream | null>(null);
  const [showConversationHistory, setShowConversationHistory] = useState(false);
  const [manualMessage, setManualMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationMode, setConversationMode] = useState<'voice' | 'text'>('voice'); // Track current mode
  const soundBarVerticalPosition = useRef(new Animated.Value(0)).current;
  const soundBarScale = useRef(new Animated.Value(1)).current;
  const soundBarOpacity = useRef(new Animated.Value(1)).current;
  const [microphoneControl, setMicrophoneControl] = useState<((enabled: boolean) => Promise<void>) | null>(null);
  const [sendDataMessage, setSendDataMessage] = useState<((data: any) => Promise<void>) | null>(null);
  const [disconnectLiveKit, setDisconnectLiveKit] = useState<(() => void) | null>(null);

  const handleTranscription = (text: string, isFinal: boolean) => {
    // Afficher la transcription en temps réel
    setTranscription(text);

    // Si la transcription est finale, ajouter au historique de conversation
    if (isFinal && text.trim()) {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        text: text.trim(),
        sender: 'user',
        timestamp: new Date(),
      };
      setConversationMessages(prev => [...prev, userMessage]);
    }
  };

  const handleAgentResponse = (text: string) => {
    // Ajouter la réponse de l'agent à l'historique
    if (text.trim()) {
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        text: text.trim(),
        sender: 'agent',
        timestamp: new Date(),
      };
      setConversationMessages(prev => [...prev, agentMessage]);
    }
  };

  const handleConnectionStateChange = (isConnected: boolean, isAgentSpeaking: boolean) => {
    setIsConversationActive(isConnected);
    setIsAgentSpeaking(isAgentSpeaking);
  };

  const handleAudioStreamsChange = (agentStream: MediaStream | null, userStream: MediaStream | null) => {
    setAgentAudioStream(agentStream);
    setUserAudioStream(userStream);
  };

  const handleMicrophoneControl = (setEnabled: (enabled: boolean) => Promise<void>) => {
    setMicrophoneControl(() => setEnabled);
  };

  const handleDataMessageControl = (sendData: (data: any) => Promise<void>) => {
    setSendDataMessage(() => sendData);
  };

  const handleDisconnectControl = (disconnect: () => void) => {
    setDisconnectLiveKit(() => disconnect);
  };

  // Animate sound bar position when conversation history opens/closes
  // Calculate center position in pixels (50% of screen height - offset)
  const [soundBarTopPosition] = useState(new Animated.Value(screenHeight / 2 - 40));

  useEffect(() => {
    // Target: 100px when conversation open, center when closed
    const centerPosition = screenHeight / 2 - 40; // 50% of screen minus half of sound bar height
    const topPosition = 100; // Fixed top position
    const targetValue = showConversationHistory ? topPosition : centerPosition;

    Animated.spring(soundBarTopPosition, {
      toValue: targetValue,
      useNativeDriver: false, // We're animating layout properties (top)
      friction: 10, // Smooth spring animation
      tension: 50,
      velocity: 2,
    }).start();
  }, [showConversationHistory, screenHeight]);

  // Animate sound bar when typing (collapse to circle) and disable microphone
  useEffect(() => {
    Animated.parallel([
      Animated.spring(soundBarScale, {
        toValue: isTyping ? 0.4 : 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(soundBarOpacity, {
        toValue: isTyping ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Disable/enable microphone based on typing state
    if (microphoneControl && typeof microphoneControl === 'function') {
      microphoneControl(!isTyping).catch(err => {
        console.error('Failed to toggle microphone:', err);
      });
    }
  }, [isTyping, microphoneControl]);

  // Calculate dynamic overlay position based on screen height
  // Responsive layout constants
  const HEADER_HEIGHT = 60;
  const SOUND_WAVE_POSITION = 100; // Fixed position from top
  const SOUND_WAVE_HEIGHT = 80;
  const SAFE_MARGIN = 16;
  // Conversation overlay should start below sound wave
  const overlayTop = SOUND_WAVE_POSITION + SOUND_WAVE_HEIGHT + SAFE_MARGIN;
  const overlayBottom = SAFE_MARGIN;

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

  // Parse markdown bold (**TEXT**) for rendering
  const renderMarkdownText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Remove ** and render as bold
        const boldText = part.slice(2, -2);
        return (
          <Text key={index} style={styles.commentTextBold}>
            {boldText}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setSales({});
    setTimeSpent(null);
    setCustomerFeedback(null);
    setTranscription('');
    setReportText('');
    setReportData(null);
    // Keep conversation messages - don't clear them
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
      // CRITICAL: Disconnect LiveKit session FIRST before resetting state
      if (disconnectLiveKit) {
        console.log('🔌 Disconnecting LiveKit session...');
        disconnectLiveKit();
        console.log('✅ LiveKit disconnected');
      } else {
        console.warn('⚠️ No disconnect function available');
      }

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
        setConversationMessages([]);
        setIsConversationActive(false); // Reset conversation state

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

        {/* Header - always visible */}
        <Header agentName={userName || MOCK_SAMSUNG_SALES.salesRepName} animated={justLoggedIn} />

        {/* Sound wave bar - animated between centered and top position */}
        {isConversationActive && (
          <Animated.View
            style={[
              styles.soundWaveContainerAnimated,
              {
                // Animated top position (in pixels)
                top: soundBarTopPosition,
                transform: [
                  { translateY: soundBarVerticalPosition },
                  { scale: soundBarScale },
                ],
              },
            ]}
          >
            {/* Sound bars (hidden when typing) */}
            <Animated.View style={{ opacity: soundBarOpacity }}>
              <View style={styles.soundWaveWrapper}>
                <SoundWaveBar
                  isActive={isConversationActive && !isTyping}
                  isAgentSpeaking={isAgentSpeaking}
                  agentStream={agentAudioStream}
                  userStream={userAudioStream}
                />
                <TouchableOpacity
                  style={styles.messageIconButton}
                  onPress={() => setShowConversationHistory(!showConversationHistory)}
                >
                  <Ionicons
                    name={showConversationHistory ? "close-circle" : "chatbubble-ellipses"}
                    size={24}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Circular mic button (shown when typing) */}
            {isTyping && (
              <TouchableOpacity
                style={styles.micCircleButton}
                onPress={async () => {
                  setIsTyping(false);
                  setManualMessage('');
                  setConversationMode('voice'); // Switch back to voice mode

                  // Notify agent to switch to voice mode
                  if (sendDataMessage) {
                    try {
                      await sendDataMessage({
                        type: 'switch_to_voice',
                      });
                      console.log('🎤 Sent switch to voice mode signal to agent');
                    } catch (error) {
                      console.error('Failed to send switch to voice signal:', error);
                    }
                  }

                  // Re-enable microphone
                  if (microphoneControl && typeof microphoneControl === 'function') {
                    try {
                      await microphoneControl(true);
                    } catch (error) {
                      console.error('Failed to re-enable microphone:', error);
                    }
                  }
                }}
              >
                <Ionicons name="mic" size={32} color={colors.accent.gold} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Conversation overlay - only visible when user clicks message icon */}
        {isConversationActive && showConversationHistory && (
          <View style={[styles.conversationOverlay, { top: overlayTop, bottom: overlayBottom }]}>
            <ConversationHistory messages={conversationMessages} />

            {/* Manual message input */}
            <View style={styles.manualInputContainer}>
              <TextInput
                style={styles.manualInput}
                placeholder="Saisir un message manuel..."
                placeholderTextColor={colors.text.secondary}
                value={manualMessage}
                onChangeText={(text) => {
                  setManualMessage(text);
                  // Enable typing mode when user starts typing
                  if (text.length > 0 && !isTyping) {
                    setIsTyping(true);
                    setConversationMode('text'); // Switch to text mode
                  } else if (text.length === 0 && isTyping) {
                    setIsTyping(false);
                  }
                }}
                multiline
                autoFocus
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={async () => {
                  if (manualMessage.trim()) {
                    // Send text message to agent via data channel
                    if (sendDataMessage) {
                      try {
                        await sendDataMessage({
                          type: 'user_text_message',
                          text: manualMessage.trim(),
                          mode: 'text', // Tell agent to respond in text only
                        });

                        // Add to local conversation history
                        handleTranscription(manualMessage, true);
                        setManualMessage('');
                        setIsTyping(false);
                      } catch (error) {
                        console.error('Failed to send text message:', error);
                      }
                    } else {
                      // Fallback if data channel not available
                      handleTranscription(manualMessage, true);
                      setManualMessage('');
                      setIsTyping(false);
                    }
                  }
                }}
              >
                <Ionicons name="send" size={20} color={colors.accent.gold} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isConversationActive}
        >
          {/* Sales summary - hidden during conversation */}
          {!isConversationActive && <SalesSummary sales={MOCK_SAMSUNG_SALES} />}

          <View style={styles.centerContent}>
            {/* Indicateur de rapport en cours - hidden during conversation */}
            {!isConversationActive && dailyReport && (
              <View style={styles.reportStatusBanner}>
                <Text style={styles.reportStatusText}>
                  Rapport en cours • Dernière modification : {new Date(dailyReport.lastModifiedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}

            {/* Voice button - hidden during conversation (replaced by sound wave) */}
            <View style={isConversationActive ? styles.hiddenButton : styles.voiceButtonContainer}>
              <LiveKitVoiceButton
                userName={MOCK_SAMSUNG_SALES.salesRepName}
                eventName={MOCK_SAMSUNG_SALES.eventName}
                existingReport={dailyReport}
                onTranscription={handleTranscription}
                onAgentResponse={handleAgentResponse}
                onConversationComplete={handleConversationComplete}
                onConnectionStateChange={handleConnectionStateChange}
                onAudioStreamsChange={handleAudioStreamsChange}
                onMicrophoneControl={handleMicrophoneControl}
                onDataMessageControl={handleDataMessageControl}
                onDisconnectControl={handleDisconnectControl}
              />
            </View>

            {/* Boutons d'action si un rapport existe - hidden during conversation */}
            {!isConversationActive && dailyReport && (
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

          {/* Tableau des ventes si disponible - hidden during conversation */}
          {!isConversationActive && Object.keys(sales).length > 0 && (
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
                    <Text style={styles.commentText}>
                      {renderMarkdownText(reportText)}
                    </Text>
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
                          const totalSold = Object.values(sales).reduce((sum: number, val: number) => sum + val, 0);
                          const totalObjectives = productsData.products.reduce((sum: number, p: any) => sum + p.target_quantity, 0);
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
                  style={[styles.button, styles.editButton]}
                  onPress={() => {
                    setShowReport(false);
                  }}
                >
                  <Ionicons name="pencil" size={18} color={colors.text.primary} />
                  <Text style={styles.editButtonText}>Modifier</Text>
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
  instructionText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  conversationContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  conversationHistoryWrapper: {
    height: 400,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: 'hidden',
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
  commentTextBold: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
    fontWeight: '700',
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
  editButton: {
    backgroundColor: colors.glass.medium,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  editButtonText: {
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
    marginBottom: spacing.lg / 2,
    marginTop: spacing.xs,
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
  // Immersive conversation mode styles
  soundWaveContainer: {
    position: 'absolute',
    top: 100, // Fixed distance from top (below header ~60px + margin) when conversation shown
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    minHeight: 80, // Minimum space for sound wave
  },
  soundWaveContainerCentered: {
    position: 'absolute',
    top: '50%',
    marginTop: -40, // Half of minHeight for vertical centering
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    minHeight: 80,
  },
  soundWaveContainerAnimated: {
    position: 'absolute',
    // top and marginTop will be animated inline
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    minHeight: 80,
  },
  voiceButtonContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -60, // Adjust based on button height for centering
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundWaveWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  messageIconButton: {
    padding: spacing.sm,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  micCircleButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.dark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent.gold,
    ...shadows.gold,
  },
  conversationOverlay: {
    position: 'absolute',
    // top and bottom will be set dynamically
    left: spacing.md,
    right: spacing.md,
    zIndex: 5,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.lg,
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text.primary,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  hiddenButton: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
  },
});
