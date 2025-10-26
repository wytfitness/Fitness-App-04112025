// app/(models)/add-weight.js
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { colors, spacing } from "../../lib/theme";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useRouter } from "expo-router";
import { useState, useMemo } from "react";
import { api } from "../../lib/api";

export default function AddWeightModal() {
  const router = useRouter();
  const [lbs, setLbs] = useState("");
  const [loading, setLoading] = useState(false);

  // Convert to kg for backend; show 1 decimal
  const kg = useMemo(() => {
    const v = parseFloat(lbs);
    if (!Number.isFinite(v) || v <= 0) return null;
    return Number((v * 0.45359237).toFixed(1));
  }, [lbs]);

  const onAdd = async () => {
    const v = parseFloat(lbs);
    if (!Number.isFinite(v) || v <= 0 || !kg) {
      Alert.alert("Invalid value", "Please enter a valid weight in lbs.");
      return;
    }
    setLoading(true);
    try {
      await api.addWeight(kg, new Date().toISOString()); // backend expects (kg, recorded_at)
      Alert.alert("Saved", `${v} lbs (≈ ${kg} kg)`);
      router.back(); // Dashboard refetch on focus
    } catch (e) {
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.overlay} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding" })}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <Text style={s.title}>Quick Add Weight</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.x}>✕</Text>
            </TouchableOpacity>
          </View>

          <Card style={{ marginHorizontal: spacing(2), padding: spacing(1.25) }}>
            <Text style={s.label}>Weight (lbs)</Text>
            <TextInput
              value={lbs}
              onChangeText={setLbs}
              keyboardType="decimal-pad"
              placeholder="160.5"
              placeholderTextColor={colors.textMuted}
              style={s.input}
            />
            <Text style={s.hint}>
              {kg ? `≈ ${kg} kg` : "Enter your weight in pounds"}
            </Text>
          </Card>

          <View style={{ padding: spacing(2) }}>
            <Button
              title={loading ? "Saving…" : "Add Weight"}
              onPress={onAdd}
              disabled={loading || !lbs}
            />
            {loading ? (
              <ActivityIndicator style={{ marginTop: spacing(1) }} />
            ) : null}
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
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  hint: { color: colors.textMuted, marginTop: 6 },
});
