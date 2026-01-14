/** @type {const} */
const themeColors = {
  // Verve Palette (Earth Tones & Minimalist)
  // Primary: #7A6857 (Brown)
  primary: { light: '#7A6857', dark: '#C8B7A1' }, // Brown / Cream (for dark mode)
  
  // Backgrounds: #FEFEFE (White) / #0A0A0A (Dark Black)
  background: { light: '#FEFEFE', dark: '#0A0A0A' },
  
  // Surfaces (Cards/Inputs): #F0F0F1 (Subtle Grey) / #4F3228 (Dark Brown) or #1C1C1C
  surface: { light: '#F0F0F1', dark: '#1C1C1C' }, 
  
  // Text: #0A0A0A (Dark Black) / #FEFEFE (White)
  foreground: { light: '#0A0A0A', dark: '#FEFEFE' },
  
  // Muted Text: #B6B6B7 (Grey)
  muted: { light: '#78716c', dark: '#A8A29E' }, // Stone-500/400 for better readability than B6B6B7
  
  // Borders: #C8B7A1 (Cream)
  border: { light: '#C8B7A1', dark: '#7A6857' },
  
  // Status
  success: { light: '#10B981', dark: '#34D399' },
  warning: { light: '#F59E0B', dark: '#FBBF24' },
  error: { light: '#F54228', dark: '#F87171' }, // Red from design
  
  // Card backgrounds
  card: { light: '#FFFFFF', dark: '#2A2A2A' },
  
  // Custom Design Tokens
  cream: { light: '#C8B7A1', dark: '#C8B7A1' },
  brown: { light: '#7A6857', dark: '#7A6857' },
  darkBrown: { light: '#4F3228', dark: '#4F3228' },
  subtleBlue: { light: '#DADFFE', dark: '#3B4060' },
};

module.exports = { themeColors };
