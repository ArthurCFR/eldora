import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import GlassContainer from './GlassContainer';
import { Ionicons } from '@expo/vector-icons';
import Header from './Header';
import ProjectSelector from './ProjectSelector';
import { getProject } from '../services/projectService';

interface LoginScreenProps {
  onLoginSuccess: (firstName: string, projectId: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load collaborators when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectCollaborators(selectedProjectId);
    } else {
      setCollaborators([]);
      setFirstName('');
    }
  }, [selectedProjectId]);

  const loadProjectCollaborators = async (projectId: string) => {
    try {
      const project = await getProject(projectId);
      if (project.collaborators && project.collaborators.length > 0) {
        setCollaborators(project.collaborators);
      } else {
        setCollaborators([]);
      }
    } catch (error) {
      console.error('Error loading project collaborators:', error);
      setCollaborators([]);
    }
  };

  const handleLogin = () => {
    // Reset error
    setErrorMessage('');

    // Validation
    if (!selectedProjectId) {
      setErrorMessage('Veuillez sélectionner un projet');
      return;
    }

    if (!firstName.trim()) {
      setErrorMessage('Veuillez entrer votre prénom');
      return;
    }

    // Check if collaborator is authorized (if project has collaborators defined)
    if (collaborators.length > 0) {
      const isAuthorized = collaborators.some(
        c => c.toLowerCase() === firstName.trim().toLowerCase()
      );
      if (!isAuthorized) {
        setErrorMessage('Vous n\'êtes pas autorisé à utiliser ce projet');
        return;
      }
    }

    setIsLoading(true);

    // Simulate login delay
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(firstName.trim(), selectedProjectId);
    }, 600);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <Header centered />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Bienvenue</Text>
                <Text style={styles.subtitle}>Connectez-vous pour commencer</Text>
              </View>

              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Login Form */}
              <GlassContainer style={styles.formContainer} intensity="strong">
                <View style={styles.form}>
                  {/* Project Selector */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Projet</Text>
                    <ProjectSelector
                      selectedProjectId={selectedProjectId}
                      onProjectSelect={(projectId) => {
                        setSelectedProjectId(projectId);
                        setErrorMessage('');
                      }}
                      disabled={isLoading}
                    />
                  </View>

                  {/* Prénom - Only shown after project selection */}
                  {selectedProjectId && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Prénom</Text>

                      {/* Show collaborator buttons if available */}
                      {collaborators.length > 0 && (
                        <View style={styles.collaboratorsContainer}>
                          <Text style={styles.collaboratorsHint}>
                            Collaborateurs autorisés :
                          </Text>
                          <View style={styles.collaboratorsButtons}>
                            {collaborators.map((collab) => (
                              <TouchableOpacity
                                key={collab}
                                style={[
                                  styles.collaboratorButton,
                                  firstName.toLowerCase() === collab.toLowerCase() && styles.collaboratorButtonSelected,
                                ]}
                                onPress={() => {
                                  setFirstName(collab);
                                  setErrorMessage('');
                                }}
                                disabled={isLoading}
                              >
                                <Text
                                  style={[
                                    styles.collaboratorButtonText,
                                    firstName.toLowerCase() === collab.toLowerCase() && styles.collaboratorButtonTextSelected,
                                  ]}
                                >
                                  {collab}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}

                      <TextInput
                        style={styles.inputSimple}
                        placeholder={collaborators.length > 0 ? "Sélectionnez votre prénom ci-dessus" : "Entrez votre prénom"}
                        placeholderTextColor={colors.text.tertiary}
                        value={firstName}
                        onChangeText={(text) => {
                          setFirstName(text);
                          setErrorMessage('');
                        }}
                        autoCapitalize="words"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                    </View>
                  )}

                  {/* Login Button */}
                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    <Text style={styles.loginButtonText}>
                      {isLoading ? 'Connexion...' : 'Se connecter'}
                    </Text>
                    <Image
                      source={require('../assets/Logo/BulletYellow.png')}
                      style={styles.bulletIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
              </GlassContainer>

              {/* Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Utilisez vos identifiants fournis par votre responsable
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    minHeight: 600,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.accent.danger,
    flex: 1,
  },
  formContainer: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  inputSimple: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text.primary,
    height: 56,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.gold,
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadows.gold,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  bulletIcon: {
    width: 20,
    height: 20,
  },
  infoContainer: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  infoText: {
    ...typography.small,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  collaboratorsContainer: {
    marginBottom: spacing.sm,
  },
  collaboratorsHint: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  collaboratorsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  collaboratorButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.background.secondary,
  },
  collaboratorButtonSelected: {
    borderColor: colors.accent.gold,
    backgroundColor: 'rgba(245, 197, 66, 0.1)',
  },
  collaboratorButtonText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  collaboratorButtonTextSelected: {
    color: colors.accent.gold,
    fontWeight: '600',
  },
});
