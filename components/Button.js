import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, shadow } from "../lib/theme";

export default function Button({ title, onPress, style, variant = "primary", disabled }) {
  const styles = StyleSheet.create({
    btn: {
      backgroundColor: variant === "primary" ? colors.primary : "transparent",
      borderColor: colors.border,
      borderWidth: variant === "ghost" ? 1 : 0,
      paddingVertical: spacing(1.5),
      paddingHorizontal: spacing(2),
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      opacity: disabled ? 0.6 : 1,
      ...(variant === "primary" ? shadow : {}),
    },
    text: {
      color: variant === "primary" ? "#0B1A17" : colors.text,
      fontWeight: "600",
      fontSize: 16,
    },
  });
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.btn, style]}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}
