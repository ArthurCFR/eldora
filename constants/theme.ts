/**
 * ELDORA Theme - Palette de couleurs centralisée
 *
 * Toutes les couleurs de l'application sont gérées ici.
 * Modifiez les valeurs hexadécimales ci-dessous pour mettre à jour
 * l'ensemble de l'application automatiquement.
 */

// ============================================================================
// COULEURS DE BASE - Ne pas utiliser directement dans les composants
// ============================================================================
const BASE_COLORS = {
  // Couleurs principales
  white: '#F5F5F5',      // Fond principal, textes en négatif
  darkGray: '#4C4C4C',   // Texte sur blanc, icônes
  gold: '#FFD166', 
  // Joli bleu : 256EFF      // Accent principal (utiliser avec parcimonie)

  // Couleurs secondaires
  blue: '#BA2D0B',       // Couleur mineure (utilisation minimale)
  green: '#419D78',      // Couleur mineure (utilisation minimale)

  // Couleurs système
  danger: '#F43F5E',     // Messages d'erreur
  pureWhite: '#FFFFFF',  // Pour certains effets visuels
  pureBlack: '#000000',  // Pour certains effets visuels
} as const;

// ============================================================================
// PALETTE PRINCIPALE - À utiliser dans les composants
// ============================================================================

/**
 * Couleurs pour les fonds et surfaces
 */
export const colors = {
  // Arrière-plans
  background: {
    primary: BASE_COLORS.white,           // Fond principal de tous les écrans (sauf splash)
    secondary: BASE_COLORS.pureWhite,     // Surfaces blanches pures
    dark: BASE_COLORS.darkGray,           // Fond sombre (splash screen, etc.)
  },

  // Textes
  text: {
    primary: BASE_COLORS.darkGray,        // Texte principal (sur fond blanc)
    onDark: BASE_COLORS.white,            // Texte sur fond sombre
    secondary: BASE_COLORS.darkGray,      // Texte secondaire
    tertiary: '#8A8A8A',                  // Texte tertiaire (gris clair)
    muted: '#B4B4B4',                     // Texte désactivé/placeholder
  },

  // Couleurs d'accent
  accent: {
    gold: BASE_COLORS.gold,               // Accent principal - À utiliser avec PARCIMONIE
    blue: BASE_COLORS.blue,               // Accent secondaire - Utilisation minimale
    green: BASE_COLORS.green,             // Accent tertiaire - Utilisation minimale
    danger: BASE_COLORS.danger,           // Erreurs et suppressions
  },

  // Effets de verre (glassmorphism)
  glass: {
    light: 'rgba(255, 255, 255, 0.4)',
    medium: 'rgba(255, 255, 255, 0.6)',
    strong: 'rgba(255, 255, 255, 0.85)',
    border: 'rgba(76, 76, 76, 0.15)',     // Bordures subtiles avec darkGray
    background: 'rgba(235, 235, 235, 0.5)', // Fond verre avec white
  },

  // Couleurs de statut pour rapports/tableaux
  status: {
    excellent: BASE_COLORS.green,         // 100%+ de performance
    good: BASE_COLORS.gold,               // 75-99% de performance
    warning: '#FF8C00',                   // 50-74% de performance
    poor: BASE_COLORS.danger,             // < 50% de performance
  },

  // Couleurs legacy pour compatibilité (À ÉVITER dans nouveau code)
  primary: BASE_COLORS.green,             // Anciennement utilisé - Préférer accent.green
  primaryDark: BASE_COLORS.blue,          // Anciennement utilisé - Préférer accent.blue
  success: BASE_COLORS.green,             // Anciennement utilisé - Préférer accent.green
  danger: BASE_COLORS.danger,             // Anciennement utilisé - Préférer accent.danger
  gray: {
    50: '#FAFAFA',
    100: '#F6F6F6',
    200: BASE_COLORS.white,
    300: '#D4D4D4',
    400: '#B4B4B4',
    500: '#8A8A8A',
    600: '#6A6A6A',
    700: BASE_COLORS.darkGray,
    900: '#1A1A1A',
  },
  white: BASE_COLORS.white,
};

// ============================================================================
// TYPOGRAPHIE
// ============================================================================
export const typography = {
  // Familles de police
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  // Échelle typographique
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

// ============================================================================
// ESPACEMENTS
// ============================================================================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ============================================================================
// BORDURES & RAYONS
// ============================================================================
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// ============================================================================
// OMBRES
// ============================================================================
export const shadows = {
  sm: {
    shadowColor: BASE_COLORS.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: BASE_COLORS.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: BASE_COLORS.darkGray,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  glass: {
    shadowColor: BASE_COLORS.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  gold: {
    shadowColor: BASE_COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ============================================================================
// ANIMATIONS
// ============================================================================
export const animations = {
  // Durées standard
  fast: 150,
  normal: 250,
  slow: 350,

  // Easing
  easeOut: 'ease-out',
  easeIn: 'ease-in',
  easeInOut: 'ease-in-out',
};
