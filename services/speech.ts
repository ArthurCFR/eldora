/**
 * Service pour la synthèse vocale avec Expo Speech
 */

import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

// Configuration de voix améliorée pour un rendu plus naturel
const VOICE_CONFIG = {
  language: 'fr-FR',
  pitch: 0.95, // Légèrement plus grave pour un ton plus naturel
  rate: 0.85, // Plus lent pour une meilleure compréhension
  voice: Platform.OS === 'ios' ? 'com.apple.voice.compact.fr-FR.Thomas' : undefined, // Voix Thomas sur iOS
};

async function speak(text: string): Promise<void> {
  console.log('Speech: Speaking:', text);

  // On web, expo-speech callbacks don't fire reliably, so we don't wait
  if (Platform.OS === 'web') {
    Speech.speak(text, VOICE_CONFIG);
    console.log('Speech: Started (web, not waiting)');
    // Wait based on text length for a more natural pause
    const estimatedDuration = (text.length / 12) * 1000; // ~12 chars per second
    await new Promise(resolve => setTimeout(resolve, Math.min(estimatedDuration, 3000)));
    return;
  }

  return new Promise((resolve) => {
    Speech.speak(text, {
      ...VOICE_CONFIG,
      onDone: () => {
        console.log('Speech: Done');
        resolve();
      },
      onError: (error) => {
        console.log('Speech: Error', error);
        resolve();
      },
    });
  });
}

export async function speakGreeting(userName: string, pharmacyName: string): Promise<void> {
  const text = `Bonjour ${userName} ! Racontez-moi comment s'est passée votre visite à la pharmacie ${pharmacyName}.`;
  return speak(text);
}

export async function askQuestion(question: string): Promise<void> {
  return speak(question);
}

export function stopSpeaking(): void {
  Speech.stop();
}
