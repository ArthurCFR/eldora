/**
 * Monthly Calendar Component
 * Displays a month view with clickable dates and report status
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';

interface CalendarDate {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  hasReport: boolean;
  reportSent: boolean;
  isReportSlot: boolean; // Is this a valid slot for a report?
}

interface MonthlyCalendarProps {
  currentMonth: Date;
  onDateSelect: (date: string) => void;
  reportsMap: Map<string, { id: string; sent: boolean }>;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  onMonthChange: (direction: 'prev' | 'next') => void;
  startDate?: string; // Project start date (YYYY-MM-DD) - no slots before this date
}

export default function MonthlyCalendar({
  currentMonth,
  onDateSelect,
  reportsMap,
  frequency,
  onMonthChange,
  startDate,
}: MonthlyCalendarProps) {
  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Helper to convert Date to YYYY-MM-DD in local timezone (no UTC conversion)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCalendarDates = (): CalendarDate[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Monday of the week containing the 1st
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);

    // Build 6 weeks (42 days)
    const dates: CalendarDate[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateStr = formatDateLocal(date); // Use local timezone formatting
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();

      // Check if this date has a report
      const reportInfo = reportsMap.get(dateStr);
      const hasReport = !!reportInfo;
      const reportSent = reportInfo?.sent || false;

      // Determine if this is a valid report slot
      const isReportSlot = isValidReportSlot(date, frequency, isWeekend, isCurrentMonth);

      dates.push({
        date,
        dateStr,
        isCurrentMonth,
        isToday,
        isWeekend,
        hasReport,
        reportSent,
        isReportSlot,
      });
    }

    return dates;
  };

  const isValidReportSlot = (
    date: Date,
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly',
    isWeekend: boolean,
    isCurrentMonth: boolean
  ): boolean => {
    if (!isCurrentMonth) return false;

    // Check if date is before project start date
    if (startDate) {
      const projectStart = new Date(startDate);
      projectStart.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      if (checkDate < projectStart) return false;
    }

    switch (frequency) {
      case 'daily':
        // Every working day (Monday to Friday)
        return !isWeekend;

      case 'weekly': {
        // Last working day of the week (Friday, or Thursday if Friday is not in current month)
        if (isWeekend) return false;
        const dayOfWeek = date.getDay();
        // Check if it's Friday
        if (dayOfWeek === 5) return true;
        // Check if it's Thursday and next day is weekend or next month
        if (dayOfWeek === 4) {
          const nextDay = new Date(date);
          nextDay.setDate(date.getDate() + 1);
          return nextDay.getMonth() !== date.getMonth() || nextDay.getDay() === 6;
        }
        return false;
      }

      case 'biweekly': {
        // For biweekly, show slots on the last working day of every other week
        // This is simplified - in reality you'd need to track which week is the "on" week
        // For now, treat it like weekly (could be improved)
        if (isWeekend) return false;
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 5) return true;
        if (dayOfWeek === 4) {
          const nextDay = new Date(date);
          nextDay.setDate(date.getDate() + 1);
          return nextDay.getMonth() !== date.getMonth() || nextDay.getDay() === 6;
        }
        return false;
      }

      case 'monthly': {
        // Last working day of the month
        if (isWeekend) return false;
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        // If next day is next month, this is the last working day
        if (nextDay.getMonth() !== date.getMonth()) return true;

        // If this is Thursday/Friday and followed by weekend then next month
        const dayOfWeek = date.getDay();
        if (dayOfWeek >= 4) {
          const daysToNextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() - date.getDate();
          // Check if all remaining days are weekend days
          let allWeekend = true;
          for (let i = 1; i <= daysToNextMonth; i++) {
            const checkDay = new Date(date);
            checkDay.setDate(date.getDate() + i);
            const checkDayOfWeek = checkDay.getDay();
            if (checkDayOfWeek !== 0 && checkDayOfWeek !== 6) {
              allWeekend = false;
              break;
            }
          }
          return allWeekend;
        }
        return false;
      }

      default:
        return false;
    }
  };

  const dates = getCalendarDates();

  const renderDate = (dateInfo: CalendarDate) => {
    const isPast = dateInfo.date < new Date();
    const canInteract = dateInfo.isReportSlot && dateInfo.isCurrentMonth;

    let dateStyle: ViewStyle[] = [styles.dateCell];
    let textStyle: TextStyle[] = [styles.dateText];

    if (!dateInfo.isCurrentMonth) {
      dateStyle.push(styles.dateCellOtherMonth);
      textStyle.push(styles.dateTextOtherMonth);
    } else if (dateInfo.isToday) {
      dateStyle.push(styles.dateCellToday);
      textStyle.push(styles.dateTextToday);
    } else if (dateInfo.isWeekend) {
      textStyle.push(styles.dateTextWeekend);
    }

    if (dateInfo.isReportSlot) {
      if (dateInfo.hasReport) {
        if (dateInfo.reportSent) {
          dateStyle.push(styles.dateCellReportSent);
        } else {
          dateStyle.push(styles.dateCellReportDraft);
        }
      } else if (isPast) {
        dateStyle.push(styles.dateCellMissing);
      }
    }

    return (
      <TouchableOpacity
        key={dateInfo.dateStr}
        style={dateStyle}
        onPress={() => canInteract && onDateSelect(dateInfo.dateStr)}
        disabled={!canInteract}
      >
        <Text style={textStyle}>{dateInfo.date.getDate()}</Text>
        {dateInfo.isReportSlot && (
          <View style={styles.slotIndicatorContainer}>
            {dateInfo.hasReport ? (
              <Ionicons
                name={dateInfo.reportSent ? 'checkmark-circle' : 'document-text'}
                size={12}
                color={dateInfo.reportSent ? colors.success : colors.accent.gold}
              />
            ) : isPast ? (
              <Ionicons name="alert-circle" size={12} color={colors.status.poor} />
            ) : (
              <View style={styles.emptySlotDot} />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Group dates by week
  const weeks: CalendarDate[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => onMonthChange('prev')} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => onMonthChange('next')} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Days of week header */}
      <View style={styles.weekHeader}>
        {daysOfWeek.map(day => (
          <View key={day} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map(dateInfo => renderDate(dateInfo))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.legendText}>Envoyé</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="document-text" size={14} color={colors.accent.gold} />
          <Text style={styles.legendText}>Brouillon</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="alert-circle" size={14} color={colors.status.poor} />
          <Text style={styles.legendText}>Manquant</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  navButton: {
    padding: spacing.sm,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  calendarGrid: {
    marginBottom: spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dateCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    margin: 1,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.secondary,
    position: 'relative',
  },
  dateCellOtherMonth: {
    backgroundColor: 'transparent',
  },
  dateCellToday: {
    borderWidth: 2,
    borderColor: colors.accent.gold,
  },
  dateCellReportSent: {
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.6)',
  },
  dateCellReportDraft: {
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
  },
  dateCellMissing: {
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  dateTextOtherMonth: {
    color: colors.text.muted,
  },
  dateTextToday: {
    fontWeight: '700',
    color: colors.accent.gold,
  },
  dateTextWeekend: {
    color: colors.text.secondary,
  },
  slotIndicatorContainer: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  emptySlotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glass.border,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
});
