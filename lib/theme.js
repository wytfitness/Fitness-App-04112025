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
  successSoft: "#EAF7F0",
  infoSoft: "#E8F7FF",
  warningSoft: "#FEF7EC",
  purpleSoft: "#F3E9FF",
  cardAccent: "#F7F1FF",
  ringTrack: "#E8EEF9",

  // Badges
  badgeSuccessBg: "#EAF7F0",
  badgeSuccessText: "#10B981",
  newBadgeText: "#FFFFFF",

  // NEW — Workout header on dark card
  headerDark: "#0F172A",                 // dark slate header for exercise cards
  onHeaderDark: "#FFFFFF",
  onHeaderDarkMuted: "rgba(255,255,255,0.75)",
  overlayOnDark: "rgba(255,255,255,0.12)", // for small badges/chips on dark

  // NEW — Neutral overlays / legibility on light UIs
  overlayOnLight: "rgba(0,0,0,0.05)",    // subtle badge bg on light cards
  infoOn: "#FFFFFF",                     // readable text/icon on info (blue) bg
};

const PROGRESS = {
  line: "#12D3C1",
  lineDeep: "#0EB5A3",
  grid: "#E8F3F7",
  tabsBg: "#F1F5F9",
  chipBg: "#D6F6F2",
  iconBubble: "#ECFDFB",
  activeBorder: "#E0FAF5",
  tabGrad: ["#1FE8D0", "#0FCAB4"],
};

// Home/Dashboard accents already used
const HOME = {
  // ACTIVE (mint/teal)
  activeGrad: ["#FFFFFF", "#F7FFFD", "#EBFEFA"],
  activeGradStops: [0, 0, 1],
  activeAccent: PROGRESS.lineDeep,
  activeIconBg: "rgba(18,211,193,0.08)",

  // NUTRITION (soft periwinkle)
  nutritionGrad: ["#FFFFFF", "#F6F9FF", "#EDF2FF"],
  // tweaked to blend nicer with 2×2 macro grid
  nutritionGradStops: [0, 0.5, 1],
  nutritionAccent: "#2563EB",
  nutritionIconBg: "rgba(37,99,235,0.08)",

  // Nutrition progress bar
  nutritionBar: "#3B82F6",
  nutritionTrack: "#E9EEFF",
};

const GOALS = {
  track: "#E6EDF7",
  fill: "#14B8A6", // unify goals bars with teal
};

// Base light/dark brand (keeps white base in both, per your design)
const LIGHT = {
  ...COMMON,
  primary: PROGRESS.line,          // teal as global primary
  onPrimary: "#FFFFFF",
  icon: "#555",
  tabIconDefault: "#A0A0A0",
  tabIconSelected: PROGRESS.line,
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

  // NEW — Workout header tokens
  headerDark: C.headerDark,
  onHeaderDark: C.onHeaderDark,
  onHeaderDarkMuted: C.onHeaderDarkMuted,
  overlayOnDark: C.overlayOnDark,

  // NEW — Light overlays / “on” colors
  overlayOnLight: C.overlayOnLight,
  onInfo: C.infoOn,

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
