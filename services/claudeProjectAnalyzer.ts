/**
 * Claude Project Analyzer
 * Uses Claude API to analyze project description and generate configuration
 */

import { AttentionPoint } from '../types/project';

const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL || 'http://172.28.191.115:3001';

interface AnalysisResult {
  attentionPoints: AttentionPoint[];
  conversationStyle: string;
  userFacingDescription: string; // Description courte pour l'utilisateur final
  reportTemplate: {
    sections: string[];
  };
  suggestions: string[];
}

/**
 * Analyze project with Claude and generate suggested configuration
 */
export async function analyzeProjectWithClaude(
  projectName: string,
  description: string,
  productsData?: any[]
): Promise<AnalysisResult> {
  try {
    // Build prompt for Claude
    const prompt = buildAnalysisPrompt(projectName, description, productsData);

    // Call Claude via proxy
    const response = await fetch(`${PROXY_URL}/api/claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze project');
    }

    const data = await response.json();
    const analysisText = data.content[0].text;

    // Parse Claude's response
    return parseClaudeAnalysis(analysisText);
  } catch (error) {
    console.error('Error analyzing project with Claude:', error);
    throw error;
  }
}

/**
 * Build the analysis prompt for Claude
 */
function buildAnalysisPrompt(
  projectName: string,
  description: string,
  productsData?: any[]
): string {
  let prompt = `Tu es un expert en conception d'assistants conversationnels pour les commerciaux.

**Contexte du projet :**
Nom : ${projectName}
Description : ${description}

`;

  if (productsData && productsData.length > 0) {
    prompt += `**Produits/Catalogue :**
${JSON.stringify(productsData.slice(0, 5), null, 2)}
${productsData.length > 5 ? `... et ${productsData.length - 5} autres produits` : ''}

`;
  }

  prompt += `**Ta mission :**
Analyse ce projet et propose une configuration optimale pour un assistant vocal qui aidera les commerciaux à créer des rapports.

**Tu dois générer (en JSON strict) :**
1. **attentionPoints** : 3-6 points d'attention clés que l'assistant doit aborder dans la conversation
   - Chaque point doit avoir : id, description, priority ("high"/"medium"/"low"), naturalPrompts (array)
   - Les naturalPrompts sont des questions ORALES naturelles et personnelles, adaptées à une conversation vocale
   - Exemples de points : ventes, retours clients, concurrence, profil clients, etc.

2. **conversationStyle** : Le style de conversation approprié (ex: "professional_warm", "friendly_colleague", "formal_business")

3. **userFacingDescription** : Description COURTE (2 phrases maximum) pour l'utilisateur final
   - Explique simplement à quoi sert cet assistant vocal
   - Ton chaleureux et encourageant
   - Évite le jargon technique
   - Exemple : "Je t'aide à créer ton rapport de journée en quelques minutes. Raconte-moi simplement ta journée, je m'occupe du reste !"

4. **reportTemplate** : OBJET contenant les sections du rapport
   - Format OBLIGATOIRE : { "sections": ["section1", "section2", ...] }
   - Exemples de sections : "summary", "sales", "feedback", "insights", "next_steps"

5. **suggestions** : 2-3 suggestions pour optimiser l'utilisation de l'assistant

**IMPORTANT pour les naturalPrompts :**
- Les questions doivent être ORALES, naturelles, comme si tu parlais à un collègue après sa journée
- Utilise le tutoiement et un ton chaleureux
- Évite les formulations trop techniques ou formelles
- Personnalise avec le contexte métier (ex: "Tu as pu voir la DRH de cette boîte?" au lieu de "Parle-moi des opportunités B2B")
- Les questions doivent être courtes (10-15 mots max)

**Exemples de MAUVAISES questions (trop formelles/techniques) :**
❌ "Parle-moi de détail des opportunités B2B/B2C"
❌ "Décris le profil des clients rencontrés"
❌ "Quels sont les problèmes techniques rencontrés"

**Exemples de BONNES questions (orales naturelles) :**
✅ "Tu as eu des belles opportunités aujourd'hui ?"
✅ "T'as rencontré quel type de clients ?"
✅ "Tout s'est bien passé au niveau matos ?"

**Format de réponse (JSON strict, rien d'autre) :**
\`\`\`json
{
  "attentionPoints": [
    {
      "id": "sales_tracking",
      "description": "Produits vendus avec quantités et prix",
      "priority": "high",
      "naturalPrompts": [
        "Qu'est-ce que tu as vendu aujourd'hui ?",
        "Tu as fait combien de ventes ?"
      ]
    },
    {
      "id": "opportunities",
      "description": "Opportunités B2B et B2C détectées",
      "priority": "high",
      "naturalPrompts": [
        "Tu as eu des belles opportunités aujourd'hui ?",
        "T'as détecté des gros coups à suivre ?"
      ]
    }
  ],
  "conversationStyle": "professional_warm",
  "userFacingDescription": "Je t'aide à créer ton rapport de journée en quelques minutes. Raconte-moi simplement ta journée, je m'occupe du reste !",
  "reportTemplate": {
    "sections": ["summary", "sales", "feedback", "insights"]
  },
  "suggestions": [
    "Demander systématiquement les quantités exactes pour chaque produit",
    "Noter les retours clients spontanés en plus des questions directes"
  ]
}
\`\`\`

Génère maintenant la configuration pour ce projet.`;

  return prompt;
}

/**
 * Parse Claude's JSON response
 */
function parseClaudeAnalysis(analysisText: string): AnalysisResult {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) ||
                      analysisText.match(/```\n([\s\S]*?)\n```/) ||
                      [null, analysisText];

    const jsonText = jsonMatch[1] || analysisText;
    const parsed = JSON.parse(jsonText.trim());

    // Validate structure
    if (!parsed.attentionPoints || !Array.isArray(parsed.attentionPoints)) {
      throw new Error('Invalid response: missing attentionPoints');
    }

    if (!parsed.conversationStyle) {
      throw new Error('Invalid response: missing conversationStyle');
    }

    // Normalize reportTemplate - handle both formats
    let reportTemplate;
    if (parsed.reportTemplate) {
      if (Array.isArray(parsed.reportTemplate)) {
        // Claude returned an array instead of object - normalize it
        reportTemplate = { sections: parsed.reportTemplate };
      } else if (parsed.reportTemplate.sections) {
        // Correct format
        reportTemplate = parsed.reportTemplate;
      } else {
        throw new Error('Invalid response: reportTemplate missing sections');
      }
    } else {
      throw new Error('Invalid response: missing reportTemplate');
    }

    return {
      attentionPoints: parsed.attentionPoints,
      conversationStyle: parsed.conversationStyle,
      userFacingDescription: parsed.userFacingDescription || "Je t'aide à créer ton rapport en quelques minutes. Raconte-moi ta journée !",
      reportTemplate: reportTemplate,
      suggestions: parsed.suggestions || [],
    };
  } catch (error) {
    console.error('Failed to parse Claude analysis:', error);
    console.error('Raw response:', analysisText);

    // Return fallback configuration
    return {
      attentionPoints: [
        {
          id: 'general_info',
          description: 'Informations générales collectées',
          priority: 'high',
        },
        {
          id: 'feedback',
          description: 'Retours et commentaires',
          priority: 'medium',
        },
      ],
      conversationStyle: 'professional_warm',
      userFacingDescription: "Je t'aide à créer ton rapport en quelques minutes. Raconte-moi ta journée !",
      reportTemplate: {
        sections: ['summary', 'details', 'insights'],
      },
      suggestions: [
        'Configuration générée automatiquement - personnalisez selon vos besoins',
      ],
    };
  }
}
