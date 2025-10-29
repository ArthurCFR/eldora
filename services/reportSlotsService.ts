/**
 * Report Slots Service
 * Génère et gère les emplacements de rapport selon la fréquence choisie
 */

import { ReportSlot } from '../types/project';

/**
 * Génère les emplacements de rapport pour un projet avec rapports réguliers
 * @param startDate - Date de début du projet (ISO string)
 * @param frequency - Fréquence des rapports
 * @param weeksToShow - Nombre de semaines à afficher (passé + futur)
 * @returns Array of ReportSlot
 */
export function generateReportSlots(
  startDate: string,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly',
  weeksToShow: number = 8 // 8 semaines par défaut (environ 2 mois)
): ReportSlot[] {
  const slots: ReportSlot[] = [];
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for comparison

  // Calculate end date
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (weeksToShow * 7));

  let currentDate = new Date(start);
  currentDate.setHours(0, 0, 0, 0);

  // Generate slots based on frequency
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const isPast = currentDate < today;
    const isFuture = currentDate > today;

    slots.push({
      date: dateStr,
      hasReport: false, // Will be updated when checking against actual reports
      isPast,
      isFuture,
      label: formatSlotLabel(currentDate, frequency),
    });

    // Move to next slot based on frequency
    switch (frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'biweekly':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
  }

  return slots;
}

/**
 * Formate le label d'un slot selon la fréquence
 */
function formatSlotLabel(date: Date, frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'): string {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  switch (frequency) {
    case 'daily':
      return `${dayName} ${day} ${month}`;
    case 'weekly':
      return `Semaine ${getWeekNumber(date)} - ${day} ${month}`;
    case 'biweekly':
      return `${day} ${month} ${year}`;
    case 'monthly':
      return `${month} ${year}`;
    default:
      return `${day} ${month}`;
  }
}

/**
 * Calcule le numéro de semaine dans l'année
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Met à jour les slots avec les rapports existants
 * @param slots - Slots générés
 * @param existingReports - Map de rapports existants (date → reportId)
 */
export function updateSlotsWithReports(
  slots: ReportSlot[],
  existingReports: Map<string, string>
): ReportSlot[] {
  return slots.map(slot => ({
    ...slot,
    hasReport: existingReports.has(slot.date),
    reportId: existingReports.get(slot.date),
  }));
}

/**
 * Trouve le slot le plus proche de la date actuelle
 */
export function findNearestSlot(slots: ReportSlot[]): ReportSlot | null {
  if (slots.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find slot for today or nearest past slot
  const todayStr = today.toISOString().split('T')[0];
  const todaySlot = slots.find(s => s.date === todayStr);
  if (todaySlot) return todaySlot;

  // Find nearest past slot
  const pastSlots = slots.filter(s => s.isPast).sort((a, b) => b.date.localeCompare(a.date));
  if (pastSlots.length > 0) return pastSlots[0];

  // Return first slot if no past slots
  return slots[0];
}
