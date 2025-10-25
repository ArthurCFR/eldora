/**
 * AudioLevelBar Component
 * Real-time audio visualization using MediaStream analysis
 * Yellow for agent, Red for user
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { colors } from '../constants/theme';

interface AudioLevelBarProps {
  stream?: MediaStream;
  barCount?: number;
  color?: 'agent' | 'user';
  isActive: boolean;
}

export default function AudioLevelBar({
  stream,
  barCount = 20,
  color = 'agent',
  isActive
}: AudioLevelBarProps) {
  const [levels, setLevels] = useState<number[]>(Array(barCount).fill(0.3));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!isActive || !stream) {
      // Reset to minimum height when not active
      setLevels(Array(barCount).fill(0.3));
      return;
    }

    // Web Audio API for real-time analysis (works in Expo web)
    if (Platform.OS === 'web' && typeof AudioContext !== 'undefined') {
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
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
          audioCtx.close();
        };
      } catch (error) {
        console.warn('AudioContext not available, using fallback animation');
      }
    }

    // Fallback: Simulated animation for native
    // This creates a wave effect when active
    const interval = setInterval(() => {
      setLevels(prev => {
        return prev.map((_, i) => {
          const phase = (Date.now() / 400 + i * 0.2) % (Math.PI * 2);
          const base = 0.4 + Math.sin(phase) * 0.3;
          return Math.max(0.3, Math.min(1, base));
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, [stream, barCount, isActive]);

  if (!isActive) return null;

  const barColor = color === 'agent' ? colors.accent.gold : colors.accent.danger;

  return (
    <View style={styles.container}>
      {levels.map((level, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: `${level * 100}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 40,
    gap: 3,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
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
