/**
 * Écran principal de l'application de visite pharmacie
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

import VisitSummary from '../components/VisitSummary';
import VoiceButton from '../components/VoiceButton';
import ReportPreview from '../components/ReportPreview';

import { MOCK_VISIT } from '../constants/mockData';
import { colors } from '../constants/theme';
import { transcribeAudio } from '../services/whisper';
import { generateReport } from '../services/reportGenerator';
import { speakGreeting, askQuestion } from '../services/speech';
import { WebAudioRecorder } from '../services/audioRecorder.web';
import { analyzeTranscript } from '../services/reportAnalyzer';
import { ReportSections } from '../types';

export default function Index() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const webRecorderRef = useRef<WebAudioRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [allTranscripts, setAllTranscripts] = useState<string[]>([]);
  const [reportSections, setReportSections] = useState<ReportSections>({
    productsCount: null,
    timeSpent: null,
    pharmacistComments: null,
    otherInfo: null,
  });
  const [report, setReport] = useState('');
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
            'Cette application a besoin d\'accéder au microphone pour enregistrer vos rapports de visite.'
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
        await speakGreeting(MOCK_VISIT.userName, MOCK_VISIT.pharmacyName);
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

      // Analyser la transcription pour identifier les sections manquantes
      const analysis = await analyzeTranscript(transcribedText, reportSections);
      console.log('Analysis:', analysis);

      // Mettre à jour les sections du rapport
      setReportSections(analysis.sections);

      // Vérifier s'il manque des informations
      const hasNeedMissingInfo = analysis.missingInfo.productsCount ||
                                 analysis.missingInfo.timeSpent ||
                                 analysis.missingInfo.pharmacistComments;

      let shouldContinue = false;
      if (hasNeedMissingInfo && analysis.nextQuestion) {
        // Il manque des informations, poser la question suivante
        console.log('Missing info, asking next question:', analysis.nextQuestion);
        setIsProcessing(false);
        setIsPreparingQuestion(true);
        setConversationStep(conversationStep + 1);
        shouldContinue = true;

        // Attendre un peu avant de poser la prochaine question
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Démarrer le nouvel enregistrement
        await startRecording(analysis.nextQuestion);
        setIsPreparingQuestion(false);
      } else {
        // Toutes les informations sont collectées, générer le rapport final
        console.log('All info collected, generating final report');
        const fullTranscript = allTranscripts.join('\n');
        const generatedReport = await generateFinalReport(analysis.sections);
        setReport(generatedReport);

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

  const generateFinalReport = async (sections: ReportSections): Promise<string> => {
    const reportText = `📋 RAPPORT DE VISITE

Client : ${MOCK_VISIT.pharmacyName}
Contact : ${MOCK_VISIT.pharmacistName}
Date : ${MOCK_VISIT.visitDate}

📦 Produits vendus
${sections.productsCount || 'Non renseigné'}

⏱️ Durée de la visite
${sections.timeSpent || 'Non renseigné'}

💬 Commentaires du pharmacien
${sections.pharmacistComments || 'Non renseigné'}

📝 Informations complémentaires
${sections.otherInfo || 'Aucune information complémentaire'}`;

    return reportText;
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
    setReportSections({
      productsCount: null,
      timeSpent: null,
      pharmacistComments: null,
      otherInfo: null,
    });
    setReport('');
    setConversationStep(0);
    setIsPreparingQuestion(false);
    webRecorderRef.current = null;
  };

  const handleEditReport = () => {
    Alert.alert('Modifier', 'Fonctionnalité à implémenter');
  };

  const handleSendReport = () => {
    Alert.alert('Rapport envoyé', 'Votre rapport de visite a été envoyé avec succès !');
    setShowReport(false);
    // Reset pour une nouvelle visite
    setTranscript('');
    setReport('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <VisitSummary visit={MOCK_VISIT} />

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

        <ReportPreview
          visible={showReport}
          report={report}
          onClose={handleCloseReport}
          onEdit={handleEditReport}
          onSend={handleSendReport}
        />
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
});
