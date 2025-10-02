/**
 * Service pour analyser les ventes Samsung produit par produit
 */

import { SamsungSalesAnalysis } from '../types';
import productsData from '../produits.json';

const PRODUCTS = productsData.map(p => p.nom);

export async function analyzeSamsungSales(
  transcript: string,
  previousSales?: { [productName: string]: number },
  previousTimeSpent?: string | null,
  previousFeedback?: string | null
): Promise<SamsungSalesAnalysis> {
  try {
    const productsList = PRODUCTS.join(', ');

    const prompt = `Analyse la transcription d'un vendeur Samsung. Tu dois répondre UNIQUEMENT avec un objet JSON valide.

Produits Samsung disponibles : ${productsList}

Transcription actuelle : "${transcript}"
${previousSales ? `\n\nVentes déjà enregistrées :\n${JSON.stringify(previousSales, null, 2)}` : ''}
${previousFeedback ? `\n\nRetours déjà renseignés : ${previousFeedback}` : ''}

Retourne EXACTEMENT ce format JSON :
{
  "sales": {
    "Samsung Galaxy Z Nova": 0,
    "Samsung QLED Vision 8K": 0,
    ...pour chaque produit...
  },
  "timeSpent": null,
  "customerFeedback": "résumé des retours/remarques clients, événements particuliers, ou null",
  "nextQuestion": "question pour obtenir l'info manquante ou null",
  "isComplete": true/false
}

Règles IMPORTANTES :
1. Réponds UNIQUEMENT avec le JSON
2. Dans "sales", mets le nombre vendu UNIQUEMENT pour les produits MENTIONNÉS dans la transcription
3. Si un produit N'EST PAS mentionné, mets 0 (le vendeur n'en a pas vendu, c'est normal)
4. NE JAMAIS demander "combien de X avez-vous vendu" pour un produit non mentionné
5. timeSpent : TOUJOURS null (on ne demande pas la durée)
6. customerFeedback : synthèse des remarques clients, retours, événements particuliers
7. nextQuestion : UNIQUEMENT si customerFeedback est null, poser : "As-tu d'autres informations importantes sur ta journée sur le salon ? Des remarques clients, des événements particuliers ?"
8. isComplete = true si customerFeedback est renseigné (même vide), false sinon`;

    const response = await fetch('http://localhost:3001/api/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: prompt,
        visit: {
          pharmacyName: 'Samsung Sales Analysis',
          pharmacistName: 'System',
          date: new Date().toISOString(),
          address: '',
          userName: 'Assistant',
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze Samsung sales');
    }

    const data = await response.json();
    let jsonText = data.report.trim();

    console.log('Raw Samsung response:', jsonText);

    // Extract JSON
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    console.log('Extracted Samsung JSON:', jsonText);

    const result: SamsungSalesAnalysis = JSON.parse(jsonText);

    // Merge with previous data
    if (previousSales) {
      result.sales = { ...previousSales, ...result.sales };
    }
    if (previousTimeSpent) {
      result.timeSpent = result.timeSpent || previousTimeSpent;
    }
    if (previousFeedback) {
      result.customerFeedback = result.customerFeedback || previousFeedback;
    }

    // Ensure all products are present
    PRODUCTS.forEach(productName => {
      if (!(productName in result.sales)) {
        result.sales[productName] = 0;
      }
    });

    console.log('Samsung analysis result:', result);
    return result;
  } catch (error) {
    console.error('Error analyzing Samsung sales:', error);
    throw error;
  }
}
