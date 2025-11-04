// lib/global.js
import { StyleSheet } from "react-native";
import { colors, spacing } from "./theme";

export const g = StyleSheet.create({
  /* ---------- Typography ---------- */
  h1: { fontSize: 22, fontWeight: "800", color: colors.text },
  h2: { fontSize: 16, fontWeight: "800", color: colors.text },
  body: { fontSize: 14, color: colors.text },
  muted: { color: colors.textMuted },

  /* ---------- Common primitives ---------- */
  chip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // For dark card headers (workout blocks)
  cardHeaderDark: {
    backgroundColor: colors.headerDark,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  divider: { height: 1, backgroundColor: colors.border },

  /* ---------- Shadow ---------- */
  shadowLg: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  /* ---------- Spacing helpers ---------- */
  px2: { paddingHorizontal: spacing(2) },
  py1: { paddingVertical: spacing(1) },
  mb1: { marginBottom: spacing(1) },
  mb2: { marginBottom: spacing(2) },
});
