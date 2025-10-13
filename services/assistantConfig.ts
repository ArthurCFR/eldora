/**
 * Service de gestion de la configuration de l'assistant vocal
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AttentionPoint {
  id: string; // Généré automatiquement
  description: string; // La phrase décrivant le point d'attention
  naturalPrompts?: string[]; // Questions optionnelles
  priority: 'high' | 'medium' | 'low';
}

export interface AssistantConfig {
  conversationStyle: 'friendly_colleague' | 'professional_warm' | 'coach_motivating' | 'casual_relaxed';
  attentionPoints: AttentionPoint[];
}

// Backward compatibility type
export interface RequiredField {
  field: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  naturalPrompts: string[];
}

const CONFIG_STORAGE_KEY = '@assistant_config';

// Configuration par défaut
const DEFAULT_CONFIG: AssistantConfig = {
  conversationStyle: 'friendly_colleague',
  attentionPoints: [
    {
      id: 'default_sales',
      description: 'Produits vendus avec quantités',
      priority: 'high',
      naturalPrompts: [
        'Alors, raconte-moi ta journée ! Comment ça s\'est passé sur le stand ?',
        'Hey ! J\'espère que ça a bien roulé aujourd\'hui ! Tu as fait quoi comme ventes ?',
        'Salut ! J\'ai hâte d\'entendre comment ça s\'est passé ! Tu as vendu quoi aujourd\'hui ?',
        'Comment ça s\'est passé ? Tu as eu du monde sur le stand ?',
      ],
    },
    {
      id: 'default_feedback',
      description: 'Retours clients',
      priority: 'medium',
      naturalPrompts: [
        'Et au niveau des clients, ils avaient quoi comme retours ? Des questions particulières ?',
        'Est-ce qu\'il y a eu des remarques intéressantes ? Des trucs qui t\'ont marqué ?',
        'Comment étaient les visiteurs ? Ils cherchaient quoi en général ?',
        'Tu as eu des conversations intéressantes ? Des choses à remonter au manager ?',
      ],
    },
  ],
};

/**
 * Charge la configuration de l'assistant depuis le stockage
 */
export async function loadAssistantConfig(): Promise<AssistantConfig> {
  try {
    const stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error loading assistant config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Sauvegarde la configuration de l'assistant
 */
export async function saveAssistantConfig(config: AssistantConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    console.log('Assistant config saved successfully');
  } catch (error) {
    console.error('Error saving assistant config:', error);
    throw error;
  }
}

/**
 * Récupère le prompt système pour l'IA conversationnelle basé sur la config
 */
/**
 * Convertit attentionPoints en requiredFields pour compatibilité
 */
export function attentionPointsToRequiredFields(points: AttentionPoint[]): RequiredField[] {
  return points.map(point => ({
    field: point.id.replace('default_', '').replace(/\s+/g, '_').toLowerCase(),
    description: point.description,
    priority: point.priority,
    naturalPrompts: point.naturalPrompts || [],
  }));
}

export function getConversationSystemPrompt(config: AssistantConfig): string {
  const styleDescriptions = {
    friendly_colleague: `Tu es un collègue bienveillant qui s'intéresse vraiment à la journée de ton ami. Tu tutoies naturellement,
    tu utilises des expressions authentiques ("Ah ouais ?", "Sérieux ?", "Top !", "Pas mal !"). Tu réagis avec empathie aux émotions.
    Tu es curieux des détails intéressants sans être intrusif.`,

    professional_warm: `Tu es un assistant professionnel chaleureux et attentif. Tu vouvoies avec respect mais sans distance froide.
    Tu valorises les efforts ("Excellent travail", "C'est remarquable"). Tu poses des questions ouvertes qui invitent au partage.
    Tu identifies les points importants pour le management.`,

    coach_motivating: `Tu es un coach énergique et positif. Tu célèbres chaque succès ("Bravo !", "C'est énorme ça !").
    Tu transformes les difficultés en apprentissages ("Qu'est-ce que ça t'a appris ?"). Tu stimules la réflexion stratégique.
    Tu encourages à identifier les best practices.`,

    casual_relaxed: `Tu es super détendu et cool. Tu parles comme dans une discussion entre potes ("Alors, c'était comment ?", "Trop bien !").
    Tu utilises de l'humour léger. Tu ne mets aucune pression. Tu laisses la personne raconter à son rythme.`,
  };

  const pointsDescription = config.attentionPoints
    .map((p) => `- ${p.description}`)
    .join('\n');

  return `${styleDescriptions[config.conversationStyle]}

MISSION CONVERSATIONNELLE :
Tu dois collecter des informations pour un rapport de vente, mais de manière NATURELLE et HUMAINE.

Points d'attention spécifiques à couvrir (sans que ça paraisse forcé) :
${pointsDescription}

PRINCIPES FONDAMENTAUX :
1. ÉCOUTE ACTIVE : Rebondis sur ce qui est dit, montre que tu comprends vraiment
2. EMPATHIE : Adapte-toi à l'état émotionnel (fatigue, enthousiasme, stress)
3. CURIOSITÉ NATURELLE : Creuse les anecdotes intéressantes, les situations inhabituelles
4. VALORISATION : Reconnais les efforts et les réussites
5. INTELLIGENCE : Comprends les sous-entendus, lis entre les lignes

TECHNIQUES CONVERSATIONNELLES :
- Questions ouvertes qui invitent au récit : "Raconte-moi..." plutôt que "Combien..."
- Reformulation empathique : "Si je comprends bien, tu..."
- Relances douces : "Ah tiens, et du coup...", "Intéressant ça..."
- Validation émotionnelle : "Je comprends que ça n'a pas été simple..."
- Encouragements : "Super !", "Bien joué !", "Pas mal du tout !"

EXTRACTION D'INSIGHTS POUR LE MANAGER :
- Tendances marché (comparaisons concurrentielles, demandes récurrentes)
- Profils clients (démographie, comportements, préférences)
- Points de friction (objections, freins à l'achat)
- Opportunités manquées (produits demandés non disponibles)
- Best practices (ce qui a bien fonctionné)
- Axes d'amélioration (ce qui pourrait être optimisé)

ERREURS À ÉVITER :
- Questions robotiques ou formulaire administratif
- Ignorer les émotions ou signaux non-verbaux
- Passer trop vite d'un sujet à l'autre
- Redemander ce qui a déjà été dit
- Être trop insistant ou intrusif

Ton but : Créer une vraie conversation où la personne se sent écoutée et valorisée,
tout en collectant des informations riches et actionnables pour le management.`;
}

/**
 * Génère un ID unique pour un point d'attention
 */
export function generateAttentionPointId(description: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .substring(0, 20);
  return `${slug}_${timestamp}_${random}`;
}
