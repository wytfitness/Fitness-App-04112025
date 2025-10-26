import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing } from "../lib/theme";
import { useRouter } from "expo-router";

export default function HeaderBar({ title, right }) {
  const router = useRouter();
  return (
    <View style={s.wrap}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={s.back}>‹</Text>
      </TouchableOpacity>
      <Text style={s.title}>{title}</Text>
      <View style={{ width: 24 }}>{right}</View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", padding: spacing(2), gap: 8 },
  back: { color: colors.text, fontSize: 24, width: 24, textAlign: "left" },
  title: { color: colors.text, fontWeight: "700", fontSize: 18, flex: 1, textAlign: "center" },
});
