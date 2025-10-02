/**
 * Service pour générer des rapports de visite avec Claude API
 */

import { VisitInfo } from '../types';
import { Platform } from 'react-native';

export async function generateReport(transcript: string, visitInfo: VisitInfo): Promise<string> {
  try {
    // On web, use local proxy to bypass CORS
    if (Platform.OS === 'web') {
      const response = await fetch('http://localhost:3001/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          visit: {
            pharmacyName: visitInfo.pharmacyName,
            pharmacistName: visitInfo.pharmacistName,
            date: visitInfo.visitDate,
            address: visitInfo.address || '',
            userName: 'Commercial',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Unknown error');
      }

      const data = await response.json();
      return data.report;
    }

    // On mobile, call Anthropic API directly
    const prompt = `Tu es un assistant pour commerciaux en parapharmacie.

Voici la transcription d'une visite commerciale :
Pharmacie : ${visitInfo.pharmacyName}
Pharmacien : ${visitInfo.pharmacistName}
Date : ${visitInfo.visitDate}
Transcription : "${transcript}"

Génère un rapport de visite structuré et professionnel au format suivant :

📋 RAPPORT DE VISITE

Client : ${visitInfo.pharmacyName}
Contact : ${visitInfo.pharmacistName}
Date : ${visitInfo.visitDate}

🎯 Points clés
[liste à puces des points importants mentionnés]

💬 Produits discutés
[liste à puces des produits/services évoqués]

💡 Insights
[observations intéressantes, besoins exprimés, opportunités]

📅 Prochaines étapes
[actions concrètes à suivre]

Sois concis et factuel. Utilise des puces pour les listes.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Report generation error:', error);
    throw new Error(`Impossible de générer le rapport: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}
