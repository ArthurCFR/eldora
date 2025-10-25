/**
 * Service pour générer des insights managériaux de haute valeur
 * Transforme les données brutes en intelligence business actionnable
 */

import productsData from '../agent/config/products.json';

interface SalesData {
  [productName: string]: number;
}

interface InsightReport {
  executive_summary: string;
  performance_metrics: {
    total_units: number;
    conversion_rate: number;
    best_performers: string[];
    underperformers: string[];
  };
  market_intelligence: string[];
  customer_insights: string[];
  competitive_analysis: string[];
  action_items: string[];
  opportunities: string[];
  risks: string[];
}

/**
 * Analyse les ventes et génère des métriques de performance
 */
function analyzePerformance(sales: SalesData): InsightReport['performance_metrics'] {
  const productMap = new Map(productsData.products.map((p: any) => [p.name, p]));

  let totalSold = 0;
  let totalTarget = 0;
  const performances: Array<{ name: string; rate: number; sold: number; target: number }> = [];

  Object.entries(sales).forEach(([productName, sold]) => {
    const product = productMap.get(productName);
    if (product) {
      totalSold += sold;
      totalTarget += product.target_quantity;
      const rate = product.target_quantity > 0 ? (sold / product.target_quantity) * 100 : 0;
      performances.push({ name: productName, rate, sold, target: product.target_quantity });
    }
  });

  performances.sort((a, b) => b.rate - a.rate);

  return {
    total_units: totalSold,
    conversion_rate: totalTarget > 0 ? Math.round((totalSold / totalTarget) * 100) : 0,
    best_performers: performances
      .filter(p => p.rate >= 100 && p.sold > 0)
      .slice(0, 3)
      .map(p => `${p.name} (${p.rate}% - ${p.sold}/${p.target})`),
    underperformers: performances
      .filter(p => p.rate < 50 && p.target > 0)
      .map(p => `${p.name} (${p.rate}% - ${p.sold}/${p.target})`),
  };
}

/**
 * Extrait les insights du feedback client enrichi
 */
function extractInsights(feedback: string | null): {
  market: string[];
  customer: string[];
  competitive: string[];
  opportunities: string[];
  risks: string[];
} {
  if (!feedback) {
    return {
      market: [],
      customer: [],
      competitive: [],
      opportunities: [],
      risks: [],
    };
  }

  const insights = {
    market: [] as string[],
    customer: [] as string[],
    competitive: [] as string[],
    opportunities: [] as string[],
    risks: [] as string[],
  };

  const feedbackLower = feedback.toLowerCase();

  // Patterns d'analyse pour extraction d'insights
  const patterns = {
    competitive: [
      { regex: /compar.*apple/i, insight: 'Forte pression concurrentielle Apple sur le segment premium' },
      { regex: /compar.*iphone/i, insight: 'iPhone reste la référence comparative pour les clients' },
      { regex: /moins cher que/i, insight: 'Sensibilité prix : positionnement compétitif avantageux' },
      { regex: /plus cher que/i, insight: 'Barrière prix identifiée vs concurrence' },
    ],
    customer: [
      { regex: /jeunes?|étudiant/i, insight: 'Segment jeune/étudiant présent - adapter l\'approche commerciale' },
      { regex: /professionnel|entreprise|corporate/i, insight: 'Potentiel B2B identifié - développer offre entreprise' },
      { regex: /famille|enfant/i, insight: 'Segment famille - mettre en avant sécurité et durabilité' },
      { regex: /senior|âgé/i, insight: 'Segment senior - simplifier l\'expérience et l\'accompagnement' },
    ],
    market: [
      { regex: /beaucoup de monde|affluence/i, insight: 'Fort traffic - optimiser la conversion' },
      { regex: /peu de monde|calme/i, insight: 'Faible affluence - revoir stratégie d\'attraction' },
      { regex: /intéress[ée]|curieu/i, insight: 'Fort intérêt produit - capitaliser sur la demande' },
      { regex: /hésit|réfléchi/i, insight: 'Phase de considération longue - renforcer réassurance' },
    ],
    opportunities: [
      { regex: /demand[ée].*pas|pas.*stock/i, insight: 'Rupture stock sur produits demandés - risque de ventes perdues' },
      { regex: /nouveau.*intéress/i, insight: 'Appétence pour les nouveautés - accélérer les lancements' },
      { regex: /démo.*bien|démo.*march[ée]/i, insight: 'Les démonstrations convertissent - généraliser la pratique' },
      { regex: /group[ée]|plusieurs|ensemble/i, insight: 'Opportunité ventes groupées/bundles' },
    ],
    risks: [
      { regex: /déçu|décevant/i, insight: 'Insatisfaction client détectée - action corrective urgente' },
      { regex: /bug|problème|défaut/i, insight: 'Problèmes qualité remontés - escalader au SAV' },
      { regex: /compliqué|difficile|pas compris/i, insight: 'Complexité produit - simplifier communication' },
      { regex: /trop cher|prix élevé/i, insight: 'Résistance prix - revoir politique tarifaire ou argumentaire' },
    ],
  };

  // Analyser le feedback avec les patterns
  Object.entries(patterns).forEach(([category, patternList]) => {
    patternList.forEach(({ regex, insight }) => {
      if (regex.test(feedback)) {
        (insights as any)[category].push(insight);
      }
    });
  });

  // Analyse contextuelle additionnelle
  if (feedbackLower.includes('record') || feedbackLower.includes('meilleur')) {
    insights.opportunities.push('Performance exceptionnelle - documenter les best practices');
  }

  if (feedbackLower.includes('première fois') || feedbackLower.includes('découvr')) {
    insights.customer.push('Nouveaux clients - importance du first impression');
  }

  return insights;
}

