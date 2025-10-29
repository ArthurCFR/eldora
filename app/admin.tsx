/**
 * Interface d'administration - Configuration de l'assistant vocal et gestion des projets
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { listProjects, deleteProject } from '../services/projectService';
import type { Project, ProjectListItem } from '../types/project';
import Header from '../components/Header';
import GlassContainer from '../components/GlassContainer';
import ProjectCreator from '../components/ProjectCreator';
import ProjectConfigEditor from '../components/ProjectConfigEditor';

export default function AdminScreen() {
  // Projects state
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [showProjectEditor, setShowProjectEditor] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const projectsList = await listProjects();
      setProjects(projectsList);
    } catch (error) {
      console.error('Error loading projects:', error);
      Alert.alert('Erreur', 'Impossible de charger les projets');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    console.log('handleDeleteProject called with:', projectId);

    // On web, Alert.alert with buttons doesn't work - use window.confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ?');
      if (!confirmed) return;

      try {
        console.log('Deleting project:', projectId);
        await deleteProject(projectId);
        console.log('Project deleted, reloading...');
        await loadProjects();
        Alert.alert('Succès', 'Projet supprimé avec succès');
      } catch (error) {
        console.error('Delete error:', error);
        Alert.alert('Erreur', 'Impossible de supprimer le projet');
      }
    } else {
      // Native mobile - use Alert.alert with buttons
      Alert.alert(
        'Confirmer la suppression',
        'Êtes-vous sûr de vouloir supprimer ce projet ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Deleting project:', projectId);
                await deleteProject(projectId);
                console.log('Project deleted, reloading...');
                await loadProjects();
                Alert.alert('Succès', 'Projet supprimé avec succès');
              } catch (error) {
                console.error('Delete error:', error);
                Alert.alert('Erreur', 'Impossible de supprimer le projet');
              }
            },
          },
        ]
      );
    }
  };

  const handleProjectCreated = (project: Project) => {
    loadProjects();
    Alert.alert('Succès', `Projet "${project.name}" créé avec succès !`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Administration</Text>
        </View>

        {/* Info text */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.accent.gold} />
          <Text style={styles.infoText}>
            Gérez vos projets d'assistant vocal. Chaque projet a sa propre configuration.
          </Text>
        </View>

        {/* Projects Section */}
        <GlassContainer style={styles.section} intensity="medium" shadow>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Mes projets</Text>
                  <Text style={styles.sectionSubtitle}>
                    Gérez vos projets d'assistant vocal
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.createProjectButton}
                onPress={() => setShowProjectCreator(true)}
              >
                <Ionicons name="add-circle" size={24} color={colors.text.primary} />
                <Text style={styles.createProjectButtonText}>Créer un projet</Text>
              </TouchableOpacity>

              {isLoadingProjects ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent.gold} />
                  <Text style={styles.loadingText}>Chargement des projets...</Text>
                </View>
              ) : projects.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={64} color={colors.text.tertiary} />
                  <Text style={styles.emptyStateText}>Aucun projet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Créez votre premier projet pour commencer
                  </Text>
                </View>
              ) : (
                projects.map((project) => (
                  <View key={project.id} style={styles.projectCard}>
                    <View style={styles.projectCardHeader}>
                      <View style={styles.projectCardTitleContainer}>
                        <Ionicons name="folder" size={24} color={colors.accent.gold} />
                        <Text style={styles.projectCardTitle}>{project.name}</Text>
                      </View>
                      <View style={styles.projectCardActions}>
                        <TouchableOpacity
                          style={styles.projectActionButton}
                          onPress={async () => {
                            // Load full project data and open editor
                            try {
                              const { getProject } = await import('../services/projectService');
                              const fullProject = await getProject(project.id);
                              setSelectedProject(fullProject);
                              setShowProjectEditor(true);
                            } catch (error) {
                              Alert.alert('Erreur', 'Impossible de charger le projet');
                            }
                          }}
                        >
                          <Ionicons name="pencil-outline" size={20} color={colors.accent.gold} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.projectActionButton}
                          onPress={() => {
                            console.log('Trash icon clicked for project:', project.id);
                            handleDeleteProject(project.id);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.accent.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.projectCardDescription} numberOfLines={2}>
                      {project.description}
                    </Text>

                    <View style={styles.projectCardFooter}>
                      <View style={styles.projectCardMeta}>
                        <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} />
                        <Text style={styles.projectCardMetaText}>
                          {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
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
                    </View>
                  </View>
                ))
              )}
        </GlassContainer>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Project Creator Modal */}
      <ProjectCreator
        visible={showProjectCreator}
        onClose={() => setShowProjectCreator(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Project Config Editor Modal */}
      {selectedProject && (
        <ProjectConfigEditor
          visible={showProjectEditor}
          project={selectedProject}
          onClose={() => {
            setShowProjectEditor(false);
            setSelectedProject(null);
          }}
          onSave={(updated) => {
            loadProjects();
            setShowProjectEditor(false);
            setSelectedProject(null);
            Alert.alert('Succès', 'Configuration mise à jour');
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  styleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.glass.border,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.sm,
  },
  styleCardSelected: {
    borderColor: colors.accent.gold,
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
  },
  styleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  styleTextContainer: {
    flex: 1,
  },
  styleLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  styleDescription: {
    ...typography.small,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    ...typography.small,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  pointCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  pointCardContent: {
    flex: 1,
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pointNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointNumberText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '700',
  },
  pointDescription: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  promptsContainer: {
    marginTop: spacing.sm,
    paddingLeft: 36,
  },
  promptsLabel: {
    ...typography.small,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  promptsText: {
    ...typography.small,
    color: colors.text.secondary,
    fontStyle: 'italic',
    flex: 1,
  },
  deleteButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.accent.danger,
    lineHeight: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.gold,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    ...shadows.gold,
  },
  addButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.gold,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    ...shadows.gold,
  },
  saveButtonText: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  spacer: {
    height: spacing.xl,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalContent: {
    flex: 1,
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
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.lg,
  },
  modalSectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalSectionSubtitle: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  commonPointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.sm,
  },
  commonPointCardSelected: {
    borderColor: colors.accent.gold,
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
  },
  commonPointText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  customInput: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text.primary,
    minHeight: 50,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalAddButton: {
    backgroundColor: colors.accent.gold,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.gold,
  },
  modalAddButtonText: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  bulletIcon: {
    width: 24,
    height: 24,
  },
  selectedBullet: {
    width: 20,
    height: 20,
  },
  selectedBulletSmall: {
    width: 16,
    height: 16,
  },
  closeButton: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.text.secondary,
    lineHeight: 36,
  },
  // Delete modal styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteModalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  deleteModalTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  deleteModalMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteModalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  deleteModalButtonCancel: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  deleteModalButtonConfirm: {
    backgroundColor: colors.accent.danger,
  },
  deleteModalButtonTextCancel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  deleteModalButtonTextConfirm: {
    ...typography.bodyMedium,
    color: colors.background.primary,
    fontWeight: '600',
  },
  helperText: {
    ...typography.small,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  insertVariableButton: {
    backgroundColor: colors.glass.medium,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  insertVariableButtonText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
  },
  previewContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.glass.light,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  previewLabel: {
    ...typography.small,
    color: colors.text.tertiary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  previewText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 24,
  },
  variableTag: {
    backgroundColor: 'rgba(150, 150, 150, 0.25)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginHorizontal: 2,
  },
  variableTagText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  previewHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(245, 197, 66, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 66, 0.3)',
  },
  infoText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  // Tab switcher styles (deprecated - keeping for compatibility)
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: 'rgba(245, 197, 66, 0.15)',
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.accent.gold,
    fontWeight: '600',
  },
  // Project card styles
  createProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.gold,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    ...shadows.gold,
  },
  createProjectButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  projectCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  projectCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  projectCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  projectCardTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  projectCardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  projectActionButton: {
    padding: spacing.sm,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectCardDescription: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  projectCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  projectCardMetaText: {
    ...typography.small,
    color: colors.text.tertiary,
  },
  industryBadge: {
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
