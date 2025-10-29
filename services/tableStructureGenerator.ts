/**
 * Service to generate optimal table structure based on project context and products
 * Calls server-side API which uses Claude AI to analyze context and propose optimal columns
 */

import { analyzeProductFields, enrichFieldMetadataWithAI } from './productFieldAnalyzer';
import { TableColumn, TableStructure, ProductFieldMetadata } from '../types/project';

const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL || 'http://localhost:3001';

/**
 * Generate optimal table structure using AI via server API
 * Calls Claude to analyze context and propose intelligent column structure
 * Now includes ALL available fields for AI context, not just display columns
 */
export async function generateTableStructure(
  projectContext: {
    name: string;
    description: string;
    industry: string;
    reportType: string;
  },
  products: any[]
): Promise<TableStructure> {
  try {
    // Step 1: Analyze all product fields to generate metadata
    const fieldMetadata = analyzeProductFields(products);

    // Step 2: Enrich metadata with AI descriptions (optional, improves context)
    const enrichedMetadata = await enrichFieldMetadataWithAI(fieldMetadata, projectContext);

    // Step 3: Generate table structure with AI, passing all field metadata
    const response = await fetch(`${PROXY_URL}/api/generate-table-structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectContext,
        products,
        fieldMetadata: enrichedMetadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate table structure');
    }

    const tableStructure = await response.json();

    // Step 4: Add available fields metadata to the structure
    tableStructure.availableFields = enrichedMetadata;

    return tableStructure;
  } catch (error) {
    console.error('Error generating table structure:', error);
    // Fallback to default structure if AI fails
    return getDefaultTableStructure(products);
  }
}

/**
 * Get default table structure (fallback)
 */
export function getDefaultTableStructure(products?: any[]): TableStructure {
  const structure: TableStructure = {
    description: 'Suivi des ventes par produit',
    columns: [
      {
        id: 'product_name',
        label: 'Produit',
        type: 'text',
        source: 'product',
        required: true,
      },
      {
        id: 'quantity_sold',
        label: 'Quantité vendue',
        type: 'number',
        source: 'sales',
        required: true,
      },
    ],
  };

  // Add available fields if products provided
  if (products && products.length > 0) {
    structure.availableFields = analyzeProductFields(products);
  }

  return structure;
}
