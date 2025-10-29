/**
 * ProjectCreator Component
 * Form for creating a new project with Claude analysis
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';
import FileUploader from './FileUploader';
import { createProject, uploadDocument, updateProject, getProject } from '../services/projectService';
import { analyzeProjectWithClaude } from '../services/claudeProjectAnalyzer';
import { Project } from '../types/project';

interface ProjectCreatorProps {
  visible: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export default function ProjectCreator({
  visible,
  onClose,
  onProjectCreated,
}: ProjectCreatorProps) {
  const [step, setStep] = useState<'form' | 'analyzing' | 'review'>('form');
  const [name, setName] = useState('');
  const [description, setDescription] = useState(''); // DEPRECATED - kept for backward compatibility
  const [companyContext, setCompanyContext] = useState('');
  const [reportContext, setReportContext] = useState('');
  const [reportGoal, setReportGoal] = useState('');
  const [industry, setIndustry] = useState('general');
  const [reportScheduleType, setReportScheduleType] = useState<'fixed' | 'per-appointment'>('fixed');
  const [reportFrequency, setReportFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState(new Date()); // Date de début du projet
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [collaboratorsText, setCollaboratorsText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Configuration du rapport - Option 1 active par défaut
  const [reportConfig, setReportConfig] = useState({
    attentionPointsTracking: true,
    productTableTracking: false, // Parent: active les tableaux produits
    productSalesTracking: false, // Sous-option: tableau des ventes
    stockAlertsTracking: false, // Sous-option: alertes rupture de stock
    additionalRemarksTracking: false,
  });

  const [analyzedConfig, setAnalyzedConfig] = useState<any>(null);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
  };

  const handleSubmitToClaude = async () => {
    if (!name.trim()) {
      setError('Le nom du projet est requis');
      return;
    }

    if (!companyContext.trim()) {
      setError('Le contexte de l\'entreprise est requis');
      return;
    }

    if (!reportContext.trim()) {
      setError('Le contexte du rapport est requis');
      return;
    }

    if (!reportGoal.trim()) {
      setError('Le but du rapport est requis');
      return;
    }

    // Validation : Au moins une option doit être active
    const hasAtLeastOneOption = reportConfig.attentionPointsTracking ||
                                 reportConfig.productTableTracking ||
                                 reportConfig.additionalRemarksTracking;
    if (!hasAtLeastOneOption) {
      setError('Au moins une option de rapport doit être sélectionnée');
      return;
    }

    // Validation : Si tableau produits est sélectionné, au moins une sous-option doit être cochée
    if (reportConfig.productTableTracking && !reportConfig.productSalesTracking && !reportConfig.stockAlertsTracking) {
      setError('Sélectionnez au moins une option : Tableau des ventes ou Alertes rupture de stock');
      return;
    }

    // Validation : Si une sous-option tableau est sélectionnée, un fichier Excel est obligatoire
    if ((reportConfig.productSalesTracking || reportConfig.stockAlertsTracking) && !file) {
      setError('Un fichier Excel des produits est obligatoire pour le suivi des produits');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('analyzing');

    try {
      // Parse collaborators (split by comma or newline, trim whitespace)
      const collaborators = collaboratorsText
        .split(/[,\n]+/)
        .map(c => c.trim())
        .filter(c => c.length > 0);

      // 1. Create project with basic info
      // Build combined description for Claude analysis (backward compatibility)
      const combinedDescription = `${companyContext.trim()}\n\n${reportContext.trim()}\n\n${reportGoal.trim()}`;

      const project = await createProject({
        name: name.trim(),
        description: combinedDescription, // For backward compatibility and Claude analysis
        companyContext: companyContext.trim(),
        reportContext: reportContext.trim(),
        reportGoal: reportGoal.trim(),
        startDate: startDate.toISOString(),
        settings: {
          industry,
          reportType: 'visit',
          language: 'fr',
          reportScheduleType,
          reportFrequency: reportScheduleType === 'fixed' ? reportFrequency : undefined,
        },
      });

      setCreatedProject(project);

      // 2. Upload file if present
      if (file && (reportConfig.productSalesTracking || reportConfig.stockAlertsTracking)) {
        await uploadDocument(project.id, file);
      }

      // 3. Analyze with Claude
      const analysis = await analyzeProjectWithClaude(
        project.name,
        project.description,
        [] // Products will be loaded server-side
      );

      setAnalyzedConfig(analysis);
      setStep('review');
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Erreur lors de la création du projet');
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmProject = async () => {
    if (!createdProject || !analyzedConfig) return;

    setIsLoading(true);
    try {
      // Parse collaborators again
      const collaborators = collaboratorsText
        .split(/[,\n]+/)
        .map(c => c.trim())
        .filter(c => c.length > 0);

      // Update project with Claude's configuration + collaborators + report config + table structure
      const updatedProject = await updateProject(createdProject.id, {
        attentionPoints: analyzedConfig.attentionPoints,
        conversationStyle: analyzedConfig.conversationStyle,
        userFacingDescription: analyzedConfig.userFacingDescription, // Description courte pour l'utilisateur
        reportTemplate: {
          ...analyzedConfig.reportTemplate,
          configuration: reportConfig,
        },
        collaborators: collaborators.length > 0 ? collaborators : undefined,
        hasProductsTable: !!file, // Indique si un fichier produits a été uploadé
      });

      onProjectCreated(updatedProject);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la finalisation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setName('');
    setDescription('');
    setCompanyContext('');
    setReportContext('');
    setReportGoal('');
    setIndustry('general');
    setReportScheduleType('fixed');
    setReportFrequency('daily');
    setStartDate(new Date());
    setCollaboratorsText('');
    setFile(null);
    setError(null);
    setAnalyzedConfig(null);
    setCreatedProject(null);
    onClose();
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} disabled={isLoading}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {step === 'form' && 'Créer un projet'}
              {step === 'analyzing' && 'Analyse en cours...'}
              {step === 'review' && 'Configuration générée'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 'form' && (
              <View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nom du projet *</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Visites Pharmacie"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Contexte de l'entreprise *</Text>
                  <Text style={styles.hint}>
                    Décrivez votre entreprise, son secteur d'activité, et le contexte général du projet
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={companyContext}
                    onChangeText={setCompanyContext}
                    placeholder="Ex: Nous sommes une PME distribuant des produits biologiques auprès de pharmacies indépendantes..."
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Contexte du rapport *</Text>
                  <Text style={styles.hint}>
                    Décrivez dans quel contexte se déroulent les rapports (visites clients, travail en magasin, salon professionnel...)
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reportContext}
                    onChangeText={setReportContext}
                    placeholder="Ex: Nos commerciaux visitent les pharmacies pour présenter nos nouveaux produits et recueillir les retours terrain..."
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>But du rapport *</Text>
                  <Text style={styles.hint}>
                    Quel est l'objectif de ces rapports ? Comment seront-ils utilisés ?
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reportGoal}
                    onChangeText={setReportGoal}
                    placeholder="Ex: Suivre l'activité commerciale, identifier les opportunités de vente croisée, et remonter les besoins du terrain..."
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Secteur d'activité</Text>
                  <View style={styles.industryButtons}>
                    {['pharma', 'retail', 'b2b', 'general'].map((ind) => (
                      <TouchableOpacity
                        key={ind}
                        style={[
                          styles.industryButton,
                          industry === ind && styles.industryButtonActive,
                        ]}
                        onPress={() => setIndustry(ind)}
                      >
                        <Text
                          style={[
                            styles.industryButtonText,
                            industry === ind && styles.industryButtonTextActive,
                          ]}
                        >
                          {ind === 'pharma' && 'Pharmacie'}
                          {ind === 'retail' && 'Retail'}
                          {ind === 'b2b' && 'B2B'}
                          {ind === 'general' && 'Général'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Type de rapport *</Text>
                  <Text style={styles.hint}>
                    Sélectionnez le type de planification de vos rapports
                  </Text>
                  <View style={styles.industryButtons}>
                    <TouchableOpacity
                      style={[
                        styles.reportTypeButton,
                        reportScheduleType === 'fixed' && styles.reportTypeButtonActive,
                      ]}
                      onPress={() => setReportScheduleType('fixed')}
                    >
                      <Ionicons
                        name="calendar"
                        size={20}
                        color={reportScheduleType === 'fixed' ? colors.accent.gold : colors.text.secondary}
                      />
                      <View style={styles.reportTypeTextContainer}>
                        <Text
                          style={[
                            styles.reportTypeButtonText,
                            reportScheduleType === 'fixed' && styles.reportTypeButtonTextActive,
                          ]}
                        >
                          Rapports fixes et réguliers
                        </Text>
                        <Text style={styles.reportTypeDescription}>
                          Point de vente, salon, localisation fixe
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.reportTypeButton,
                        reportScheduleType === 'per-appointment' && styles.reportTypeButtonActive,
                      ]}
                      onPress={() => setReportScheduleType('per-appointment')}
                    >
                      <Ionicons
                        name="people"
                        size={20}
                        color={reportScheduleType === 'per-appointment' ? colors.accent.gold : colors.text.secondary}
                      />
                      <View style={styles.reportTypeTextContainer}>
                        <Text
                          style={[
                            styles.reportTypeButtonText,
                            reportScheduleType === 'per-appointment' && styles.reportTypeButtonTextActive,
                          ]}
                        >
                          Rapport par rendez-vous
                        </Text>
                        <Text style={styles.reportTypeDescription}>
                          Visites clients, voyageur de commerce
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {reportScheduleType === 'fixed' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Fréquence des rapports *</Text>
                    <Text style={styles.hint}>
                      À quelle fréquence les rapports doivent-ils être créés ?
                    </Text>
                    <View style={styles.industryButtons}>
                      {[
                        { value: 'daily', label: 'Quotidien' },
                        { value: 'weekly', label: 'Hebdomadaire' },
                        { value: 'biweekly', label: 'Bimensuel' },
                        { value: 'monthly', label: 'Mensuel' },
                      ].map((freq) => (
                        <TouchableOpacity
                          key={freq.value}
                          style={[
                            styles.industryButton,
                            reportFrequency === freq.value && styles.industryButtonActive,
                          ]}
                          onPress={() => setReportFrequency(freq.value as any)}
                        >
                          <Text
                            style={[
                              styles.industryButtonText,
                              reportFrequency === freq.value && styles.industryButtonTextActive,
                            ]}
                          >
                            {freq.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Date de début du projet *</Text>
                  <Text style={styles.hint}>
                    Cette date définit le point de départ du calendrier des rapports.
                    Peut être dans le passé si vous créez le projet rétroactivement.
                  </Text>
                  <View style={styles.datePickerContainer}>
                    <Ionicons name="calendar-outline" size={20} color={colors.accent.gold} />
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => {
                        setTempDate(startDate);
                        setShowDatePicker(true);
                      }}
                    >
                      <Text style={styles.dateButtonText}>
                        {startDate.toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Configuration du rapport</Text>
                  <Text style={styles.hint}>
                    Sélectionnez les sections à inclure dans le rapport (au moins une option requise)
                  </Text>

                  {/* Option 1 : Suivi des points d'attention */}
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => {
                      const newValue = !reportConfig.attentionPointsTracking;
                      // Empêcher de désactiver la dernière option
                      const remainingOptions = [
                        newValue,
                        reportConfig.salesTableTracking,
                        reportConfig.additionalRemarksTracking,
                      ].filter(Boolean).length;

                      if (remainingOptions === 0) {
                        setError('Au moins une option de rapport doit rester active');
                        return;
                      }

                      setReportConfig({ ...reportConfig, attentionPointsTracking: newValue });
                      setError(null);
                    }}
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
                    style={styles.checkboxContainer}
                    onPress={() => {
                      const newValue = !reportConfig.productTableTracking;
                      // Empêcher de désactiver la dernière option
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
                  >
                    <View style={[styles.checkbox, reportConfig.productTableTracking && styles.checkboxChecked]}>
                      {reportConfig.productTableTracking && (
                        <Ionicons name="checkmark" size={18} color={colors.text.onDark} />
                      )}
                    </View>
                    <View style={styles.checkboxTextContainer}>
                      <Text style={styles.checkboxLabel}>Tableau de suivi des produits</Text>
                      <Text style={styles.checkboxDescription}>
                        Suivi des produits vendus et/ou alertes de stock (nécessite un fichier Excel)
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Sous-options conditionnelles */}
                  {reportConfig.productTableTracking && (
                    <View style={styles.subOptionsContainer}>
                      {/* Sous-option 2a : Tableau des ventes */}
                      <TouchableOpacity
                        style={styles.subCheckboxContainer}
                        onPress={() => {
                          setReportConfig({
                            ...reportConfig,
                            productSalesTracking: !reportConfig.productSalesTracking
                          });
                          setError(null);
                        }}
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
                        style={styles.subCheckboxContainer}
                        onPress={() => {
                          setReportConfig({
                            ...reportConfig,
                            stockAlertsTracking: !reportConfig.stockAlertsTracking
                          });
                          setError(null);
                        }}
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
                    style={styles.checkboxContainer}
                    onPress={() => {
                      const newValue = !reportConfig.additionalRemarksTracking;
                      // Empêcher de désactiver la dernière option
                      const remainingOptions = [
                        reportConfig.attentionPointsTracking,
                        reportConfig.salesTableTracking,
                        newValue,
                      ].filter(Boolean).length;

                      if (remainingOptions === 0) {
                        setError('Au moins une option de rapport doit rester active');
                        return;
                      }

                      setReportConfig({ ...reportConfig, additionalRemarksTracking: newValue });
                      setError(null);
                    }}
                  >
                    <View style={[styles.checkbox, reportConfig.additionalRemarksTracking && styles.checkboxChecked]}>
                      {reportConfig.additionalRemarksTracking && (
                        <Ionicons name="checkmark" size={18} color={colors.text.onDark} />
                      )}
                    </View>
                    <View style={styles.checkboxTextContainer}>
                      <Text style={styles.checkboxLabel}>Remarques complémentaires</Text>
                      <Text style={styles.checkboxDescription}>
                        Capture automatique des informations pertinentes non couvertes par les points d'attention
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Collaborateurs autorisés</Text>
                  <Text style={styles.hint}>
                    Entrez les prénoms des collaborateurs autorisés (séparés par des virgules ou des retours à la ligne)
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={collaboratorsText}
                    onChangeText={setCollaboratorsText}
                    placeholder="Ex: Thomas, Marie, Jean&#10;Sophie, Lucas"
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Documents (Excel, PDF)
                    {(reportConfig.productSalesTracking || reportConfig.stockAlertsTracking) && <Text style={styles.requiredAsterisk}> *</Text>}
                  </Text>
                  {(reportConfig.productSalesTracking || reportConfig.stockAlertsTracking) && (
                    <Text style={[styles.hint, { color: colors.accent.gold }]}>
                      ⚠️ Fichier Excel obligatoire pour le suivi des produits
                    </Text>
                  )}
                  <FileUploader
                    onFileSelect={handleFileSelect}
                    acceptedTypes={['.xlsx', '.xls', '.csv']}
                  />
                  {file && (
                    <Text style={styles.fileSelectedText}>
                      ✓ Fichier sélectionné : {file.name}
                    </Text>
                  )}
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={20} color={colors.accent.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleSubmitToClaude}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.text.onDark} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={20} color={colors.text.onDark} />
                      <Text style={styles.submitButtonText}>Soumettre à l'IA</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {step === 'analyzing' && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color={colors.accent.gold} />
                <Text style={styles.analyzingText}>Analyse du projet avec l'IA...</Text>
                <Text style={styles.analyzingSubtext}>
                  Génération des points d'attention et configuration optimale
                </Text>
              </View>
            )}

            {step === 'review' && analyzedConfig && (
              <View>
                <Text style={styles.reviewTitle}>Configuration générée par l'IA</Text>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Points d'attention suggérés</Text>
                  {analyzedConfig.attentionPoints.map((point: any, index: number) => (
                    <View key={index} style={styles.attentionPointCard}>
                      <View style={styles.attentionPointHeader}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={
                            point.priority === 'high'
                              ? colors.accent.danger
                              : point.priority === 'medium'
                              ? colors.accent.gold
                              : colors.text.secondary
                          }
                        />
                        <Text style={styles.attentionPointText}>{point.description}</Text>
                      </View>
                      <Text style={styles.priorityBadge}>
                        Priorité: {point.priority === 'high' ? 'Haute' : point.priority === 'medium' ? 'Moyenne' : 'Basse'}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Style de conversation</Text>
                  <Text style={styles.valueText}>{analyzedConfig.conversationStyle}</Text>
                </View>

                {analyzedConfig.userFacingDescription && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Message pour l'utilisateur</Text>
                    <Text style={styles.valueText}>{analyzedConfig.userFacingDescription}</Text>
                  </View>
                )}

                {analyzedConfig.suggestions && analyzedConfig.suggestions.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Suggestions</Text>
                    {analyzedConfig.suggestions.map((suggestion: string, index: number) => (
                      <Text key={index} style={styles.suggestionText}>
                        • {suggestion}
                      </Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
                  onPress={handleConfirmProject}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.text.onDark} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={colors.text.onDark} />
                      <Text style={styles.confirmButtonText}>Valider et créer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Date Picker Modal */}
    <Modal
      visible={showDatePicker}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowDatePicker(false)}
    >
      <View style={styles.datePickerOverlay}>
        <View style={styles.datePickerModal}>
          <Text style={styles.datePickerTitle}>Sélectionner une date</Text>

          {/* Date selectors */}
          <View style={styles.dateSelectorsRow}>
            {/* Day */}
            <View style={styles.dateSelector}>
              <Text style={styles.dateSelectorLabel}>Jour</Text>
              <View style={styles.dateSelectorButtons}>
                <TouchableOpacity
                  style={styles.dateArrowButton}
                  onPress={() => {
                    const newDate = new Date(tempDate);
                    newDate.setDate(tempDate.getDate() - 1);
                    setTempDate(newDate);
                  }}
                >
                  <Ionicons name="chevron-up" size={20} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.dateSelectorValue}>{tempDate.getDate()}</Text>
                <TouchableOpacity
                  style={styles.dateArrowButton}
                  onPress={() => {
                    const newDate = new Date(tempDate);
                    newDate.setDate(tempDate.getDate() + 1);
                    setTempDate(newDate);
                  }}
                >
                  <Ionicons name="chevron-down" size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Month */}
            <View style={styles.dateSelector}>
              <Text style={styles.dateSelectorLabel}>Mois</Text>
              <View style={styles.dateSelectorButtons}>
                <TouchableOpacity
                  style={styles.dateArrowButton}
                  onPress={() => {
                    const newDate = new Date(tempDate);
                    newDate.setMonth(tempDate.getMonth() - 1);
                    setTempDate(newDate);
                  }}
                >
                  <Ionicons name="chevron-up" size={20} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.dateSelectorValue}>{tempDate.getMonth() + 1}</Text>
                <TouchableOpacity
                  style={styles.dateArrowButton}
                  onPress={() => {
                    const newDate = new Date(tempDate);
                    newDate.setMonth(tempDate.getMonth() + 1);
                    setTempDate(newDate);
                  }}
                >
                  <Ionicons name="chevron-down" size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Year */}
            <View style={styles.dateSelector}>
              <Text style={styles.dateSelectorLabel}>Année</Text>
              <View style={styles.dateSelectorButtons}>
                <TouchableOpacity
                  style={styles.dateArrowButton}
                  onPress={() => {
                    const newDate = new Date(tempDate);
                    newDate.setFullYear(tempDate.getFullYear() - 1);
                    setTempDate(newDate);
                  }}
                >
                  <Ionicons name="chevron-up" size={20} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.dateSelectorValue}>{tempDate.getFullYear()}</Text>
                <TouchableOpacity
                  style={styles.dateArrowButton}
                  onPress={() => {
                    const newDate = new Date(tempDate);
                    newDate.setFullYear(tempDate.getFullYear() + 1);
                    setTempDate(newDate);
                  }}
                >
                  <Ionicons name="chevron-down" size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Selected date display */}
          <View style={styles.selectedDateDisplay}>
            <Text style={styles.selectedDateText}>
              {tempDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.datePickerActions}>
            <TouchableOpacity
              style={styles.datePickerCancelButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.datePickerConfirmButton}
              onPress={() => {
                setStartDate(tempDate);
                setShowDatePicker(false);
              }}
            >
              <Text style={styles.datePickerConfirmText}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  content: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  industryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  industryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.glass.background,
  },
  industryButtonActive: {
    borderColor: colors.accent.gold,
    backgroundColor: 'rgba(245, 197, 66, 0.1)',
  },
  industryButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  industryButtonTextActive: {
    color: colors.accent.gold,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.accent.danger,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.gold,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onDark,
  },
  analyzingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  attentionPointCard: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  attentionPointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  attentionPointText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  priorityBadge: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  valueText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  suggestionText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.gold,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    ...shadows.md,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onDark,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.glass.background,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  checkboxDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  requiredAsterisk: {
    color: colors.accent.danger,
    fontWeight: '700',
  },
  fileSelectedText: {
    fontSize: 13,
    color: colors.accent.gold,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  reportTypeButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.glass.background,
    marginBottom: spacing.sm,
    minWidth: '48%',
  },
  reportTypeButtonActive: {
    borderColor: colors.accent.gold,
    backgroundColor: 'rgba(245, 197, 66, 0.1)',
  },
  reportTypeTextContainer: {
    flex: 1,
  },
  reportTypeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  reportTypeButtonTextActive: {
    color: colors.accent.gold,
  },
  reportTypeDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  // Date Picker Modal styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
    ...shadows.large,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dateSelectorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  dateSelector: {
    alignItems: 'center',
  },
  dateSelectorLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  dateSelectorButtons: {
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  dateArrowButton: {
    padding: spacing.xs,
  },
  dateSelectorValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginVertical: spacing.sm,
    minWidth: 50,
    textAlign: 'center',
  },
  selectedDateDisplay: {
    backgroundColor: colors.glass.light,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  selectedDateText: {
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  datePickerCancelButton: {
    flex: 1,
    backgroundColor: colors.glass.background,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  datePickerCancelText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  datePickerConfirmButton: {
    flex: 1,
    backgroundColor: colors.accent.gold,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.gold,
  },
  datePickerConfirmText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '700',
  },
  // Styles pour les sous-options
  subOptionsContainer: {
    marginLeft: spacing.xl,
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent.gold,
  },
  subCheckboxContainer: {
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
