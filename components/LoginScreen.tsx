import React, { useState } from 'react';
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

interface LoginScreenProps {
  onLoginSuccess: (firstName: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [firstName, setFirstName] = useState('Thomas');
  const [projectCode, setProjectCode] = useState('XB45T');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = () => {
    // Reset error
    setErrorMessage('');

    // Validation
    if (!firstName.trim()) {
      setErrorMessage('Veuillez entrer votre prénom');
      return;
    }

    if (!projectCode.trim()) {
      setErrorMessage('Veuillez entrer le code projet');
      return;
    }

    setIsLoading(true);

    // Vérifier les credentials
    const isValidFirstName = firstName.trim().toLowerCase() === 'thomas';
    const isValidCode = projectCode.trim().toUpperCase() === 'XB45T';

    setTimeout(() => {
      setIsLoading(false);

      if (isValidFirstName && isValidCode) {
        onLoginSuccess(firstName.trim());
      } else if (!isValidCode) {
        setErrorMessage('Code projet incorrect. Veuillez vérifier et réessayer.');
        setProjectCode('');
      } else {
        setErrorMessage('Les informations saisies ne sont pas correctes.');
      }
    }, 600);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <Header />

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
                  {/* Prénom */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Prénom</Text>
                    <TextInput
                      style={styles.inputSimple}
                      placeholder="Entrez votre prénom"
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

                  {/* Code Projet */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Code Projet</Text>
                    <TextInput
                      style={styles.inputSimple}
                      placeholder="Entrez le code projet"
                      placeholderTextColor={colors.text.tertiary}
                      value={projectCode}
                      onChangeText={(text) => {
                        setProjectCode(text);
                        setErrorMessage('');
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                  </View>

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
});
