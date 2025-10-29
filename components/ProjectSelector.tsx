/**
 * ProjectSelector Component
 * Dropdown selector for choosing a project
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { listProjects } from '../services/projectService';
import { ProjectListItem } from '../types/project';

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  disabled?: boolean;
}

export default function ProjectSelector({
  selectedProjectId,
  onProjectSelect,
  disabled = false,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projectsList = await listProjects();
      setProjects(projectsList);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleSelectProject = (projectId: string) => {
    onProjectSelect(projectId);
    setShowModal(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled}
      >
        <View style={styles.selectorContent}>
          <Ionicons name="folder" size={20} color={colors.accent.gold} />
          <View style={styles.selectorText}>
            <Text style={styles.selectorLabel}>Projet</Text>
            <Text style={styles.selectorValue}>
              {isLoading
                ? 'Chargement...'
                : selectedProject
                ? selectedProject.name
                : 'Sélectionner un projet'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un projet</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent.gold} />
              <Text style={styles.loadingText}>Chargement des projets...</Text>
            </View>
          ) : projects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyStateText}>Aucun projet disponible</Text>
              <Text style={styles.emptyStateSubtext}>
                Demandez à un administrateur de créer un projet
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.projectList} contentContainerStyle={styles.projectListContent}>
              {projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.projectCard,
                    selectedProjectId === project.id && styles.projectCardSelected,
                  ]}
                  onPress={() => handleSelectProject(project.id)}
                >
                  <View style={styles.projectCardHeader}>
                    <Ionicons
                      name="folder"
                      size={24}
                      color={
                        selectedProjectId === project.id ? colors.accent.gold : colors.text.secondary
                      }
                    />
                    <Text style={styles.projectCardTitle}>{project.name}</Text>
                    {selectedProjectId === project.id && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.accent.gold} />
                    )}
                  </View>
                  <Text style={styles.projectCardDescription} numberOfLines={2}>
                    {project.description}
                  </Text>
                  {project.industry && (
                    <View style={styles.industryBadge}>
                      <Text style={styles.industryBadgeText}>
                        {project.industry === 'pharma' && 'Pharmacie'}
                        {project.industry === 'retail' && 'Retail'}
                        {project.industry === 'b2b' && 'B2B'}
                        {project.industry === 'general' && 'Général'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  selectorText: {
    flex: 1,
  },
  selectorLabel: {
    ...typography.small,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  selectorValue: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyStateText: {
    ...typography.h3,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...typography.body,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  projectList: {
    flex: 1,
  },
  projectListContent: {
    padding: spacing.lg,
  },
  projectCard: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  projectCardSelected: {
    borderColor: colors.accent.gold,
    backgroundColor: 'rgba(245, 197, 66, 0.1)',
  },
  projectCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  projectCardTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  projectCardDescription: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  industryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.glass.medium,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  industryBadgeText: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
