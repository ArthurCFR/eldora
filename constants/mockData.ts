import { VisitInfo } from '../types';

export const MOCK_VISIT: VisitInfo = {
  pharmacyName: "Pharmacie André Guides",
  pharmacistName: "Marie Dupont",
  visitDate: new Date().toLocaleDateString('fr-FR'),
  visitTime: "14h30",
  sector: "Paris 15ème",
  userName: "Stéphane"
};
