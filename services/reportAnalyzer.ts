/**
 * Service pour analyser les transcriptions et identifier les informations manquantes
 */

import { AnalysisResult } from '../types';

export async function analyzeTranscript(
  transcript: string,
  previousSections?: { productsCount?: string; timeSpent?: string; pharmacistComments?: string; otherInfo?: string }
): Promise<AnalysisResult> {
  try {
    const prompt = `Analyse la transcription et extrait les informations suivantes. Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après.

Transcription actuelle : "${transcript}"
${previousSections ? `\n\nInformations déjà collectées :\n${JSON.stringify(previousSections, null, 2)}` : ''}

Retourne EXACTEMENT ce format JSON (rien d'autre) :
{
  "sections": {
    "productsCount": "nombre exact de produits vendus mentionné (ex: '17 produits'), ou null",
    "timeSpent": "durée exacte de la visite mentionnée (ex: '30 minutes'), ou null",
    "pharmacistComments": "résumé des commentaires du pharmacien sur son activité, ou null",
    "otherInfo": "toutes autres informations pertinentes de la visite, ou null"
  },
  "missingInfo": {
    "productsCount": true,
    "timeSpent": true,
    "pharmacistComments": true
  },
  "nextQuestion": "question naturelle en français pour la première info manquante, ou null"
}

Règles strictes :
1. Réponds UNIQUEMENT avec le JSON (commence par { et termine par })
2. Si une info est dans previousSections, utilise-la
3. Mets true dans missingInfo pour les sections qui manquent
4. nextQuestion doit être conversationnelle (ex: "Combien de produits avez-vous vendu ?")
5. Si toutes les 3 sections obligatoires sont complètes, nextQuestion = null`;

    const response = await fetch('http://localhost:3001/api/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: prompt,
        visit: {
          pharmacyName: 'Analysis',
          pharmacistName: 'System',
          date: new Date().toISOString(),
          address: '',
          userName: 'Assistant',
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze transcript');
    }

    const data = await response.json();
    let jsonText = data.report.trim();

    console.log('Raw response:', jsonText);

    // Extract JSON from markdown code blocks if present
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    // Try to find JSON object in the text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    console.log('Extracted JSON:', jsonText);

    const result: AnalysisResult = JSON.parse(jsonText);

    // Merge with previous sections if provided
    if (previousSections) {
      result.sections.productsCount = result.sections.productsCount || previousSections.productsCount || null;
      result.sections.timeSpent = result.sections.timeSpent || previousSections.timeSpent || null;
      result.sections.pharmacistComments = result.sections.pharmacistComments || previousSections.pharmacistComments || null;
      result.sections.otherInfo = result.sections.otherInfo || previousSections.otherInfo || null;

      // Update missing info based on merged sections
      result.missingInfo.productsCount = !result.sections.productsCount;
      result.missingInfo.timeSpent = !result.sections.timeSpent;
      result.missingInfo.pharmacistComments = !result.sections.pharmacistComments;
    }

    console.log('Analysis result:', result);
    return result;
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    throw error;
  }
}
