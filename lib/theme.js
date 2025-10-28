// lib/theme.js
import { Appearance } from "react-native";

/**
 * Energetic Lime Brand (base)
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
  primarySoft: "#FFF3E8",
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

// Home/Dashboard accents already used
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

/**
 * NEW: Design palettes for Progress & Settings “Your Goals”
 * Centralize the Figma mint/teal + soft surfaces here so screens stay consistent.
 */
// const PROGRESS = {
//   line: "#10B981",        // chart line / active accents (mint)
//   lineDeep: "#059669",    // darker mint for text/icons
//   grid: "#E9EEF5",        // chart grid lines
//   tabsBg: "#F1F5F9",      // "7 Days / 30 Days" pill background
//   chipBg: "#DCFCE7",      // small "7D/30D" chip background
//   iconBubble: "#E6F7F5",  // left icon circle on list items
//   activeBorder: "#DCFCE7" // subtle active state for cards/rows
// };

// const GOALS = {
//   track: "#E6EDF7",       // light blue/gray track for progress bars
//   fill:  "#2563EB"        // unified fill (use PROGRESS.line for mint instead)
//   // If you want mint bars everywhere, set fill: PROGRESS.line
// };
const PROGRESS = {
  line: "#14B8A6",        // teal-500 for charts/active accents
  lineDeep: "#0F766E",    // teal-700 for text/icons on chips
  grid: "#E8EDF8",        // subtle chart grid
  tabsBg: "#F1F5F9",      // pill container bg
  chipBg: "#CCFBF1",      // "7D" chip bg (teal-100)
  iconBubble: "#E6FAF7",  // left icon circle
  activeBorder: "#CCFBF1",// active list-item border
  rangeGrad: ["#2DD4BF", "#10B981"], // ← gradient for active '7 Days'
};

const GOALS = {
  track: "#E6EDF7",
  fill:  "#14B8A6",       // unify goals bars with teal
};

// Base light/dark brand (keep primary lime; switch to mint by changing the line below)
// const LIGHT = {
//   ...COMMON,
//   primary: "#2ECC71",     // ← change to "#10B981" to make mint the global primary
//   onPrimary: "#FFFFFF",
//   icon: "#555",
//   tabIconDefault: "#A0A0A0",
//   tabIconSelected: "#2ECC71",
// };

// const DARK = {
//   ...COMMON,
//   primary: "#34D399",     // mint for dark is fine
//   onPrimary: "#121212",
//   text: "#11181C",
//   textMuted: "#6B7280",
//   icon: "#9BA1A6",
//   tabIconDefault: "#555",
//   tabIconSelected: "#90EE90",
// };

const LIGHT = {
  ...COMMON,
  primary: PROGRESS.line,      // ← teal as global primary
  onPrimary: "#FFFFFF",
  icon: "#555",
  tabIconDefault: "#A0A0A0",
  tabIconSelected: PROGRESS.line,  // tabs use teal when active
};

const DARK = {
  ...COMMON,
  primary: PROGRESS.line,          // same teal in dark
  onPrimary: "#121212",
  text: "#11181C",
  textMuted: "#6B7280",
  icon: "#9BA1A6",
  tabIconDefault: "#555",
  tabIconSelected: PROGRESS.line,
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

  // Icons / tabs
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
  newBadgeBg: C.primary,
  newBadgeText: C.newBadgeText,

  // Feature palettes
  home: HOME,
  progress: PROGRESS,
  goals: GOALS,
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
