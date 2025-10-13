/**
 * Interface d'administration - Configuration de l'assistant vocal
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import {
  loadAssistantConfig,
  saveAssistantConfig,
  AssistantConfig,
  AttentionPoint,
  generateAttentionPointId,
} from '../services/assistantConfig';
import Header from '../components/Header';
import GlassContainer from '../components/GlassContainer';

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

export default function AdminScreen() {
  const [config, setConfig] = useState<AssistantConfig>({
    conversationStyle: 'friendly_colleague',
    attentionPoints: [],
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pointToDelete, setPointToDelete] = useState<string | null>(null);
  const [selectedCommon, setSelectedCommon] = useState<string | null>(null);
  const [customPoint, setCustomPoint] = useState('');
  const [naturalPrompts, setNaturalPrompts] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const loaded = await loadAssistantConfig();
    if (loaded) {
      setConfig(loaded);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await saveAssistantConfig(config);
      Alert.alert('Succès', 'La configuration a été enregistrée avec succès !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la configuration');
    }
  };

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
      id: generateAttentionPointId(description),
      description,
      priority: 'medium',
      naturalPrompts: prompts.length > 0 ? prompts : undefined,
    };

    setConfig({
      ...config,
      attentionPoints: [...config.attentionPoints, newPoint],
    });

    // Reset modal
    setShowAddModal(false);
    setSelectedCommon(null);
    setCustomPoint('');
    setNaturalPrompts('');
  };

  const removePoint = (id: string) => {
    setPointToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (pointToDelete) {
      setConfig((prevConfig) => ({
        ...prevConfig,
        attentionPoints: prevConfig.attentionPoints.filter(p => p.id !== pointToDelete),
      }));
    }
    setShowDeleteModal(false);
    setPointToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPointToDelete(null);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Configuration de l'Assistant</Text>
        </View>

        {/* Ton de l'assistant */}
        <GlassContainer style={styles.section} intensity="medium" shadow>
          <Text style={styles.sectionTitle}>Ton de l'assistant</Text>
          <Text style={styles.sectionSubtitle}>
            Choisissez le style de conversation de l'assistant
          </Text>

          {conversationStyles.map((style) => (
            <TouchableOpacity
              key={style.value}
              style={[
                styles.styleCard,
                config.conversationStyle === style.value && styles.styleCardSelected,
              ]}
              onPress={() =>
                setConfig({
                  ...config,
                  conversationStyle: style.value as AssistantConfig['conversationStyle'],
                })
              }
            >
              <View style={styles.styleCardContent}>
                <View style={styles.styleTextContainer}>
                  <Text style={styles.styleLabel}>{style.label}</Text>
                  <Text style={styles.styleDescription}>{style.description}</Text>
                </View>
              </View>
              {config.conversationStyle === style.value && (
                <Image
                  source={require('../assets/Logo/BulletDark.png')}
                  style={styles.selectedBullet}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          ))}
        </GlassContainer>

        {/* Points d'attention spécifiques */}
        <GlassContainer style={styles.section} intensity="medium" shadow>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Points d'attention spécifiques</Text>
              <Text style={styles.sectionSubtitle}>
                Informations à collecter lors de la conversation
              </Text>
            </View>
          </View>

          {/* Liste des points */}
          {config.attentionPoints.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Aucun point d'attention configuré
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Ajoutez des points pour guider la conversation
              </Text>
            </View>
          ) : (
            config.attentionPoints.map((point, index) => (
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

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removePoint(point.id)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Bouton Ajouter */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>Ajouter un point d'attention</Text>
          </TouchableOpacity>
        </GlassContainer>

        {/* Bouton de sauvegarde */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveConfig}>
          <Image
            source={require('../assets/Logo/BulletYellow.png')}
            style={styles.bulletIcon}
            resizeMode="contain"
          />
          <Text style={styles.saveButtonText}>Sauvegarder la configuration</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
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
                    <Image
                      source={require('../assets/Logo/BulletDark.png')}
                      style={styles.selectedBulletSmall}
                      resizeMode="contain"
                    />
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
                <Image
                  source={require('../assets/Logo/BulletYellow.png')}
                  style={styles.bulletIcon}
                  resizeMode="contain"
                />
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
});
