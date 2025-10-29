/**
 * Project Types
 * Data structures for multi-project system
 */

export interface AttentionPoint {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  naturalPrompts?: string[];
}

export interface ReportConfiguration {
  attentionPointsTracking: boolean; // Option 1 - Suivi des points d'attention
  productTableTracking: boolean; // Option 2 (Parent) - Active les tableaux produits
  productSalesTracking: boolean; // Option 2a (Sous-option) - Tableau des ventes (quantités + montants)
  stockAlertsTracking: boolean; // Option 2b (Sous-option) - Alertes rupture de stock (Oui/Non)
  additionalRemarksTracking: boolean; // Option 3 - Capture automatique des infos pertinentes
}

export interface TableColumn {
  id: string; // Unique identifier (e.g., "product_name", "quantity_sold")
  label: string; // Display label (e.g., "Produit", "Quantité vendue")
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date';
  source: 'product' | 'sales' | 'calculated'; // Where data comes from
  calculation?: string; // For calculated fields (e.g., "quantity * price")
  required: boolean; // Is this column mandatory?
}

export interface ProductFieldMetadata {
  fieldName: string; // Original field name from Excel
  displayName: string; // Human-readable name
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date';
  description?: string; // What this field represents (AI-generated)
  sampleValues?: any[]; // Sample values for context
}

export interface TableStructure {
  columns: TableColumn[]; // Columns to display in reports
  description: string; // What this table tracks
  availableFields?: ProductFieldMetadata[]; // ALL fields from Excel (for AI context)
  fieldMapping?: { [columnId: string]: string }; // Maps display column ID to source field name
}

export interface ReportTemplate {
  sections: string[];
  configuration?: ReportConfiguration; // Configuration des options de rapport
  tableStructure?: TableStructure; // Dynamic table structure (AI-generated)
}

export interface ProjectSettings {
  industry: string; // 'pharma', 'retail', 'b2b', etc.
  reportType: string; // 'visit', 'demo', 'sales', etc.
  language: string;
  reportScheduleType: 'fixed' | 'per-appointment'; // Type de planification des rapports
  reportFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'; // Fréquence (uniquement si reportScheduleType === 'fixed')
}

export interface Document {
  id: string;
  name: string;
  type: 'excel' | 'pdf' | 'csv';
  path: string;
  uploadedAt: string;
  parsedData?: any;
}

export interface Project {
  id: string;
  name: string;
  description: string; // [DEPRECATED] Description technique du manager - use companyContext instead
  userFacingDescription?: string; // Description courte pour l'utilisateur final (2 phrases max)
  createdAt: string;
  updatedAt: string;
  startDate?: string; // Date de début du projet (ISO string) - définit le point de départ du calendrier des rapports

  // Nouveaux champs de contexte (séparation des préoccupations)
  companyContext?: string; // Contexte de l'entreprise et du projet
  reportContext?: string; // Contexte dans lequel se déroulent les rapports (où, comment, quand)
  reportGoal?: string; // Objectif et utilisation des rapports

  settings: ProjectSettings;
  conversationStyle: string;
  attentionPoints: AttentionPoint[];
  reportTemplate: ReportTemplate;
  collaborators?: string[]; // List of authorized collaborator names

  documents?: Document[];
  products?: any[]; // Parsed product data
  hasProductsTable?: boolean; // Indique si le projet a un tableau de produits uploadé
}

// Report Slot - Représente un emplacement de rapport dans le calendrier
export interface ReportSlot {
  date: string; // ISO string de la date du rapport (ex: "2025-10-28")
  hasReport: boolean; // true si un rapport existe pour cette date
  reportId?: string; // ID du rapport si hasReport === true
  isPast: boolean; // true si la date est dans le passé
  isFuture: boolean; // true si la date est dans le futur
  label: string; // Label à afficher (ex: "Lundi 28 Oct", "Semaine 43", "Octobre 2025")
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  industry: string;
}
