import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  userName: string;
  setUserName: (name: string) => void;
  justLoggedIn: boolean;
  setJustLoggedIn: (value: boolean) => void;
  currentProjectId: string | null;
  setCurrentProjectId: (projectId: string | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState('');
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const logout = () => {
    setUserName('');
    setCurrentProjectId(null);
    setJustLoggedIn(false);
    setIsLoggedIn(false);
  };

  return (
    <AppContext.Provider
      value={{
        userName,
        setUserName,
        justLoggedIn,
        setJustLoggedIn,
        currentProjectId,
        setCurrentProjectId,
        isLoggedIn,
        setIsLoggedIn,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
