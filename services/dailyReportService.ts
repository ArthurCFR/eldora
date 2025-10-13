/**
 * Service de gestion des rapports quotidiens
 * Gère le stockage, la mise à jour et l'envoi des rapports de vente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SalesData {
  [productName: string]: number;
}

export interface DailyReport {
  id: string; // Format: report_${salesRepName}_${date}
  salesRepName: string;
  eventName: string;
  date: string; // Format: YYYY-MM-DD
  createdAt: string; // ISO timestamp
  lastModifiedAt: string; // ISO timestamp
  sales: SalesData;
  customerFeedback: string;
  emotionalContext?: string;
  keyInsights: string[];
  conversationHistory: Array<{
    timestamp: string;
    userInput: string;
    agentResponse: string;
  }>;
  status: 'draft' | 'sent'; // draft = en cours, sent = envoyé définitivement
}

const STORAGE_PREFIX = '@daily_report_';

/**
 * Génère l'ID unique d'un rapport pour un vendeur et une date
 */
function generateReportId(salesRepName: string, date: string): string {
  return `${STORAGE_PREFIX}${salesRepName}_${date}`;
}

/**
 * Obtient la date du jour au format YYYY-MM-DD
 */
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Charge le rapport du jour pour un vendeur
 */
export async function loadTodayReport(salesRepName: string): Promise<DailyReport | null> {
  try {
    const today = getTodayDate();
    const reportId = generateReportId(salesRepName, today);

    const stored = await AsyncStorage.getItem(reportId);
    if (stored) {
      const report = JSON.parse(stored) as DailyReport;
      console.log('📄 Loaded today\'s report:', reportId);
      return report;
    }

    console.log('📄 No report found for today');
    return null;
  } catch (error) {
    console.error('Error loading today\'s report:', error);
    return null;
  }
}

/**
 * Crée un nouveau rapport
 */
export async function createReport(
  salesRepName: string,
  eventName: string,
  data: {
    sales: SalesData;
    customerFeedback: string;
    emotionalContext?: string;
    keyInsights: string[];
  }
): Promise<DailyReport> {
  try {
    const today = getTodayDate();
    const reportId = generateReportId(salesRepName, today);
    const now = new Date().toISOString();

    const report: DailyReport = {
      id: reportId,
      salesRepName,
      eventName,
      date: today,
      createdAt: now,
      lastModifiedAt: now,
      sales: data.sales,
      customerFeedback: data.customerFeedback,
      emotionalContext: data.emotionalContext,
      keyInsights: data.keyInsights,
      conversationHistory: [],
      status: 'draft',
    };

    await AsyncStorage.setItem(reportId, JSON.stringify(report));
    console.log('✅ Created new report:', reportId);
    return report;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
}

/**
 * Met à jour un rapport existant en fusionnant les nouvelles données
 */
export async function updateReport(
  report: DailyReport,
  newData: {
    sales?: SalesData;
    customerFeedback?: string;
    emotionalContext?: string;
    keyInsights?: string[];
  }
): Promise<DailyReport> {
  try {
    const now = new Date().toISOString();

    // Fusionner les ventes (additionner les quantités)
    if (newData.sales) {
      const mergedSales = { ...report.sales };
      for (const [product, quantity] of Object.entries(newData.sales)) {
        mergedSales[product] = (mergedSales[product] || 0) + quantity;
      }
      report.sales = mergedSales;
    }

    // Fusionner les retours clients
    if (newData.customerFeedback) {
      if (report.customerFeedback) {
        report.customerFeedback += '\n\n' + newData.customerFeedback;
      } else {
        report.customerFeedback = newData.customerFeedback;
      }
    }

    // Mettre à jour le contexte émotionnel (dernier = le bon)
    if (newData.emotionalContext) {
      report.emotionalContext = newData.emotionalContext;
    }

    // Fusionner les insights (éviter les doublons)
    if (newData.keyInsights && newData.keyInsights.length > 0) {
      const existingInsights = new Set(report.keyInsights);
      for (const insight of newData.keyInsights) {
        if (!existingInsights.has(insight)) {
          report.keyInsights.push(insight);
        }
      }
    }

    report.lastModifiedAt = now;

    await AsyncStorage.setItem(report.id, JSON.stringify(report));
    console.log('✅ Updated report:', report.id);
    return report;
  } catch (error) {
    console.error('Error updating report:', error);
    throw error;
  }
}

/**
 * Marque un rapport comme envoyé définitivement
 */
export async function sendReport(report: DailyReport): Promise<void> {
  try {
    report.status = 'sent';
    report.lastModifiedAt = new Date().toISOString();

    await AsyncStorage.setItem(report.id, JSON.stringify(report));
    console.log('✅ Report marked as sent:', report.id);
  } catch (error) {
    console.error('Error sending report:', error);
    throw error;
  }
}

/**
 * Supprime un rapport
 */
export async function deleteReport(reportId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(reportId);
    console.log('✅ Deleted report:', reportId);
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}

/**
 * Supprime le rapport du jour pour un vendeur (utile pour les tests)
 */
export async function deleteTodayReport(salesRepName: string): Promise<boolean> {
  try {
    const today = getTodayDate();
    const reportId = generateReportId(salesRepName, today);

    await AsyncStorage.removeItem(reportId);
    console.log('✅ Deleted today\'s report:', reportId);
    return true;
  } catch (error) {
    console.error('Error deleting today\'s report:', error);
    return false;
  }
}

/**
 * Liste tous les rapports d'un vendeur
 */
export async function listReports(salesRepName: string): Promise<DailyReport[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const reportKeys = keys.filter(key =>
      key.startsWith(STORAGE_PREFIX) && key.includes(salesRepName)
    );

    const reports: DailyReport[] = [];
    for (const key of reportKeys) {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        reports.push(JSON.parse(stored));
      }
    }

    // Trier par date décroissante
    reports.sort((a, b) => b.date.localeCompare(a.date));

    return reports;
  } catch (error) {
    console.error('Error listing reports:', error);
    return [];
  }
}
