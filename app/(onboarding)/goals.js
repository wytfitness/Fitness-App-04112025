import { View, Text, StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import Button from "../../components/Button";
import HeaderBar from "../../components/HeaderBar";
import Card from "../../components/Card";

export default function Goals() {
  const router = useRouter();

  return (
    <View style={s.wrap}>
      <HeaderBar title="Goals" />
      <Text style={s.step}>Step 1 of 5</Text>
      <View style={s.progress} />

      <Text style={s.h1}>What are your goals?</Text>
      <Text style={s.p}>We’ll tailor your plan accordingly.</Text>

      <Card style={{ padding: 0, overflow: "hidden", marginBottom: spacing(1.5) }}>
        <View style={s.selectRow}>
          <Text style={{ color: colors.textMuted }}>Select a goal</Text>
          <Text style={{ color: colors.text, fontSize: 18 }}>▾</Text>
        </View>
      </Card>

      <TextInput style={s.input} placeholder="Current Weight (kg)" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
      <TextInput style={s.input} placeholder="Goal Weight (kg)" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

      <Button title="Next" onPress={() => router.replace("/(tabs)")} style={{ marginTop: spacing(2) }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: spacing(2), backgroundColor: colors.bg },
  step: { color: colors.textMuted, marginBottom: 6 },
  progress: { height: 4, backgroundColor: colors.primary, width: "20%", borderRadius: 4, marginBottom: spacing(2) },
  h1: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  p: { color: colors.textMuted, marginBottom: spacing(2) },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: spacing(1.5),
  },
  selectRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
});
