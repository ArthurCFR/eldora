/**
 * Simple proxy server for Claude API to bypass CORS
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/generate-report', async (req, res) => {
  try {
    const { transcript, visit } = req.body;

    // Detect if this is an analysis request based on the transcript content
    const isAnalysisRequest = transcript.includes('Analyse la transcription et extrait les informations');

    let prompt;
    if (isAnalysisRequest) {
      // Use the transcript as-is for analysis requests
      prompt = transcript;
    } else {
      // Generate regular report prompt
      prompt = `Tu es un assistant médical spécialisé dans la rédaction de rapports de visite pharmaceutique.

Informations de la visite :
- Pharmacie : ${visit.pharmacyName}
- Adresse : ${visit.address}
- Date : ${new Date(visit.date).toLocaleDateString('fr-FR')}
- Commercial : ${visit.userName}

Transcription de l'entretien :
${transcript}

Génère un rapport de visite professionnel et structuré en français, incluant :
1. Résumé de la visite
2. Points clés discutés
3. Besoins identifiés
4. Actions à suivre
5. Prochaines étapes

Format le rapport de manière claire et professionnelle.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const report = data.content[0].text;

    res.json({ report });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate report'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
