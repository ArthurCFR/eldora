/**
 * Layout de base de l'application avec navigation par onglets
 */

import { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import SplashScreen from '../components/SplashScreen';
import LoginScreen from '../components/LoginScreen';
import { AppProvider, useApp } from '../contexts/AppContext';

function RootLayoutContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { setUserName, setJustLoggedIn } = useApp();

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleLoginSuccess = (firstName: string) => {
    setUserName(firstName);
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
        name="samsung"
        options={{
          title: 'Samsung',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="phone-portrait" size={size} color={color} />
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