/**
 * Génère un rapport d'insights managériaux enrichi
 */
export async function generateManagerialInsights(
  sales: SalesData,
  customerFeedback: string | null,
  salesRepName: string,
  eventName: string
): Promise<string> {
  const metrics = analyzePerformance(sales);
  const insights = extractInsights(customerFeedback);

  // Générer les action items basés sur la performance
  const actionItems: string[] = [];

  if (metrics.conversion_rate < 50) {
    actionItems.push('🔴 Performance sous objectif - Plan d\'action urgent requis');
  } else if (metrics.conversion_rate < 80) {
    actionItems.push('🟡 Performance moyenne - Optimiser les techniques de vente');
  } else {
    actionItems.push('🟢 Excellente performance - Documenter et partager les best practices');
  }

  if (metrics.underperformers.length > 0) {
    actionItems.push(`Revoir stratégie pour produits sous-performants: ${metrics.underperformers.slice(0, 2).join(', ')}`);
  }

  if (insights.risks.length > 0) {
    actionItems.push('Traiter en priorité les risques identifiés');
  }

  // Construire le rapport formaté
  let report = `📊 RAPPORT D'INSIGHTS MANAGÉRIAUX
═══════════════════════════════════════

👤 Commercial: ${salesRepName}
📍 Événement: ${eventName}
📅 Date: ${new Date().toLocaleDateString('fr-FR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 PERFORMANCE COMMERCIALE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Unités vendues: ${metrics.total_units}
• Taux de réalisation: ${metrics.conversion_rate}%
• Statut: ${metrics.conversion_rate >= 100 ? '✅ Objectifs dépassés' :
           metrics.conversion_rate >= 80 ? '⚠️ Proche des objectifs' :
           '❌ Sous les objectifs'}
`;

  if (metrics.best_performers.length > 0) {
    report += `\n🏆 TOP PERFORMERS:\n`;
    metrics.best_performers.forEach(p => report += `  • ${p}\n`);
  }

  if (metrics.underperformers.length > 0) {
    report += `\n⚠️ ATTENTION REQUISE:\n`;
    metrics.underperformers.forEach(p => report += `  • ${p}\n`);
  }

  if (insights.market.length > 0) {
    report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 INTELLIGENCE MARCHÉ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    insights.market.forEach(i => report += `• ${i}\n`);
  }

  if (insights.customer.length > 0) {
    report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 INSIGHTS CLIENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    insights.customer.forEach(i => report += `• ${i}\n`);
  }

  if (insights.competitive.length > 0) {
    report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ ANALYSE CONCURRENTIELLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    insights.competitive.forEach(i => report += `• ${i}\n`);
  }

  if (insights.opportunities.length > 0) {
    report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 OPPORTUNITÉS IDENTIFIÉES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    insights.opportunities.forEach(i => report += `• ${i}\n`);
  }

  if (insights.risks.length > 0) {
    report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RISQUES & ALERTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    insights.risks.forEach(i => report += `• ${i}\n`);
  }

  report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 ACTIONS RECOMMANDÉES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  actionItems.forEach((item, index) => report += `${index + 1}. ${item}\n`);

  // Ajouter des recommandations stratégiques basées sur l'analyse
  report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 RECOMMANDATIONS STRATÉGIQUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (metrics.conversion_rate >= 100) {
    report += `• Capitaliser sur cette excellente performance\n`;
    report += `• Répliquer les méthodes sur d'autres événements\n`;
    report += `• Envisager augmentation des objectifs\n`;
  } else if (metrics.conversion_rate >= 70) {
    report += `• Identifier les facteurs de succès des top performers\n`;
    report += `• Renforcer la formation sur produits sous-performants\n`;
    report += `• Optimiser le pitch commercial\n`;
  } else {
    report += `• Révision urgente de la stratégie commerciale\n`;
    report += `• Formation intensive sur techniques de closing\n`;
    report += `• Analyse approfondie des causes de sous-performance\n`;
  }

  return report;
}

/**
 * Génère un executive summary concis pour la direction
 */
export function generateExecutiveSummary(
  sales: SalesData,
  customerFeedback: string | null
): string {
  const metrics = analyzePerformance(sales);
  const status = metrics.conversion_rate >= 100 ? '🟢' :
                 metrics.conversion_rate >= 70 ? '🟡' : '🔴';

  return `${status} Performance: ${metrics.conversion_rate}% | Unités: ${metrics.total_units} | ${
    metrics.best_performers.length > 0 ?
    `Star: ${metrics.best_performers[0].split(' ')[0]}` :
    'Amélioration nécessaire sur tous les produits'
  }`;
}