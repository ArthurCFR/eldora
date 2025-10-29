/**
 * ProjectConfigEditor Component
 * Edit project configuration (attention points, style, etc.)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import type { Project, AttentionPoint } from '../types/project';
import { updateProject } from '../services/projectService';
import CatalogueModal from './CatalogueModal';

// Points d'attention courants prédéfinis
const COMMON_ATTENTION_POINTS = [
  'Produits vendus avec quantités',
  'Retours clients',
  'Ambiance générale de l\'événement',
  'Demandes spécifiques des clients',
  'Produits en rupture de stock',
  'Comparaisons avec la concurrence',
  'Questions fréquentes des clients',
  'Profil des visiteurs (âge, secteur)',
  'Difficultés rencontrées',
  'Best practices identifiées',
  'Opportunités commerciales',
  'Durée de la présence sur le stand',
];

interface ProjectConfigEditorProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export default function ProjectConfigEditor({
  visible,
  project,
  onClose,
  onSave,
}: ProjectConfigEditorProps) {
  const [attentionPoints, setAttentionPoints] = useState<AttentionPoint[]>([]);
  const [conversationStyle, setConversationStyle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration du rapport
  const [reportConfig, setReportConfig] = useState({
    attentionPointsTracking: true,
    productTableTracking: false,
    productSalesTracking: false,
    stockAlertsTracking: false,
    additionalRemarksTracking: false,
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pointToDelete, setPointToDelete] = useState<string | null>(null);
  const [pointToEdit, setPointToEdit] = useState<AttentionPoint | null>(null);
  const [selectedCommon, setSelectedCommon] = useState<string | null>(null);
  const [customPoint, setCustomPoint] = useState('');
  const [naturalPrompts, setNaturalPrompts] = useState('');

  useEffect(() => {
    if (project) {
      setAttentionPoints([...project.attentionPoints]);
      setConversationStyle(project.conversationStyle);

      // Charger la configuration du rapport si elle existe
      if (project.reportTemplate?.configuration) {
        setReportConfig(project.reportTemplate.configuration);
      } else {
        // Configuration par défaut si pas encore définie
        setReportConfig({
          attentionPointsTracking: true,
          productTableTracking: false,
          productSalesTracking: false,
          stockAlertsTracking: false,
          additionalRemarksTracking: false,
        });
      }
    }
  }, [project]);

  const handleAddPoint = () => {
    const description = selectedCommon || customPoint.trim();

    if (!description) {
      Alert.alert('Attention', 'Veuillez sélectionner ou saisir un point d\'attention');
      return;
    }

    const prompts = naturalPrompts
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const newPoint: AttentionPoint = {
      id: `custom_${Date.now()}`,
      description,
      priority: 'medium',
      naturalPrompts: prompts.length > 0 ? prompts : undefined,
    };

    setAttentionPoints([...attentionPoints, newPoint]);

    // Reset modal
    setShowAddModal(false);
    setSelectedCommon(null);
    setCustomPoint('');
    setNaturalPrompts('');
  };

  const editPoint = (point: AttentionPoint) => {
    setPointToEdit(point);
    setCustomPoint(point.description);
    setNaturalPrompts(point.naturalPrompts?.join('\n') || '');
    setShowEditModal(true);
  };

  const handleEditPoint = () => {
    if (!pointToEdit) return;

    const description = customPoint.trim();
    if (!description) {
      Alert.alert('Attention', 'Veuillez saisir une description');
      return;
    }

    const prompts = naturalPrompts
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const updatedPoint: AttentionPoint = {
      ...pointToEdit,
      description,
      naturalPrompts: prompts.length > 0 ? prompts : undefined,
    };

    setAttentionPoints(attentionPoints.map(p => p.id === pointToEdit.id ? updatedPoint : p));

    // Reset modal
    setShowEditModal(false);
    setPointToEdit(null);
    setCustomPoint('');
    setNaturalPrompts('');
  };

  const removePoint = (id: string) => {
    setPointToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (pointToDelete) {
      setAttentionPoints(attentionPoints.filter(p => p.id !== pointToDelete));
    }
    setShowDeleteModal(false);
    setPointToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPointToDelete(null);
  };

  const movePointUp = (index: number) => {
    if (index === 0) return; // Already at top
    const newPoints = [...attentionPoints];
    [newPoints[index - 1], newPoints[index]] = [newPoints[index], newPoints[index - 1]];
    setAttentionPoints(newPoints);
  };

  const movePointDown = (index: number) => {
    if (index === attentionPoints.length - 1) return; // Already at bottom
    const newPoints = [...attentionPoints];
    [newPoints[index], newPoints[index + 1]] = [newPoints[index + 1], newPoints[index]];
    setAttentionPoints(newPoints);
  };

  const handleSave = async () => {
    if (!project) return;

    // Validate - au moins une option de rapport doit être active
    const hasAtLeastOneOption = reportConfig.attentionPointsTracking ||
                                 reportConfig.productTableTracking ||
                                 reportConfig.additionalRemarksTracking;
    if (!hasAtLeastOneOption) {
      setError('Au moins une option de rapport doit être active');
      return;
    }

    // Validate - si productTableTracking activé, au moins une sous-option requise
    if (reportConfig.productTableTracking && !reportConfig.productSalesTracking && !reportConfig.stockAlertsTracking) {
      setError('Sélectionnez au moins une option : Tableau des ventes ou Alertes rupture de stock');
      return;
    }

    // Validate - si points d'attention tracking activé, au moins un point requis
    if (reportConfig.attentionPointsTracking) {
      const validPoints = attentionPoints.filter(p => p.description.trim().length > 0);
      if (validPoints.length === 0) {
        setError('Au moins un point d\'attention est requis si cette option est activée');
        return;
      }
    }

    // Warning si tableaux produits activés sans produits
    if ((reportConfig.productSalesTracking || reportConfig.stockAlertsTracking) && !project.hasProductsTable) {
      Alert.alert(
        'Attention',
        'Le suivi des produits est activé mais aucun fichier produits n\'a été uploadé. Voulez-vous continuer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Continuer', onPress: () => performSave() }
        ]
      );
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    if (!project) return;

    const validPoints = attentionPoints.filter(p => p.description.trim().length > 0);

    setIsLoading(true);
    setError(null);

    try {
      const updated = await updateProject(project.id, {
        attentionPoints: validPoints,
        conversationStyle,
        reportTemplate: {
          ...project.reportTemplate,
          configuration: reportConfig,
        },
      });

      onSave(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const conversationStyles = [
    {
      value: 'friendly_colleague',
      label: 'Collègue sympa',
      description: 'Décontracté, chaleureux et empathique',
    },
    {
      value: 'professional_warm',
      label: 'Professionnel chaleureux',
      description: 'Respectueux mais bienveillant',
    },
    {
      value: 'coach_motivating',
      label: 'Coach motivant',
      description: 'Encourageant et énergique',
    },
    {
      value: 'casual_relaxed',
      label: 'Décontracté',
      description: 'Informel et sans pression',
    },
  ];

  if (!project) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={isLoading}>
            <Ionicons name="close" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuration du projet</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Ton de l'assistant */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ton de l'assistant</Text>
            <Text style={styles.sectionSubtitle}>
              Choisissez le style de conversation de l'assistant
            </Text>

            {conversationStyles.map((style) => (
              <TouchableOpacity
                key={style.value}
                style={[
                  styles.styleCard,
                  conversationStyle === style.value && styles.styleCardSelected,
                ]}
                onPress={() => setConversationStyle(style.value)}
                disabled={isLoading}
              >
                <View style={styles.styleCardContent}>
                  <View style={styles.styleTextContainer}>
                    <Text style={styles.styleLabel}>{style.label}</Text>
                    <Text style={styles.styleDescription}>{style.description}</Text>
                  </View>
                </View>
                {conversationStyle === style.value && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent.gold} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Configuration du rapport */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuration du rapport</Text>
            <Text style={styles.sectionSubtitle}>
              Choisissez les sections à inclure dans les rapports
            </Text>

            {/* Option 1 : Suivi des points d'attention */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                const newValue = !reportConfig.attentionPointsTracking;
                const remainingOptions = [
                  newValue,
                  reportConfig.productTableTracking,
                  reportConfig.additionalRemarksTracking,
                ].filter(Boolean).length;

                if (remainingOptions === 0) {
                  setError('Au moins une option de rapport doit rester active');
                  return;
                }

                setReportConfig({ ...reportConfig, attentionPointsTracking: newValue });
                setError(null);
              }}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, reportConfig.attentionPointsTracking && styles.checkboxChecked]}>
                {reportConfig.attentionPointsTracking && (
                  <Ionicons name="checkmark" size={18} color={colors.text.onDark} />
                )}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxLabel}>Suivi des points d'attention</Text>
                <Text style={styles.checkboxDescription}>
                  L'agent pose des questions sur les points d'attention définis
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2 : Tableau de suivi des produits (PARENT) */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                const newValue = !reportConfig.productTableTracking;
                const remainingOptions = [
                  reportConfig.attentionPointsTracking,
                  newValue,
                  reportConfig.additionalRemarksTracking,
                ].filter(Boolean).length;

                if (remainingOptions === 0) {
                  setError('Au moins une option de rapport doit rester active');
                  return;
                }

                // Si on décoche, décocher aussi les sous-options
                if (!newValue) {
                  setReportConfig({
                    ...reportConfig,
                    productTableTracking: false,
                    productSalesTracking: false,
                    stockAlertsTracking: false,
                  });
                } else {
                  setReportConfig({ ...reportConfig, productTableTracking: newValue });
                }
                setError(null);
              }}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, reportConfig.productTableTracking && styles.checkboxChecked]}>
                {reportConfig.productTableTracking && (
                  <Ionicons name="checkmark" size={18} color={colors.text.onDark} />
                )}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxLabel}>Tableau de suivi des produits</Text>
                <Text style={styles.checkboxDescription}>
                  Suivi des produits vendus et/ou alertes de stock
                  {!project.hasProductsTable && ' (⚠️ aucun fichier produits uploadé)'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Sous-options conditionnelles */}
            {reportConfig.productTableTracking && (
              <View style={styles.subOptionsContainer}>
                {/* Sous-option 2a : Tableau des ventes */}
                <TouchableOpacity
                  style={styles.subCheckboxRow}
                  onPress={() => {
                    setReportConfig({
                      ...reportConfig,
                      productSalesTracking: !reportConfig.productSalesTracking
                    });
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  <View style={[styles.subCheckbox, reportConfig.productSalesTracking && styles.subCheckboxChecked]}>
                    {reportConfig.productSalesTracking && (
                      <Ionicons name="checkmark" size={14} color={colors.text.onDark} />
                    )}
                  </View>
                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.subCheckboxLabel}>Tableau des ventes</Text>
                    <Text style={styles.subCheckboxDescription}>
                      Quantités et montants des produits vendus
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Sous-option 2b : Alertes rupture de stock */}
                <TouchableOpacity
                  style={styles.subCheckboxRow}
                  onPress={() => {
                    setReportConfig({
                      ...reportConfig,
                      stockAlertsTracking: !reportConfig.stockAlertsTracking
                    });
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  <View style={[styles.subCheckbox, reportConfig.stockAlertsTracking && styles.subCheckboxChecked]}>
                    {reportConfig.stockAlertsTracking && (
                      <Ionicons name="checkmark" size={14} color={colors.text.onDark} />
                    )}
                  </View>
                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.subCheckboxLabel}>Alertes de rupture de stock</Text>
                    <Text style={styles.subCheckboxDescription}>
                      Remontée des produits en risque de rupture (Oui/Non)
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Option 3 : Remarques complémentaires */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                const newValue = !reportConfig.additionalRemarksTracking;
                const remainingOptions = [
                  reportConfig.attentionPointsTracking,
                  reportConfig.productTableTracking,
                  newValue,
                ].filter(Boolean).length;

                if (remainingOptions === 0) {
                  setError('Au moins une option de rapport doit rester active');
                  return;
                }

                setReportConfig({ ...reportConfig, additionalRemarksTracking: newValue });
                setError(null);
              }}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, reportConfig.additionalRemarksTracking && styles.checkboxChecked]}>
                {reportConfig.additionalRemarksTracking && (
                  <Ionicons name="checkmark" size={18} color={colors.text.onDark} />
                )}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxLabel}>Remarques complémentaires</Text>
                <Text style={styles.checkboxDescription}>
                  Capture automatique des informations pertinentes additionnelles
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Points d'attention spécifiques */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Points d'attention spécifiques</Text>
                <Text style={styles.sectionSubtitle}>
                  Informations à collecter lors de la conversation
                </Text>
              </View>
            </View>

            {/* Liste des points */}
            {attentionPoints.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Aucun point d'attention configuré
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Ajoutez des points pour guider la conversation
                </Text>
              </View>
            ) : (
              attentionPoints.map((point, index) => (
                <View key={point.id} style={styles.pointCard}>
                  <View style={styles.pointCardContent}>
                    <View style={styles.pointHeader}>
                      <View style={styles.pointNumber}>
                        <Text style={styles.pointNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.pointDescription}>{point.description}</Text>
                    </View>

                    {point.naturalPrompts && point.naturalPrompts.length > 0 && (
                      <View style={styles.promptsContainer}>
                        <Text style={styles.promptsLabel}>Questions :</Text>
                        <Text style={styles.promptsText} numberOfLines={2}>
                          {point.naturalPrompts[0]}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.pointActions}>
                    {/* Edit button */}
                    <TouchableOpacity
                      style={styles.editPointButton}
                      onPress={() => editPoint(point)}
                      disabled={isLoading}
                    >
                      <Ionicons name="pencil" size={16} color={colors.accent.gold} />
                    </TouchableOpacity>

                    {/* Reorder buttons */}
                    <View style={styles.reorderButtons}>
                      <TouchableOpacity
                        style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                        onPress={() => movePointUp(index)}
                        disabled={isLoading || index === 0}
                      >
                        <Ionicons name="arrow-up" size={16} color={index === 0 ? colors.text.secondary : colors.accent.gold} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reorderButton, index === attentionPoints.length - 1 && styles.reorderButtonDisabled]}
                        onPress={() => movePointDown(index)}
                        disabled={isLoading || index === attentionPoints.length - 1}
                      >
                        <Ionicons name="arrow-down" size={16} color={index === attentionPoints.length - 1 ? colors.text.secondary : colors.accent.gold} />
                      </TouchableOpacity>
                    </View>

                    {/* Delete button */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removePoint(point.id)}
                      disabled={isLoading}
                    >
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Bouton Ajouter */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
              disabled={isLoading}
            >
              <Text style={styles.addButtonText}>Ajouter un point d'attention</Text>
            </TouchableOpacity>

            {/* Bouton Catalogue - shown only if project has products */}
            {project?.hasProductsTable && project?.products && project.products.length > 0 && (
              <TouchableOpacity
                style={styles.catalogueButtonAdmin}
                onPress={() => setShowCatalogueModal(true)}
              >
                <Ionicons name="book-outline" size={20} color={colors.text.primary} />
                <Text style={styles.catalogueButtonText}>Voir le catalogue</Text>
              </TouchableOpacity>
            )}
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={colors.accent.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Bouton de sauvegarde */}
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={colors.text.primary} />
                <Text style={styles.saveButtonText}>Enregistrer la configuration</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Modal d'ajout */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <KeyboardAvoidingView
              style={styles.modalContent}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouveau point d'attention</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                {/* Points courants */}
                <Text style={styles.modalSectionTitle}>Points courants</Text>
                <Text style={styles.modalSectionSubtitle}>
                  Sélectionnez un point prédéfini
                </Text>

                {COMMON_ATTENTION_POINTS.map((point) => (
                  <TouchableOpacity
                    key={point}
                    style={[
                      styles.commonPointCard,
                      selectedCommon === point && styles.commonPointCardSelected,
                    ]}
                    onPress={() => {
                      setSelectedCommon(point);
                      setCustomPoint('');
                    }}
                  >
                    <Text style={styles.commonPointText}>{point}</Text>
                    {selectedCommon === point && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent.gold} />
                    )}
                  </TouchableOpacity>
                ))}

                {/* Point personnalisé */}
                <Text style={[styles.modalSectionTitle, { marginTop: spacing.xl }]}>
                  Point personnalisé
                </Text>
                <Text style={styles.modalSectionSubtitle}>
                  Ou créez votre propre point d'attention
                </Text>

                <TextInput
                  style={styles.customInput}
                  placeholder="Ex: Niveau de satisfaction des visiteurs"
                  value={customPoint}
                  onChangeText={(text) => {
                    setCustomPoint(text);
                    setSelectedCommon(null);
                  }}
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                />

                {/* Questions naturelles (optionnel) */}
                <Text style={[styles.modalSectionTitle, { marginTop: spacing.lg }]}>
                  Questions naturelles (optionnel)
                </Text>
                <Text style={styles.modalSectionSubtitle}>
                  Une question par ligne pour guider la conversation
                </Text>

                <TextInput
                  style={[styles.customInput, styles.textArea]}
                  placeholder="Ex: Comment ont réagi les visiteurs ?&#10;Qu'est-ce qui leur a plu ?"
                  value={naturalPrompts}
                  onChangeText={setNaturalPrompts}
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity style={styles.modalAddButton} onPress={handleAddPoint}>
                  <Ionicons name="add-circle" size={24} color={colors.text.primary} />
                  <Text style={styles.modalAddButtonText}>Ajouter ce point</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>

        {/* Modal de confirmation de suppression */}
        <Modal
          visible={showDeleteModal}
          animationType="fade"
          transparent
          onRequestClose={cancelDelete}
        >
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>Supprimer</Text>
              <Text style={styles.deleteModalMessage}>
                Êtes-vous sûr de vouloir supprimer ce point d'attention ?
              </Text>

              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                  onPress={cancelDelete}
                >
                  <Text style={styles.deleteModalButtonTextCancel}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteModalButtonConfirm]}
                  onPress={confirmDelete}
                >
                  <Text style={styles.deleteModalButtonTextConfirm}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal d'édition */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <KeyboardAvoidingView
              style={styles.modalContent}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Modifier le point d'attention</Text>
                <TouchableOpacity onPress={() => {
                  setShowEditModal(false);
                  setPointToEdit(null);
                  setCustomPoint('');
                  setNaturalPrompts('');
                }}>
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                {/* Description du point */}
                <Text style={styles.modalSectionTitle}>Description</Text>
                <Text style={styles.modalSectionSubtitle}>
                  Décrivez le point d'attention à collecter
                </Text>

                <TextInput
                  style={styles.customInput}
                  placeholder="Ex: Niveau de satisfaction des visiteurs"
                  value={customPoint}
                  onChangeText={setCustomPoint}
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                />

                {/* Questions naturelles (optionnel) */}
                <Text style={[styles.modalSectionTitle, { marginTop: spacing.lg }]}>
                  Questions naturelles (optionnel)
                </Text>
                <Text style={styles.modalSectionSubtitle}>
                  Une question par ligne pour guider la conversation
                </Text>

                <TextInput
                  style={[styles.customInput, styles.textArea]}
                  placeholder="Ex: Comment ont réagi les visiteurs ?&#10;Qu'est-ce qui leur a plu ?"
                  value={naturalPrompts}
                  onChangeText={setNaturalPrompts}
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity style={styles.modalAddButton} onPress={handleEditPoint}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.text.primary} />
                  <Text style={styles.modalAddButtonText}>Enregistrer les modifications</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>

        {/* Modal Catalogue */}
        <CatalogueModal
          visible={showCatalogueModal}
          onClose={() => setShowCatalogueModal(false)}
          products={project?.products || []}
          projectName={project?.name || 'Projet'}
        />
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
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  sectionHeader: {
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
  pointActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editPointButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  reorderButtons: {
    flexDirection: 'column',
    gap: spacing.xs / 2,
  },
  reorderButton: {
    width: 32,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  deleteButton: {
    padding: spacing.sm,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  errorText: {
    flex: 1,
    ...typography.body,
    color: colors.accent.danger,
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
    marginTop: spacing.lg,
    ...shadows.gold,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.gold,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
    ...shadows.gold,
  },
  modalAddButtonText: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.glass.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.accent.gold,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  checkboxDescription: {
    ...typography.small,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  catalogueButtonAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    ...shadows.gold,
  },
  catalogueButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  // Styles pour les sous-options
  subOptionsContainer: {
    marginLeft: spacing.xl,
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent.gold,
  },
  subCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.glass.light,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  subCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.glass.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  subCheckboxChecked: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.accent.gold,
  },
  subCheckboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  subCheckboxDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
});
