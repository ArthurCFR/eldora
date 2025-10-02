/**
 * Écran vendeur Samsung - Rapport de journée salon
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';

import SalesSummary from '../components/SalesSummary';
import VoiceButton from '../components/VoiceButton';
import SamsungSalesTable from '../components/SamsungSalesTable';

import { MOCK_SAMSUNG_SALES } from '../constants/samsungMockData';
import { colors } from '../constants/theme';
import { transcribeAudio } from '../services/whisper';
import { askQuestion } from '../services/speech';
import { WebAudioRecorder } from '../services/audioRecorder.web';
import { analyzeSamsungSales } from '../services/samsungSalesAnalyzer';
import { Modal, TouchableOpacity } from 'react-native';

export default function SamsungSales() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const webRecorderRef = useRef<WebAudioRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [allTranscripts, setAllTranscripts] = useState<string[]>([]);
  const [sales, setSales] = useState<{ [productName: string]: number }>({});
  const [timeSpent, setTimeSpent] = useState<string | null>(null);
  const [customerFeedback, setCustomerFeedback] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [conversationStep, setConversationStep] = useState(0);
  const [isPreparingQuestion, setIsPreparingQuestion] = useState(false);

  // Demander les permissions audio au démarrage
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission requise',
            'Cette application a besoin d\'accéder au microphone pour enregistrer vos rapports de vente.'
          );
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (error) {
        console.error('Error requesting audio permissions:', error);
      }
    })();
  }, []);

  const startRecording = async (question?: string) => {
    try {
      console.log('Starting recording, step:', conversationStep);
      setIsRecording(true);

      // Poser la question appropriée
      if (question) {
        await askQuestion(question);
      } else if (conversationStep === 0) {
        const greetingText = `Bonjour ${MOCK_SAMSUNG_SALES.salesRepName} ! Quels produits Samsung avez-vous vendus aujourd'hui au ${MOCK_SAMSUNG_SALES.eventName} ?`;
        await askQuestion(greetingText);
      }

      console.log('Question asked, creating recording...');

      if (Platform.OS === 'web') {
        // Use web-specific recorder
        const recorder = new WebAudioRecorder();
        await recorder.start();
        webRecorderRef.current = recorder;
        console.log('Web recorder started and stored in ref');
      } else {
        // Use expo-av for mobile
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        console.log('Recording created:', newRecording);
        setRecording(newRecording);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      Alert.alert(
        'Erreur',
        'Impossible de démarrer l\'enregistrement. Vérifiez les permissions.'
      );
    }
  };

  const stopRecording = async () => {
    console.log('stopRecording called, recording:', recording, 'webRecorder:', webRecorderRef.current);

    if (!recording && !webRecorderRef.current) {
      console.log('No recording object, exiting early');
      return;
    }

    try {
      setIsRecording(false);
      setIsProcessing(true);

      let audioData: string | Blob;

      if (Platform.OS === 'web' && webRecorderRef.current) {
        // Stop web recording and get blob
        const audioBlob = await webRecorderRef.current.stop();
        audioData = audioBlob;
        console.log('Web recording stopped, blob size:', audioBlob.size);
        webRecorderRef.current = null;
      } else if (recording) {
        // Stop mobile recording and get URI
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (!uri) {
          throw new Error('No audio URI');
        }
        audioData = uri;
      } else {
        throw new Error('No recording available');
      }

      // Transcription avec Whisper
      const transcribedText = await transcribeAudio(audioData);
      console.log('Transcription result:', transcribedText);
      setTranscript(transcribedText);
      setAllTranscripts([...allTranscripts, transcribedText]);

      // Analyser la transcription pour identifier les ventes produit par produit
      const analysis = await analyzeSamsungSales(
        transcribedText,
        sales,
        timeSpent,
        customerFeedback
      );
      console.log('Samsung analysis:', analysis);

      // Mettre à jour les ventes et les infos
      setSales(analysis.sales);
      if (analysis.timeSpent) setTimeSpent(analysis.timeSpent);
      if (analysis.customerFeedback) setCustomerFeedback(analysis.customerFeedback);

      if (!analysis.isComplete && analysis.nextQuestion) {
        // Il manque des informations, poser la question suivante
        console.log('Missing info, asking next question:', analysis.nextQuestion);
        setIsProcessing(false);
        setIsPreparingQuestion(true);
        setConversationStep(conversationStep + 1);

        // Attendre un peu avant de poser la prochaine question
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Démarrer le nouvel enregistrement
        await startRecording(analysis.nextQuestion);
        setIsPreparingQuestion(false);
      } else {
        // Toutes les informations sont collectées, afficher le rapport
        console.log('All info collected, showing report');
        setIsProcessing(false);
        setShowReport(true);
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      setIsProcessing(false);
      setIsPreparingQuestion(false);
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Une erreur est survenue lors du traitement.'
      );
    } finally {
      setRecording(null);
      // Ne pas nettoyer webRecorderRef ici car il a été réutilisé pour la question suivante
    }
  };

  const handleVoiceButtonPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCloseReport = () => {
    setShowReport(false);
    // Reset all state for a new visit
    setTranscript('');
    setAllTranscripts([]);
    setSales({});
    setTimeSpent(null);
    setCustomerFeedback(null);
    setConversationStep(0);
    setIsPreparingQuestion(false);
    webRecorderRef.current = null;
  };

  const handleSendReport = () => {
    Alert.alert('Rapport envoyé', 'Votre rapport de vente a été envoyé avec succès !');
    handleCloseReport();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SalesSummary sales={MOCK_SAMSUNG_SALES} />

        <View style={styles.centerContent}>
          <VoiceButton
            isRecording={isRecording}
            isProcessing={isProcessing || isPreparingQuestion}
            onPress={handleVoiceButtonPress}
          />

          {isPreparingQuestion && (
            <Text style={styles.processingText}>
              Préparation de la question suivante...
            </Text>
          )}

          {isRecording && !isPreparingQuestion && (
            <Text style={styles.recordingText}>
              {conversationStep === 0
                ? 'Enregistrement en cours...'
                : `Question ${conversationStep} - Parlez maintenant !`}
            </Text>
          )}

          {isProcessing && !isPreparingQuestion && (
            <Text style={styles.processingText}>
              {conversationStep === 0
                ? 'Analyse de votre réponse...'
                : 'Analyse en cours...'}
            </Text>
          )}

          {!isRecording && !isProcessing && !isPreparingQuestion && (
            <Text style={styles.instructionText}>
              {conversationStep === 0
                ? 'Appuyez sur le bouton pour commencer'
                : 'Écoutez la question, puis cliquez pour répondre'}
            </Text>
          )}
        </View>

        <Modal
          visible={showReport}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseReport}>
                <Text style={styles.closeButton}>✕ Fermer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendReport} style={styles.sendButton}>
                <Text style={styles.sendButtonText}>📤 Envoyer</Text>
              </TouchableOpacity>
            </View>
            <SamsungSalesTable
              sales={sales}
              timeSpent={timeSpent || undefined}
              customerFeedback={customerFeedback || undefined}
            />
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingText: {
    fontSize: 16,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 20,
  },
  processingText: {
    fontSize: 16,
    color: colors.gray[500],
    fontWeight: '600',
    marginTop: 20,
  },
  instructionText: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  closeButton: {
    fontSize: 16,
    color: colors.gray[600],
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
});
