// app/(models)/add-water.js
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from "react-native";
import { colors, spacing } from "../../lib/theme";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { api } from "../../lib/api";

export default function AddWaterModal() {
  const router = useRouter();
  const [oz, setOz] = useState("12");         // default a common size
  const [saving, setSaving] = useState(false);

  // Convert ounces to milliliters for the backend
  const ml = useMemo(() => {
    const v = parseFloat(oz);
    if (!Number.isFinite(v) || v <= 0) return null;
    return Math.round(v * 29.5735); // 1 oz = 29.5735 ml
  }, [oz]);

  const onAdd = async () => {
    if (!ml) {
      Alert.alert("Invalid value", "Please enter water amount in ounces.");
      return;
    }
    try {
      setSaving(true);
      await api.addWater(ml, new Date().toISOString()); // backend expects ml
      router.back(); // Dashboard refetches on focus
    } catch (e) {
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.overlay} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding" })} style={{ flex: 1, justifyContent: "flex-end" }}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <Text style={s.title}>Quick Add Water</Text>
            <TouchableOpacity onPress={() => router.back()}><Text style={s.x}>✕</Text></TouchableOpacity>
          </View>

          <Card style={{ marginHorizontal: spacing(2), padding: spacing(1.25) }}>
            <Text style={s.label}>Water Intake (oz)</Text>
            <TextInput
              value={oz}
              onChangeText={setOz}
              keyboardType="decimal-pad"
              placeholder="e.g. 12"
              placeholderTextColor={colors.textMuted}
              style={s.input}
            />
            <Text style={s.hint}>
              {ml ? `≈ ${ml} ml` : "Enter ounces; we'll convert to ml"}
            </Text>
          </Card>

          <View style={{ padding: spacing(2) }}>
            <Button title={saving ? "Saving…" : "Add"} onPress={onAdd} disabled={!oz || saving} />
            {saving ? <ActivityIndicator style={{ marginTop: spacing(1) }} /> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: spacing(1) },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 6 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing(2) },
  title: { color: colors.text, fontWeight: "700", fontSize: 16, paddingVertical: spacing(1) },
  x: { color: colors.textMuted, fontSize: 18 },
  label: { color: colors.textMuted, marginBottom: 8, fontWeight: "600" },
  input: {
    height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, color: colors.text, backgroundColor: colors.surface,
  },
  hint: { color: colors.textMuted, marginTop: 6 },
});
