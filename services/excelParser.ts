/**
 * Excel Parser Service
 * Parse Excel files to extract product data
 */

import * as XLSX from 'xlsx';

export interface ParsedProduct {
  id?: string;
  name: string;
  [key: string]: any; // Allow dynamic properties
}

/**
 * Parse Excel file and extract product data
 * Expects first row to be headers, subsequent rows to be products
 */
export async function parseExcelFile(file: File): Promise<ParsedProduct[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          reject(new Error('Excel file must have at least a header row and one data row'));
          return;
        }

        // First row is headers
        const headers = jsonData[0] as string[];
        const products: ParsedProduct[] = [];

        // Parse each row
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row.length === 0) continue; // Skip empty rows

          const product: any = {};
          headers.forEach((header, index) => {
            if (row[index] !== undefined && row[index] !== null) {
              product[header] = row[index];
            }
          });

          // Add auto-generated ID if not present
          if (!product.id) {
            product.id = `prod-${i}`;
          }

          products.push(product);
        }

        resolve(products);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse Excel file from server-side (Node.js)
 */
export function parseExcelFileServer(filePath: string): ParsedProduct[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length < 2) {
    throw new Error('Excel file must have at least a header row and one data row');
  }

  // First row is headers
  const headers = jsonData[0] as string[];
  const products: ParsedProduct[] = [];

  // Parse each row
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (row.length === 0) continue; // Skip empty rows

    const product: any = {};
    headers.forEach((header, index) => {
      if (row[index] !== undefined && row[index] !== null) {
        product[header] = row[index];
      }
    });

    // Add auto-generated ID if not present
    if (!product.id) {
      product.id = `prod-${i}`;
    }

    products.push(product);
  }

  return products;
}

/**
 * Validate product data structure
 */
export function validateProducts(products: ParsedProduct[]): boolean {
  if (!products || products.length === 0) {
    return false;
  }

  // Check if at least 'name' field exists in all products
  return products.every(product => product.name && product.name.trim().length > 0);
}
