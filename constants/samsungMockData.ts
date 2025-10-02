/**
 * Données mock pour la démo vendeur Samsung
 */

export interface SamsungSalesInfo {
  eventName: string;
  eventLocation: string;
  salesDate: string;
  salesTime: string;
  salesRepName: string;
  boothNumber: string;
}

export const MOCK_SAMSUNG_SALES: SamsungSalesInfo = {
  eventName: 'Salon Tech Paris 2025',
  eventLocation: 'Paris Expo Porte de Versailles - Hall 3',
  salesDate: new Date().toLocaleDateString('fr-FR'),
  salesTime: '18:30',
  salesRepName: 'Thomas',
  boothNumber: 'A-42',
};

// Références produits Samsung imaginaires
export const SAMSUNG_PRODUCTS = {
  smartphones: [
    'Galaxy S25 Ultra 5G (Réf: SM-S925U)',
    'Galaxy S25+ 5G (Réf: SM-S916U)',
    'Galaxy S25 5G (Réf: SM-S911U)',
    'Galaxy Z Fold 6 (Réf: SM-F946U)',
    'Galaxy Z Flip 6 (Réf: SM-F731U)',
    'Galaxy A55 5G (Réf: SM-A556E)',
  ],
  tablets: [
    'Galaxy Tab S9 Ultra (Réf: SM-X916B)',
    'Galaxy Tab S9+ (Réf: SM-X816B)',
    'Galaxy Tab S9 (Réf: SM-X716B)',
    'Galaxy Tab A9+ (Réf: SM-X216B)',
  ],
  watches: [
    'Galaxy Watch 7 Ultra (Réf: SM-L315F)',
    'Galaxy Watch 7 Classic (Réf: SM-R895F)',
    'Galaxy Watch 7 (Réf: SM-R865F)',
    'Galaxy Fit 3 (Réf: SM-R390)',
  ],
  audio: [
    'Galaxy Buds 3 Pro (Réf: SM-R530)',
    'Galaxy Buds 3 (Réf: SM-R520)',
    'Galaxy Buds FE (Réf: SM-R400N)',
  ],
  accessories: [
    'Chargeur sans fil Trio (Réf: EP-P6300)',
    'Coque S25 Ultra premium (Réf: EF-PS928)',
    'S Pen Pro (Réf: EJ-P5450)',
  ],
};
