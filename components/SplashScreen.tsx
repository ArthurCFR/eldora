import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { VideoView, useVideoPlayer, VideoPlayer } from 'expo-video';
import { colors } from '../constants/theme';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const animationFadeIn = useRef(new Animated.Value(0)).current;
  const hasCompleted = useRef(false);

  const videoSource = require('../assets/animations/IntroEldoraNet.mp4');
  const player = useVideoPlayer(videoSource, (player: VideoPlayer) => {
    player.loop = false;
    player.muted = true; // Mute pour permettre autoplay sur web
  });

  useEffect(() => {
    // Reset on mount
    hasCompleted.current = false;
    let showTimer: NodeJS.Timeout;
    let playTimer: NodeJS.Timeout;
    let checkEndInterval: NodeJS.Timeout | null = null;

    // Wait 0.5 seconds, then show the video
    showTimer = setTimeout(() => {
      if (!hasCompleted.current) {
        setShowAnimation(true);

        // Fade in the video
        Animated.timing(animationFadeIn, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false, // Désactiver pour web
        }).start(() => {
          // Wait 1 second after fade-in before starting the video
          playTimer = setTimeout(() => {
            if (!hasCompleted.current) {
              player.play();

              // Check video position every 100ms to detect end
              checkEndInterval = setInterval(() => {
                const duration = player.duration;
                const currentTime = player.currentTime;

                // If we're at the end (within 0.1s of duration)
                if (duration > 0 && currentTime >= duration - 0.1) {
                  console.log('Video finished - currentTime:', currentTime, 'duration:', duration);
                  if (checkEndInterval) clearInterval(checkEndInterval);
                  handleVideoFinish();
                }
              }, 100);
            }
          }, 500);
        });
      }
    }, 500);

    // Also listen for status changes as backup
    const subscription = player.addListener('statusChange', (status: any) => {
      console.log('Video status:', status.status);
      if (status.status === 'idle' && status.oldStatus === 'playing' && !hasCompleted.current) {
        // Video finished (playing -> idle transition)
        console.log('Video finished via status change');
        if (checkEndInterval) clearInterval(checkEndInterval);
        handleVideoFinish();
      }
    });

    return () => {
      clearTimeout(showTimer);
      clearTimeout(playTimer);
      if (checkEndInterval) clearInterval(checkEndInterval);
      subscription.remove();
      try {
        player.pause();
      } catch (e) {
        // Ignore - native object may already be destroyed
      }
    };
  }, []);

  const handleVideoFinish = () => {
    if (hasCompleted.current) return;
    hasCompleted.current = true;

    // Fade out the entire splash screen
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        onComplete();
      });
      },800);
    };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {showAnimation && (
        <Animated.View style={[{ opacity: animationFadeIn }, styles.animationContainer]}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2F2F2F',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  animationContainer: {
    width: '50%',
    height: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
