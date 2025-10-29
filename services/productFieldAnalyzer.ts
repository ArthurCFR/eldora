/**
 * Product Field Analyzer Service
 * Analyzes Excel columns and generates intelligent metadata for each field
 */

import { ProductFieldMetadata } from '../types/project';

/**
 * Infer the type of a field based on sample values
 */
function inferFieldType(values: any[]): 'text' | 'number' | 'currency' | 'percentage' | 'date' {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

  if (nonNullValues.length === 0) {
    return 'text';
  }

  // Check for percentages (numbers with %)
  const percentageCount = nonNullValues.filter(v =>
    typeof v === 'string' && v.toString().includes('%')
  ).length;
  if (percentageCount > nonNullValues.length * 0.5) {
    return 'percentage';
  }

  // Check for currency (numbers with currency symbols)
  const currencyCount = nonNullValues.filter(v =>
    typeof v === 'string' && /[€$£¥]/.test(v.toString())
  ).length;
  if (currencyCount > nonNullValues.length * 0.5) {
    return 'currency';
  }

  // Check for dates
  const dateCount = nonNullValues.filter(v => {
    if (v instanceof Date) return true;
    if (typeof v === 'string') {
      const datePattern = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;
      return datePattern.test(v);
    }
    return false;
  }).length;
  if (dateCount > nonNullValues.length * 0.5) {
    return 'date';
  }

  // Check for numbers
  const numberCount = nonNullValues.filter(v =>
    typeof v === 'number' || (!isNaN(Number(v)) && v !== '')
  ).length;
  if (numberCount > nonNullValues.length * 0.7) {
    return 'number';
  }

  return 'text';
}

/**
 * Generate human-readable display name from field name
 */
function generateDisplayName(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Analyze all product fields and generate metadata
 */
export function analyzeProductFields(products: any[]): ProductFieldMetadata[] {
  if (!products || products.length === 0) {
    return [];
  }

  // Get all unique field names from all products
  const allFieldNames = new Set<string>();
  products.forEach(product => {
    Object.keys(product).forEach(key => allFieldNames.add(key));
  });

  const metadata: ProductFieldMetadata[] = [];

  allFieldNames.forEach(fieldName => {
    // Collect all values for this field
    const values = products.map(p => p[fieldName]).filter(v => v !== undefined);

    // Get sample values (up to 3 unique values)
    const uniqueValues = [...new Set(values)].slice(0, 3);

    // Infer type
    const type = inferFieldType(values);

    // Generate display name
    const displayName = generateDisplayName(fieldName);

    metadata.push({
      fieldName,
      displayName,
      type,
      sampleValues: uniqueValues,
    });
  });

  return metadata;
}

/**
 * Enrich field metadata with AI-generated descriptions
 * This calls the server to use Claude for intelligent field description
 */
export async function enrichFieldMetadataWithAI(
  metadata: ProductFieldMetadata[],
  projectContext: {
    name: string;
    description: string;
    industry: string;
  }
): Promise<ProductFieldMetadata[]> {
  try {
    const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL || 'http://localhost:3001';

    const response = await fetch(`${PROXY_URL}/api/analyze-product-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: metadata,
        projectContext,
      }),
    });

    if (!response.ok) {
      console.warn('Failed to enrich metadata with AI, using basic metadata');
      return metadata;
    }

    const enrichedMetadata = await response.json();
    return enrichedMetadata.fields || metadata;
  } catch (error) {
    console.error('Error enriching metadata:', error);
    return metadata;
  }
}
