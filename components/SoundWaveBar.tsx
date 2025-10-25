/**
 * SoundWaveBar Component
 * Real-time sound wave visualization for active conversation
 * Analyzes audio streams and displays yellow for agent, red for user
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '../constants/theme';

interface SoundWaveBarProps {
  isActive: boolean;
  isAgentSpeaking: boolean;
  agentStream?: MediaStream | null;
  userStream?: MediaStream | null;
}

export default function SoundWaveBar({ isActive, isAgentSpeaking, agentStream, userStream }: SoundWaveBarProps) {
  const barCount = 20;
  const [levels, setLevels] = useState<number[]>(Array(barCount).fill(0.3));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!isActive) {
      // Reset to flat when not active
      setLevels(Array(barCount).fill(0.3));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((e) => console.warn('Error closing AudioContext:', e));
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    // STRICT RULE: If agent is speaking, ONLY show agent audio, ignore user
    // This prevents oscillation between yellow and red bars
    let activeStream: MediaStream | null = null;

    if (isAgentSpeaking) {
      // Agent is speaking - use ONLY agent stream
      activeStream = agentStream || null;
    } else {
      // Agent is NOT speaking - use user stream
      activeStream = userStream || null;
    }

    if (!activeStream) {
      // No stream available, keep bars flat
      setLevels(Array(barCount).fill(0.3));
      return;
    }

    // Web Audio API for real-time analysis (works in Expo web)
    if (Platform.OS === 'web' && typeof AudioContext !== 'undefined') {
      try {
        // Clean up previous context if exists and not already closed
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch((e) => console.warn('Error closing AudioContext:', e));
        }

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(activeStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        analyserRef.current = analyser;
        audioContextRef.current = audioCtx;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const update = () => {
          if (!analyserRef.current) return;

          analyser.getByteFrequencyData(dataArray);
          const chunkSize = Math.floor(dataArray.length / barCount);
          const newLevels = Array.from({ length: barCount }, (_, i) => {
            const chunk = dataArray.slice(i * chunkSize, (i + 1) * chunkSize);
            const max = Math.max(...chunk);
            // Normalize to 0.3-1.0 range for better visual effect
            return 0.3 + (max / 255) * 0.7;
          });

          setLevels(newLevels);
          animationFrameRef.current = requestAnimationFrame(update);
        };

        update();

        return () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          if (audioCtx.state !== 'closed') {
            audioCtx.close().catch((e) => console.warn('Error closing AudioContext:', e));
          }
        };
      } catch (error) {
        console.warn('AudioContext not available for SoundWaveBar, keeping flat');
        setLevels(Array(barCount).fill(0.3));
      }
    } else {
      // Fallback for native: keep flat (no audio analysis available)
      setLevels(Array(barCount).fill(0.3));
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((e) => console.warn('Error closing AudioContext:', e));
        audioContextRef.current = null;
      }
    };
  }, [isActive, isAgentSpeaking, agentStream, userStream]);

  if (!isActive) return null;

  const barColor = isAgentSpeaking ? colors.accent.gold : colors.accent.danger;

  return (
    <View style={styles.outerContainer}>
      {/* Top bars (mirrored) */}
      <View style={styles.container}>
        {levels.map((level, index) => (
          <View
            key={`top-${index}`}
            style={[
              styles.bar,
              {
                height: `${level * 50}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        ))}
      </View>

      {/* Bottom bars (original) */}
      <View style={[styles.container, styles.containerBottom]}>
        {levels.map((level, index) => (
          <View
            key={`bottom-${index}`}
            style={[
              styles.bar,
              {
                height: `${level * 50}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 20,
    gap: 3,
  },
  containerBottom: {
    alignItems: 'flex-start',
  },
  bar: {
    width: 3,
    borderRadius: 2,
    opacity: 0.8,
    // Smooth transition for visual effect
    transitionProperty: 'height',
    transitionDuration: '100ms',
  },
});
