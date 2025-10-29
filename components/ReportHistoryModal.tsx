/**
 * Report History Modal Component
 * Displays calendar view of report slots with ability to view/create reports
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { ReportSlot } from '../types/project';
import { generateReportSlots, updateSlotsWithReports, findNearestSlot } from '../services/reportSlotsService';
import { getReportsMap, getProjectReports } from '../services/reportsByDateService';
import MonthlyCalendar from './MonthlyCalendar';

interface ReportHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  userName: string; // Filter reports by user
  startDate?: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  reportScheduleType: 'fixed' | 'per-appointment';
  onViewReport: (reportId: string, date: string) => void;
  onCreateReport: (date: string) => void;
}

export default function ReportHistoryModal({
  visible,
  onClose,
  projectId,
  projectName,
  userName,
  startDate,
  frequency,
  reportScheduleType,
  onViewReport,
  onCreateReport,
}: ReportHistoryModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reportsMap, setReportsMap] = useState<Map<string, { id: string; sent: boolean }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadReports();
    }
  }, [visible, projectId]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      // Load all reports for the project
      const reports = await getProjectReports(projectId);

      // Filter reports for current user only
      const userReports = reports.filter(report => report.userName === userName);

      // Build map of reports: date -> {id, sent}
      const map = new Map<string, { id: string; sent: boolean }>();
      userReports.forEach(report => {
        map.set(report.date, {
          id: report.id,
          sent: !!report.sentAt,
        });
      });

      setReportsMap(map);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReportsMap(new Map());
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const handleViewReport = () => {
    if (selectedDate) {
      const reportInfo = reportsMap.get(selectedDate);
      if (reportInfo) {
        onViewReport(reportInfo.id, selectedDate);
        setSelectedDate(null);
        onClose();
      }
    }
  };

  const handleCreateReport = () => {
    if (selectedDate) {
      onCreateReport(selectedDate);
      setSelectedDate(null);
      onClose();
    }
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="calendar" size={24} color={colors.accent.gold} />
            <View>
              <Text style={styles.headerTitle}>Historique des rapports</Text>
              <Text style={styles.headerSubtitle}>{projectName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.gold} />
            <Text style={styles.loadingText}>Chargement du calendrier...</Text>
          </View>
        ) : reportScheduleType === 'fixed' && frequency ? (
          <ScrollView
            style={styles.contentContainer}
            contentContainerStyle={styles.contentPadding}
            showsVerticalScrollIndicator={true}
          >
            <MonthlyCalendar
              currentMonth={currentMonth}
              onDateSelect={handleDateSelect}
              reportsMap={reportsMap}
              frequency={frequency}
              onMonthChange={handleMonthChange}
              startDate={startDate}
            />
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyStateText}>
              Mode par rendez-vous - Les rapports seront créés après chaque visite
            </Text>
          </View>
        )}

        {/* Date Detail Panel */}
        {selectedDate && (() => {
          const reportInfo = reportsMap.get(selectedDate);
          const hasReport = !!reportInfo;
          const selectedDateObj = new Date(selectedDate);
          const isPast = selectedDateObj < new Date();

          return (
            <View style={styles.detailPanel}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>
                  {frequency === 'daily' ? 'Rapport quotidien' :
                   frequency === 'weekly' ? 'Rapport hebdomadaire' :
                   frequency === 'biweekly' ? 'Rapport bimensuel' : 'Rapport mensuel'}
                </Text>
                <Text style={styles.detailDate}>
                  {selectedDateObj.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.detailCancelButton}
                  onPress={() => setSelectedDate(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.detailCancelText}>Annuler</Text>
                </TouchableOpacity>

                {hasReport ? (
                  <TouchableOpacity
                    style={styles.detailViewButton}
                    onPress={handleViewReport}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye" size={18} color={colors.text.primary} />
                    <Text style={styles.detailViewText}>Voir le rapport</Text>
                  </TouchableOpacity>
                ) : isPast ? (
                  <TouchableOpacity
                    style={styles.detailCreateButton}
                    onPress={handleCreateReport}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle" size={18} color={colors.text.primary} />
                    <Text style={styles.detailCreateText}>Générer un rapport</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.detailDisabledButton}>
                    <Text style={styles.detailDisabledText}>Rapport futur</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    backgroundColor: colors.background.secondary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  contentContainer: {
    flex: 1,
  },
  contentPadding: {
    padding: spacing.lg,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  slot: {
    width: '30%',
    aspectRatio: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    justifyContent: 'space-between',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotWithReport: {
    backgroundColor: colors.glass.light,
    borderColor: colors.accent.gold,
    borderWidth: 2,
  },
  slotPastEmpty: {
    backgroundColor: colors.glass.background,
    borderColor: colors.status.poor,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  slotFuture: {
    backgroundColor: colors.glass.background,
    borderColor: colors.glass.border,
    opacity: 0.6,
  },
  slotToday: {
    ...shadows.gold,
  },
  slotSelected: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  todayBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.gold,
  },
  slotText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  slotTextWithReport: {
    color: colors.accent.gold,
  },
  slotTextPastEmpty: {
    color: colors.status.poor,
  },
  slotTextFuture: {
    color: colors.text.secondary,
  },
  slotDate: {
    ...typography.small,
    color: colors.text.secondary,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl * 2,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  detailPanel: {
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    padding: spacing.lg,
    ...shadows.lg,
  },
  detailHeader: {
    marginBottom: spacing.md,
  },
  detailTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  detailDate: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  detailActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailCancelButton: {
    flex: 1,
    backgroundColor: colors.glass.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  detailCancelText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  detailViewButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent.gold,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.gold,
  },
  detailViewText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '700',
  },
  detailCreateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent.gold,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.gold,
  },
  detailCreateText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '700',
  },
  detailDisabledButton: {
    flex: 2,
    backgroundColor: colors.glass.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    opacity: 0.5,
  },
  detailDisabledText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
});
