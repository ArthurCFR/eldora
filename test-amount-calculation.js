/**
 * Test du calcul du montant total des ventes
 */

// Simulation des données du rapport
const reportData = {
  sales: {
    "Lave-Vaisselle Frontal": 2,
    "Table Réfrigérée 3 Portes": 3,
    "Robot Coupe R301": 1
  },
  customer_feedback: "**SPÉCIFICATIONS TECHNIQUES**\nRemise de 10% accordée sur les tables réfrigérées.",
  total_amount: 0, // Sera calculé
  discount_percentage: 0,
  discount_amount: 0
};

// Produits ecocuisine (exemple)
const products = [
  { "Nom": "Lave-Vaisselle-Frontal", "Nom d'affichage": "Lave-Vaisselle Frontal", "Prix (€)": 6499 },
  { "Nom": "Table-Refrigeree-3-Portes", "Nom d'affichage": "Table Réfrigérée 3 Portes", "Prix (€)": 2199 },
  { "Nom": "Robot-Coupe-R301", "Nom d'affichage": "Robot Coupe R301", "Prix (€)": 1299 }
];

// Calcul
let total = 0;

Object.entries(reportData.sales).forEach(([productName, quantity]) => {
  const product = products.find(p => p["Nom d'affichage"] === productName);
  if (product) {
    const price = product["Prix (€)"];
    console.log(`${productName}: ${quantity} × ${price}€ = ${quantity * price}€`);
    total += quantity * price;
  }
});

console.log(`\nSous-total: ${total}€`);

// Rabais
const discountPercentage = 10;
const discountAmount = total * (discountPercentage / 100);
const finalTotal = total - discountAmount;

console.log(`Rabais (${discountPercentage}%): -${discountAmount}€`);
console.log(`\nMontant total: ${finalTotal}€`);
console.log(`\nFormatté: ${finalTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`);
