import { TextInput, StyleSheet, View, Text } from "react-native";
import { colors, radius, spacing } from "../lib/theme";

export default function Input({ label, ...props }) {
  return (
    <View style={{ marginBottom: spacing(1.5) }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.textMuted} style={s.input} {...props} />
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: colors.textMuted, marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
});
