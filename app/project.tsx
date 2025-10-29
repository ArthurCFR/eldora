/**
 * Écran projet - Rapport de journée
 * V2: Utilise LiveKit pour conversation en temps réel
 * Fonctionne dynamiquement avec n'importe quel projet
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
import ProductSalesTable from '../components/ProductSalesTable';
import ReportModal from '../components/ReportModal';
import ReportHistoryModal from '../components/ReportHistoryModal';
import Header from '../components/Header';
import ConversationHistory, { Message } from '../components/ConversationHistory';
import SoundWaveBar from '../components/SoundWaveBar';
import CatalogueModal from '../components/CatalogueModal';
import { useApp } from '../contexts/AppContext';
import { getProject } from '../services/projectService';
import { Project } from '../types/project';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';
import {
  DailyReport,
  loadTodayReport,
  createReport,
  updateReport,
  sendReport,
  deleteTodayReport,
} from '../services/dailyReportService';
import {
  getReportByDate,
  saveReportForDate,
  sendReportByDate,
  deleteReportByDate,
  ReportByDate,
} from '../services/reportsByDateService';

export default function ProjectScreen() {
  const { userName, justLoggedIn, currentProjectId, logout } = useApp();
  const [project, setProject] = useState<Project | null>(null);
  const [projectProducts, setProjectProducts] = useState<any[]>([]);
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
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  const [showReportHistoryModal, setShowReportHistoryModal] = useState(false);

  // Render products as markdown table
  const renderCatalogueMarkdown = () => {
    if (!project?.products || project.products.length === 0) {
      return 'Aucun produit disponible.';
    }

    const products = project.products;
    const columns = Object.keys(products[0]);

    // Header
    let markdown = '| ' + columns.join(' | ') + ' |\n';
    markdown += '|' + columns.map(() => '---').join('|') + '|\n';

    // Rows
    products.forEach(product => {
      markdown += '| ' + columns.map(col => {
        const value = product[col];
        return value !== null && value !== undefined ? String(value) : '';
      }).join(' | ') + ' |\n';
    });

    return markdown;
  };

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
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Helper to format Date to YYYY-MM-DD in local timezone (no UTC conversion)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Selected date from calendar - defaults to today
  const [selectedReportDate, setSelectedReportDate] = useState<string>(
    formatDateLocal(new Date())
  );

  // Charger le projet au montage
  useEffect(() => {
    const loadProjectData = async () => {
      if (!currentProjectId) {
        console.error('No project selected');
        setIsLoadingProject(false);
        return;
      }

      try {
        const projectData = await getProject(currentProjectId);
        setProject(projectData);
        console.log('✅ Loaded project:', projectData.name);

        // Charger les produits du projet s'ils existent
        if (projectData.products && projectData.products.length > 0) {
          setProjectProducts(projectData.products);
          console.log('✅ Loaded project products:', projectData.products.length);
        } else {
          console.log('⚠️ No products found for this project');
          setProjectProducts([]);
        }
      } catch (error) {
        console.error('Error loading project:', error);
        Alert.alert('Erreur', 'Impossible de charger le projet');
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProjectData();
  }, [currentProjectId]);

  // Charger le rapport pour la date sélectionnée
  useEffect(() => {
    if (project && userName && currentProjectId) {
      loadReportForSelectedDate();
    }
  }, [project, userName, currentProjectId, selectedReportDate]);

  const loadReportForSelectedDate = async () => {
    if (!userName || !currentProjectId) return;

    try {
      // Try loading from backend first
      const backendReport = await getReportByDate(currentProjectId, selectedReportDate, userName);
      if (backendReport) {
        console.log('📄 Found existing report for', selectedReportDate, 'from backend');

        // Convert to DailyReport format
        const dailyReportData: DailyReport = {
          id: backendReport.id,
          salesRepName: backendReport.userName,
          eventName: backendReport.eventName,
          date: backendReport.date,
          createdAt: backendReport.createdAt,
          lastModifiedAt: backendReport.updatedAt,
          sales: backendReport.sales,
          salesAmounts: backendReport.salesAmounts,
          totalAmount: backendReport.totalAmount,
          customerFeedback: backendReport.customerFeedback,
          keyInsights: backendReport.keyInsights,
          emotionalContext: backendReport.emotionalContext || '',
          conversationHistory: [],
          status: backendReport.sentAt ? 'sent' : 'draft',
        };

        setDailyReport(dailyReportData);
        setIsEditMode(true);
        setSales(backendReport.sales);
        setCustomerFeedback(backendReport.customerFeedback);

        const comment = generateCommentSection({
          key_insights: backendReport.keyInsights,
          emotional_context: backendReport.emotionalContext || '',
        }, backendReport.customerFeedback);
        setReportText(comment);
      } else {
        console.log('📄 No report found for', selectedReportDate);
        // Clear existing report
        setDailyReport(null);
        setIsEditMode(false);
        setSales({});
        setCustomerFeedback('');
        setReportText('');
      }
    } catch (error) {
      console.error('Error loading report for selected date:', error);
      // Fallback: clear state
      setDailyReport(null);
      setIsEditMode(false);
    }
  };

  const handleConversationComplete = async (data: any) => {
    // Quand la conversation est terminée, créer ou mettre à jour le rapport
    console.log('Conversation complete, data:', data);

    // Afficher immédiatement le modal en état de chargement
    setIsLoadingReport(true);
    setShowReport(true);

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
          salesAmounts: data.sales_amounts || {},
          totalAmount: data.total_amount || 0,
          customerFeedback: parsedFeedback,
          keyInsights: parsedInsights,
          emotionalContext: parsedEmotionalContext,
        });
      } else {
        // MODE CRÉATION : Créer un nouveau rapport
        console.log('📝 Creating new report');
        updatedReport = await createReport(
          userName || 'Utilisateur',
          project?.name || 'Projet',
          {
            sales: parsedSales,
            salesAmounts: data.sales_amounts || {},
            totalAmount: data.total_amount || 0,
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

      // Save to backend with selected date
      if (currentProjectId) {
        try {
          console.log('💾 Saving report to backend for date:', selectedReportDate);
          await saveReportForDate(
            currentProjectId,
            selectedReportDate,
            {
              userName: userName || 'Utilisateur',
              eventName: project?.name || 'Projet',
              sales: updatedReport.sales,
              salesAmounts: data.sales_amounts || {},
              totalAmount: data.total_amount || 0,
              customerFeedback: updatedReport.customerFeedback,
              keyInsights: updatedReport.keyInsights,
              emotionalContext: updatedReport.emotionalContext || null,
            }
          );
          console.log('✅ Report saved to backend successfully');
        } catch (error) {
          console.error('Error saving to backend:', error);
          // Don't fail the whole operation if backend save fails
        }
      }

      // Generate comment section
      const comment = generateCommentSection({
        key_insights: updatedReport.keyInsights,
        emotional_context: updatedReport.emotionalContext,
      }, updatedReport.customerFeedback);
      setReportText(comment);

      // Fin du chargement - le rapport est prêt
      setIsLoadingReport(false);
    } catch (error) {
      console.error('Error saving report:', error);
      setIsLoadingReport(false);
      setShowReport(false);
      Alert.alert('Erreur', 'Impossible de sauvegarder le rapport');
    }
  };

  // Helper to parse YYYY-MM-DD string to Date in local timezone (no UTC conversion)
  const parseDateLocal = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
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

  // Calculate report period display based on selected date
  const getReportPeriodDisplay = (): string | null => {
    if (!project?.settings?.reportScheduleType || project.settings.reportScheduleType !== 'fixed') {
      return null; // Per-appointment mode doesn't show period
    }

    const frequency = project.settings.reportFrequency;
    const selectedDate = parseDateLocal(selectedReportDate);

    switch (frequency) {
      case 'daily':
        return selectedDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

      case 'weekly': {
        // Get start of week (Monday) for selected date
        const current = new Date(selectedDate);
        const dayOfWeek = current.getDay();
        const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(current);
        monday.setDate(diff);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return `Semaine du ${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      }

      case 'biweekly': {
        // Get start of current 2-week period for selected date
        const current = new Date(selectedDate);
        const dayOfWeek = current.getDay();
        const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(current);
        startOfWeek.setDate(diff);
        const end = new Date(startOfWeek);
        end.setDate(startOfWeek.getDate() + 13);

        return `Période du ${startOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      }

      case 'monthly':
        return selectedDate.toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric'
        });

      default:
        return null;
    }
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setIsLoadingReport(false);
    // Don't clear data - keep it for potential re-viewing
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
              // Send to local storage
              await sendReport(dailyReport);

              // Also send to backend if we have a project ID
              if (currentProjectId) {
                try {
                  // Get the report from backend by date to get its ID
                  const backendReport = await getReportByDate(currentProjectId, selectedReportDate, userName);
                  if (backendReport) {
                    await sendReportByDate(currentProjectId, backendReport.id);
                    console.log('✅ Report marked as sent in backend');
                  }
                } catch (error) {
                  console.error('Error sending report to backend:', error);
                  // Don't fail if backend send fails
                }
              }

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

      const success = await deleteTodayReport(userName || 'Utilisateur');
      console.log('🗑️ deleteTodayReport result:', success);

      // Also delete from backend
      if (currentProjectId && selectedReportDate && userName) {
        try {
          await deleteReportByDate(currentProjectId, selectedReportDate, userName);
          console.log('✅ Report deleted from backend');
        } catch (error) {
          console.error('Error deleting from backend:', error);
          // Don't fail if backend delete fails
        }
      }

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

  // Show loading state while project is loading
  if (isLoadingProject) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <View style={styles.mainContentContainer}>
            <Text style={styles.loadingText}>Chargement du projet...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Show error if no project
  if (!project) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <View style={styles.mainContentContainer}>
            <Text style={styles.errorText}>Aucun projet sélectionné</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />

        {/* Header - always visible */}
        <Header
          agentName={userName || 'Utilisateur'}
          animated={justLoggedIn}
          showBackButton={true}
          onBackPress={() => {
            // Confirmation avant déconnexion
            if (Platform.OS === 'web') {
              const confirmed = window.confirm('Voulez-vous vous déconnecter ?');
              if (confirmed) {
                logout();
              }
            } else {
              Alert.alert(
                'Déconnexion',
                'Voulez-vous vous déconnecter ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Déconnecter', onPress: () => logout() }
                ]
              );
            }
          }}
        />

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

              {/* Catalogue button - shown only if project has products */}
              {project?.hasProductsTable && project?.products && project.products.length > 0 && (
                <TouchableOpacity
                  style={styles.catalogueButton}
                  onPress={() => setShowCatalogueModal(true)}
                >
                  <Ionicons name="book-outline" size={20} color={colors.text.primary} />
                  <Text style={styles.catalogueButtonText}>Catalogue</Text>
                </TouchableOpacity>
              )}
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
                style={styles.sendTextButton}
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
          {/* Calendar button - visible when not in conversation and in fixed schedule mode */}
          {!isConversationActive && project?.settings?.reportScheduleType === 'fixed' && project?.startDate && (
            <View style={styles.calendarButtonContainer}>
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={() => setShowReportHistoryModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={24} color={colors.accent.gold} />
                <Text style={styles.calendarButtonText}>Historique des rapports</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Project description - shown only when NO report exists */}
          {!isConversationActive && !dailyReport && (project.userFacingDescription || project.description) && (
            <View style={styles.projectDescriptionSection}>
              <Text style={styles.projectDescriptionTitle}>
                Mission de cet agent intelligent
              </Text>
              <View style={styles.projectDescriptionBanner}>
                <Text style={styles.projectDescriptionText}>
                  {project.userFacingDescription || project.description}
                </Text>
              </View>
            </View>
          )}

          {/* Indicateur de rapport en cours ou envoyé - hidden during conversation */}
          {!isConversationActive && dailyReport && (
            <View style={[
              styles.reportStatusBanner,
              dailyReport.status === 'sent' && styles.reportStatusBannerSent
            ]}>
              {dailyReport.status === 'sent' ? (
                <View style={styles.reportStatusRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.reportStatusText}>
                    Rapport envoyé • {new Date(dailyReport.lastModifiedAt).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              ) : (
                <Text style={styles.reportStatusText}>
                  Rapport en cours • Dernière modification : {new Date(dailyReport.lastModifiedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          )}

          {/* Voice button - centered and always visible when not in conversation */}
          <View style={styles.mainContentContainer}>
            {/* Report period banner - shown before starting conversation */}
            {!isConversationActive && (() => {
              const periodDisplay = getReportPeriodDisplay();
              return periodDisplay ? (
                <View style={styles.reportPeriodBanner}>
                  <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
                  <Text style={styles.reportPeriodText}>{periodDisplay}</Text>
                </View>
              ) : null;
            })()}

            {/* Show voice button only if report is not sent */}
            {dailyReport?.status !== 'sent' && (
              <View style={isConversationActive ? styles.hiddenButton : styles.voiceButtonWrapper}>
                <LiveKitVoiceButton
                  userName={userName || 'Utilisateur'}
                  projectId={currentProjectId || undefined}
                  eventName={project?.name || 'Projet'}
                  existingReport={dailyReport}
                  onTranscription={handleTranscription}
                  onAgentResponse={handleAgentResponse}
                  onConversationComplete={handleConversationComplete}
                  onGeneratingReport={() => {
                    // Ouvrir le modal immédiatement en mode chargement
                    console.log('🎬 Opening report modal in loading state...');
                    setIsLoadingReport(true);
                    setShowReport(true);
                  }}
                  onConnectionStateChange={handleConnectionStateChange}
                  onAudioStreamsChange={handleAudioStreamsChange}
                  onMicrophoneControl={handleMicrophoneControl}
                  onDataMessageControl={handleDataMessageControl}
                  onDisconnectControl={handleDisconnectControl}
                />
              </View>
            )}

            {/* Message for sent reports */}
            {!isConversationActive && dailyReport?.status === 'sent' && (
              <View style={styles.sentReportMessage}>
                <Ionicons name="lock-closed" size={32} color={colors.success} />
                <Text style={styles.sentReportMessageTitle}>Rapport finalisé et envoyé</Text>
                <Text style={styles.sentReportMessageText}>
                  Ce rapport a été validé et ne peut plus être modifié.
                </Text>
              </View>
            )}

            {/* Boutons d'action si un rapport existe - hidden during conversation */}
            {!isConversationActive && dailyReport && (
              <View style={styles.compactActionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.compactViewReportButton,
                    dailyReport.status === 'sent' && styles.compactViewReportButtonFull
                  ]}
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
                  <Ionicons name="document-text" size={20} color={colors.text.onDark} />
                  <Text style={styles.compactButtonText}>Voir le rapport</Text>
                </TouchableOpacity>

                {/* Only show send and delete buttons if report is not sent */}
                {(!dailyReport.status || dailyReport.status !== 'sent') && (
                  <>
                    <TouchableOpacity
                      style={styles.compactSendButton}
                      onPress={handleSendReport}
                    >
                      <Ionicons name="send" size={16} color={colors.text.primary} />
                      <Text style={styles.compactSendButtonText}>Envoyer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.compactDeleteButton}
                      onPress={() => {
                        console.log('🗑️ TouchableOpacity pressed');
                        handleDeleteReport();
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.accent.danger} />
                      <Text style={styles.compactDeleteButtonText}>Supprimer</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Modal de rapport - Modern version */}
        <ReportModal
          visible={showReport}
          onClose={handleCloseReport}
          onEdit={() => setShowReport(false)}
          onSend={handleSendReport}
          isLoading={isLoadingReport}
          projectName={project?.name}
          userName={userName || undefined}
          reportText={reportText}
          sales={sales}
          products={projectProducts}
          reportData={reportData}
          reportConfiguration={project?.reportTemplate?.configuration}
          reportStatus={dailyReport?.status}
        />

        {/* Modal Catalogue */}
        <CatalogueModal
          visible={showCatalogueModal}
          onClose={() => setShowCatalogueModal(false)}
          products={project?.products || []}
          projectName={project?.name || 'Projet'}
        />

        {/* Modal Historique des rapports */}
        <ReportHistoryModal
          visible={showReportHistoryModal}
          onClose={() => setShowReportHistoryModal(false)}
          projectId={currentProjectId || ''}
          projectName={project?.name || 'Projet'}
          userName={userName || ''}
          startDate={project?.startDate}
          frequency={project?.settings?.reportFrequency}
          reportScheduleType={project?.settings?.reportScheduleType || 'fixed'}
          onViewReport={async (reportId: string, date: string) => {
            try {
              console.log('📄 Loading report:', reportId, date);

              // Set selected date
              setSelectedReportDate(date);

              // Load report from backend
              const report = await getReportByDate(currentProjectId || '', date, userName || '');
              if (report) {
                // Convert ReportByDate to DailyReport format
                const dailyReportData: DailyReport = {
                  id: report.id,
                  salesRepName: report.userName,
                  eventName: report.eventName,
                  date: report.date,
                  createdAt: report.createdAt,
                  lastModifiedAt: report.updatedAt,
                  sales: report.sales,
                  salesAmounts: report.salesAmounts,
                  totalAmount: report.totalAmount,
                  customerFeedback: report.customerFeedback,
                  keyInsights: report.keyInsights,
                  emotionalContext: report.emotionalContext || '',
                  conversationHistory: [],
                  status: report.sentAt ? 'sent' : 'draft',
                };

                setDailyReport(dailyReportData);
                setIsEditMode(true);
                setSales(report.sales);
                setCustomerFeedback(report.customerFeedback);

                // Generate comment section for display
                const comment = generateCommentSection({
                  key_insights: report.keyInsights,
                  emotional_context: report.emotionalContext || '',
                }, report.customerFeedback);
                setReportText(comment);

                // Show report modal
                setShowReport(true);
              }

              // Close history modal
              setShowReportHistoryModal(false);
            } catch (error) {
              console.error('Error loading report:', error);
              Alert.alert('Erreur', 'Impossible de charger le rapport');
            }
          }}
          onCreateReport={(date: string) => {
            console.log('📝 Creating report for date:', date);

            // Set selected date
            setSelectedReportDate(date);

            // Close history modal
            setShowReportHistoryModal(false);

            // Clear any existing report so user can create a new one
            setDailyReport(null);
            setIsEditMode(false);
            setSales({});
            setCustomerFeedback('');
            setReportText('');

            // User can now click the voice button to start creating the report for this date
          }}
        />
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
  mainContentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    minHeight: 400,
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
  projectDescriptionSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  projectDescriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  projectDescriptionBanner: {
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  projectDescriptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  reportStatusBanner: {
    backgroundColor: 'rgba(255, 209, 102, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  reportStatusBannerSent: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: colors.success,
  },
  reportStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  reportStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  sentReportMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.lg,
  },
  sentReportMessageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  sentReportMessageText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  reportPeriodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    marginBottom: spacing.lg,
    ...shadows.gold,
  },
  reportPeriodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  reportPeriodTopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent.gold,
  },
  reportPeriodTopText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  voiceButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  // New compact actions layout
  compactActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  compactViewReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.dark,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  compactViewReportButtonFull: {
    flex: 1,
  },
  compactSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.gold,
  },
  compactDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent.danger,
  },
  compactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.onDark,
  },
  compactSendButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  compactDeleteButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.accent.danger,
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
  sendTextButton: {
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
  projectBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  projectBannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  projectBannerDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.accent.danger,
    textAlign: 'center',
  },
  catalogueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    marginTop: spacing.sm,
    ...shadows.gold,
  },
  catalogueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  calendarButtonContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    ...shadows.gold,
    minWidth: 200,
  },
  calendarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
