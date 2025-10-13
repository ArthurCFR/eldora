/**
 * LiveKit Voice Button Component
 * New version of VoiceButton that uses LiveKit for real-time streaming
 */

import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';
import ValidationAnimation from '../assets/animations/Validation.json';
import { colors } from '../constants/theme';

interface LiveKitVoiceButtonProps {
  userName: string;
  eventName?: string;
  existingReport?: any;
  onTranscription?: (text: string, isFinal: boolean) => void;
  onConversationComplete?: (data: any) => void;
}

export default function LiveKitVoiceButton({
  userName,
  eventName,
  existingReport,
  onTranscription,
  onConversationComplete,
}: LiveKitVoiceButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isStarting, setIsStarting] = React.useState(false);

  const {
    isConnecting,
    isConnected,
    error,
    connect,
    disconnect,
    isAgentSpeaking,
    transcription,
    isGeneratingReport,
  } = useLiveKitRoom({
    userName,
    eventName,
    existingReport,
    onTranscription,
    onConversationComplete: (data) => {
      // Report received, now we can fully disconnect
      console.log('Report received, disconnecting room...');

      // Call the original callback first
      if (onConversationComplete) {
        onConversationComplete(data);
      }

      // Disconnect after a short delay to ensure UI updates
      setTimeout(() => {
        disconnect();
      }, 500);
    },
  });

  // Manage starting state - show purple speaker immediately, then switch based on actual state
  useEffect(() => {
    if (isAgentSpeaking && isStarting) {
      setIsStarting(false); // Agent is actually speaking now
    }
    // Also reset if connected and not connecting anymore
    if (isConnected && !isConnecting && isStarting) {
      setIsStarting(false);
    }
  }, [isAgentSpeaking, isStarting, isConnected, isConnecting]);

  // Pulse animation based on state
  useEffect(() => {
    if (isGeneratingReport) {
      // Stop all animations when generating report (Lottie will take over)
      pulseAnim.stopAnimation();
    } else if (isAgentSpeaking || isStarting) {
      // Agent speaking animation (smooth) - also used during startup
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (isConnected) {
      // Connected and listening animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }

    return () => {
      pulseAnim.stopAnimation();
    };
  }, [isConnected, isAgentSpeaking, isStarting, isGeneratingReport]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    if (isConnected) {
      disconnect();
      setIsStarting(false);
    } else if (!isConnecting) {
      setIsStarting(true); // Show purple speaker immediately
      await connect();
    }
  };

  const getButtonColor = (): [string, string] => {
    if (error) return [colors.accent.danger, '#DC2626']; // Rouge pour erreur
    if (isGeneratingReport) return [colors.accent.gold, '#F5C542']; // Jaune pour génération
    if (isAgentSpeaking || isStarting) return [colors.accent.blue, '#6366F1']; // Bleu pour speaking
    if (isConnected) return [colors.accent.gold, '#F5C542']; // Or pour connected/listening
    return [colors.accent.gold, '#F5C542']; // Or pour idle
  };

  const getIcon = () => {
    if (error) return <Ionicons name="alert-circle-outline" size={56} color={colors.text.onDark} />;
    if (isGeneratingReport) return null; // Lottie animation will replace icon
    if (isAgentSpeaking || isStarting) return <Ionicons name="volume-high-outline" size={56} color={colors.text.onDark} />;
    if (isConnected) return <Ionicons name="mic" size={56} color={colors.text.primary} />;
    return <Ionicons name="mic-outline" size={56} color={colors.text.primary} />;
  };


  const getStatusText = () => {
    if (error) return 'Erreur de connexion';
    if (isGeneratingReport) return 'Génération du rapport...';
    if (isAgentSpeaking) return 'Assistant parle...';
    if (isStarting) return 'Démarrage...';
    if (isConnected) return 'En écoute';
    return 'Appuyez pour parler';
  };

  const handleStop = () => {
    if (isConnected || isConnecting) {
      disconnect();
    }
  };

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: isConnected || isGeneratingReport ? 0.6 : 0.3,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.glowRingInner,
            {
              backgroundColor: isGeneratingReport
                ? colors.accent.gold
                : isAgentSpeaking || isStarting
                ? colors.accent.blue
                : isConnected
                ? colors.accent.gold
                : colors.accent.gold,
            },
          ]}
        />
      </Animated.View>

      {/* Main button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isAgentSpeaking || isGeneratingReport}
          activeOpacity={0.9}
        >
          <View style={styles.buttonContainer}>
            <LinearGradient
              colors={getButtonColor()}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Glass overlay */}
              <View style={styles.glassOverlay} />

              {/* Lottie animation for report generation */}
              {isGeneratingReport && (
                <LottieView
                  source={ValidationAnimation}
                  autoPlay
                  loop={false}
                  style={styles.lottieAnimation}
                />
              )}

              {/* Icon (hidden when generating report) */}
              {!isGeneratingReport && getIcon()}
            </LinearGradient>

            {/* Border overlay */}
            <View style={styles.borderOverlay} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Status text */}
      <Text style={styles.statusText}>{getStatusText()}</Text>

      {/* Stop button (only when connected, not when generating report) */}
      {(isConnected || isStarting) && !isGeneratingReport && (
        <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
          <Text style={styles.stopButtonText}>Arrêter</Text>
        </TouchableOpacity>
      )}

      {/* Transcription preview */}
      {transcription && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionText} numberOfLines={2}>
            {transcription}
          </Text>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    opacity: 0.2,
  },
  buttonContainer: {
    width: 140,
    height: 140,
    position: 'relative',
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.background.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 70,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    pointerEvents: 'none',
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  stopButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent.danger,
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent.danger,
  },
  transcriptionContainer: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(124, 144, 219, 0.15)',
    borderRadius: 12,
    maxWidth: '80%',
  },
  transcriptionText: {
    fontSize: 14,
    color: colors.accent.blue,
    textAlign: 'center',
  },
  errorContainer: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 12,
    maxWidth: '80%',
  },
  errorText: {
    fontSize: 14,
    color: colors.accent.danger,
    textAlign: 'center',
  },
  lottieAnimation: {
    width: 100,
    height: 100,
  },
});
