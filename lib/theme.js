// lib/theme.js
import { Appearance } from "react-native";

/**
 * Energetic Lime Brand
 * Light tint: #32CD32  (Lime Green)
 * Dark  tint: #7CFC00  (Lighter Neon Green)
 * App background stays white for a crisp, fitness-oriented feel.
 */

// Common tokens (white background for both modes)
const COMMON = {
  // Neutrals
  bg: "#FFFFFF",
  surface: "#F8FAFC",
  card: "#FFFFFF",
  text: "#11181C",
  textMuted: "#606770", // softened from #555 to read well on white
  border: "#E2E8F0",

  // Semantic accents
  info: "#2563EB",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  purple: "#8B5CF6",
  orange: "#F97316",

  // Macros (ring/labels)
  kcal: "#F97316",
  protein: "#2563EB",
  carbs: "#10B981",
  fats: "#8B5CF6",

  // Soft backgrounds & components (tuned for white bg)
  primarySoft: "#FFF3E8", // soft lime
  successSoft: "#E6F7F5",
  infoSoft: "#E8F7FF",
  warningSoft: "#E6F7F5",
  purpleSoft: "#F3E9FF",
  cardAccent: "#F7F1FF",
  ringTrack: "#E8EEF9",

  // Badges
  badgeSuccessBg: "#EAF7F0",
  badgeSuccessText: "#10B981",
  newBadgeText: "#FFFFFF",
};

const HOME = {
  activeCardBg:   "#E9FAF1",
  activeGrad:     ["#F5FFF9", "#E9FAF1"],
  activeAccent:   "#10B981",

  nutritionCardBg:"#EEF4FF",
  nutritionGrad:  ["#F7FAFF", "#EEF4FF"],
  nutritionAccent:"#2563EB",
  nutritionBar:   "#3B82F6",
  nutritionTrack: "#DFE8FF",
};

const LIGHT = {
  ...COMMON,
  primary: "#2ECC71", // Lime Green
  onPrimary: "#FFFFFF",
  icon: "#555",
  tabIconDefault: "#A0A0A0",
  tabIconSelected: "#2ECC71",
};

const DARK = {
  // Keep UI on white background for consistency, but use neon lime accents
  ...COMMON,
  primary: "#34D399", // Lighter Neon Green
  // primary: "#25D366",
  onPrimary: "#121212",
  text: "#11181C",       // stays readable on white
  textMuted: "#6B7280",
  icon: "#9BA1A6",
  tabIconDefault: "#555",
  tabIconSelected: "#90EE90",
};

// Resolve scheme once at module load
const scheme = Appearance.getColorScheme?.() ?? "light";
const C = scheme === "dark" ? DARK : LIGHT;

export const colors = {
  // Neutrals
  bg: C.bg,
  surface: C.surface,
  card: C.card,
  text: C.text,
  textMuted: C.textMuted,
  border: C.border,

  // Brand / accents
  primary: C.primary,
  onPrimary: C.onPrimary,
  info: C.info,
  success: C.success,
  warning: C.warning,
  danger: C.danger,
  purple: C.purple,
  orange: C.orange,

  // Icons / tabs (if needed by components)
  icon: C.icon,
  tabIconDefault: C.tabIconDefault,
  tabIconSelected: C.tabIconSelected,

  // Macros
  kcal: C.kcal,
  protein: C.protein,
  carbs: C.carbs,
  fats: C.fats,

  // Soft backgrounds & components
  primarySoft: C.primarySoft,
  successSoft: C.successSoft,
  infoSoft: C.infoSoft,
  warningSoft: C.warningSoft,
  purpleSoft: C.purpleSoft,
  cardAccent: C.cardAccent,
  ringTrack: C.ringTrack,

  // Badges
  badgeSuccessBg: C.badgeSuccessBg,
  badgeSuccessText: C.badgeSuccessText,
  newBadgeBg: C.primary, // brand-colored "New" badge
  newBadgeText: C.newBadgeText,
  home: HOME,   // <-- fixed
};

export const radius = { md: 14, lg: 20, xl: 24 };
export const spacing = (n) => n * 8;

export const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 12,
  elevation: 6,
};
