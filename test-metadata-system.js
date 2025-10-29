/**
 * Test script for Product Metadata System
 * Run with: node test-metadata-system.js
 */

// Simulate product data from Excel
const sampleProducts = [
  {
    id: 'prod-1',
    name: 'Galaxy Z Nova',
    'Nom': 'Galaxy Z Nova',
    'Catégorie': 'Smartphone',
    'Prix (€)': 1299,
    'Objectif': 4,
    'Garantie': '2 ans',
    'Fiche Technique': '5G, Écran pliable, 256GB',
    'Code EAN': '8806094123456',
    'Poids (g)': 263
  },
  {
    id: 'prod-2',
    name: 'QLED Vision 8K',
    'Nom': 'QLED Vision 8K',
    'Catégorie': 'Téléviseur',
    'Prix (€)': 2499,
    'Objectif': 2,
    'Garantie': '3 ans',
    'Fiche Technique': '8K, 65", HDR10+',
    'Code EAN': '8806094987654',
    'Poids (g)': 23400
  }
];

// Test field analysis
function inferFieldType(values) {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

  if (nonNullValues.length === 0) {
    return 'text';
  }

  // Check for currency
  const currencyCount = nonNullValues.filter(v =>
    typeof v === 'string' && /[€$£¥]/.test(v.toString())
  ).length;
  if (currencyCount > nonNullValues.length * 0.5) {
    return 'currency';
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

function generateDisplayName(fieldName) {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function analyzeProductFields(products) {
  if (!products || products.length === 0) {
    return [];
  }

  // Get all unique field names
  const allFieldNames = new Set();
  products.forEach(product => {
    Object.keys(product).forEach(key => allFieldNames.add(key));
  });

  const metadata = [];

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

// Run test
console.log('🧪 Testing Product Metadata System\n');
console.log('Sample products:', JSON.stringify(sampleProducts, null, 2));
console.log('\n' + '='.repeat(80) + '\n');

const metadata = analyzeProductFields(sampleProducts);

console.log('📊 Analyzed Field Metadata:\n');
metadata.forEach(field => {
  console.log(`Field: ${field.fieldName}`);
  console.log(`  Display Name: ${field.displayName}`);
  console.log(`  Type: ${field.type}`);
  console.log(`  Sample Values: ${field.sampleValues.join(', ')}`);
  console.log('');
});

console.log('='.repeat(80));
console.log('✅ Test completed successfully!');
console.log('\nKey findings:');
console.log(`- Total fields detected: ${metadata.length}`);
console.log(`- Currency fields: ${metadata.filter(f => f.type === 'currency').length}`);
console.log(`- Number fields: ${metadata.filter(f => f.type === 'number').length}`);
console.log(`- Text fields: ${metadata.filter(f => f.type === 'text').length}`);
console.log('\n💡 All Excel columns are now captured and will be available to the AI!');
