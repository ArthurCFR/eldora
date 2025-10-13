export interface VisitInfo {
  pharmacyName: string;
  pharmacistName: string;
  visitDate: string;
  visitTime: string;
  sector: string;
  userName: string;
}

export interface ReportData {
  client: string;
  contact: string;
  date: string;
  keyPoints: string[];
  productsDiscussed: string[];
  insights: string[];
  nextSteps: string[];
}

export interface ReportSections {
  productsCount?: string; // Nombre de produits vendus
  timeSpent?: string; // Temps passé dans la pharmacie
  pharmacistComments?: string; // Commentaires du pharmacien sur son activité
  otherInfo?: string; // Autres informations agrégées
}

export interface MissingInfo {
  productsCount: boolean;
  timeSpent: boolean;
  pharmacistComments: boolean;
}

export interface AnalysisResult {
  sections: ReportSections;
  missingInfo: MissingInfo;
  nextQuestion: string | null;
}

export interface SamsungProduct {
  nom: string;
  catégorie: string;
  prix: number;
  disponibilité: string;
  description: string;
  "nombre de produit vendu": number;
  objectifs: number;
}

export interface SamsungSalesAnalysis {
  sales: { [productName: string]: number };
  timeSpent: string | null;
  customerFeedback: string | null;
  nextQuestion: string | null;
  isComplete: boolean;
}
