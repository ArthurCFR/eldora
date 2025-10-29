/**
 * Layout de base de l'application avec navigation par onglets
 */

import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LogBox } from 'react-native';
import { colors } from '../constants/theme';
import SplashScreen from '../components/SplashScreen';
import LoginScreen from '../components/LoginScreen';
import { AppProvider, useApp } from '../contexts/AppContext';

// Ignore le warning "Unexpected text node" qui pollue la console
LogBox.ignoreLogs([
  'Unexpected text node:',
  'A text node cannot be a child of a <View>',
]);

function RootLayoutContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { setUserName, setJustLoggedIn, setCurrentProjectId, isLoggedIn, setIsLoggedIn } = useApp();

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleLoginSuccess = (firstName: string, projectId: string) => {
    setUserName(firstName);
    setCurrentProjectId(projectId);
    setIsLoggedIn(true);
    setJustLoggedIn(true);
    // Reset flag after animation
    setTimeout(() => setJustLoggedIn(false), 1500);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.gold,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: colors.glass.border,
          paddingBottom: 5,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hidden redirect
        }}
      />
      <Tabs.Screen
        name="project"
        options={{
          title: 'Projet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutContent />
    </AppProvider>
  );
}
