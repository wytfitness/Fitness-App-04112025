// app/settings/edit-goals.js
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { colors, spacing } from "../../lib/theme";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { getGoals, saveGoals } from "../../lib/goals";

export default function EditGoals() {
  const router = useRouter();

  const [weight, setWeight] = useState("");
  const [workoutDays, setWorkoutDays] = useState("");
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("40");
  const [protein, setProtein] = useState("30");
  const [fat, setFat] = useState("30");
  const [waterCups, setWaterCups] = useState("12");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const g = await getGoals();
        setWeight(String(g.weight ?? ""));
        setWorkoutDays(String(g.workout_days ?? ""));
        setCalories(String(g.calories ?? ""));
        setCarbs(String(g.carbs_pct ?? 40));
        setProtein(String(g.protein_pct ?? 30));
        setFat(String(g.fat_pct ?? 30));
        setWaterCups(String(g.water_cups ?? 12));
      } catch (e) {
        console.warn("Load goals:", e);
      }
    })();
  }, []);

  async function onSave() {
    const c = parseInt(carbs || "0", 10) || 0;
    const p = parseInt(protein || "0", 10) || 0;
    const f = parseInt(fat || "0", 10) || 0;
    if (c + p + f !== 100) {
      Alert.alert("Check macros", "Carbs + Protein + Fat must equal 100%.");
      return;
    }
    const payload = {
      weight: parseFloat(weight) || 0,
      workout_days: parseInt(workoutDays || "0", 10) || 0,
      calories: parseInt(calories || "0", 10) || 0,
      carbs_pct: c,
      protein_pct: p,
      fat_pct: f,
      water_cups: parseInt(waterCups || "0", 10) || 0,
    };

    setSaving(true);
    try {
      await saveGoals(payload);
      router.back();
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: spacing(1) }}>
          <Text style={s.h1}>Edit Goals</Text>

          <Text style={s.section}>Fitness Goals</Text>
          <Card style={s.card}>
            <Text style={s.label}>Target Weight</Text>
            <RowInput value={weight} onChangeText={setWeight} suffix="kg" keyboardType="numeric" />
            <Text style={[s.label, { marginTop: spacing(1) }]}>Workouts per week</Text>
            <RowInput value={workoutDays} onChangeText={setWorkoutDays} keyboardType="numeric" />
          </Card>

          <Text style={s.section}>Nutrition Goals</Text>
          <Card style={s.card}>
            <Text style={s.label}>Target Calories</Text>
            <RowInput value={calories} onChangeText={setCalories} suffix="kcal" keyboardType="numeric" />
            <Text style={[s.label, { marginTop: spacing(1) }]}>Macros</Text>
            <View style={s.macroRow}>
              <Col label="Carbs"><RowInput value={carbs} onChangeText={setCarbs} suffix="%" keyboardType="numeric" /></Col>
              <Col label="Protein"><RowInput value={protein} onChangeText={setProtein} suffix="%" keyboardType="numeric" /></Col>
              <Col label="Fat"><RowInput value={fat} onChangeText={setFat} suffix="%" keyboardType="numeric" /></Col>
            </View>
            <Text style={[s.label, { marginTop: spacing(1) }]}>Water Intake</Text>
            <RowInput value={waterCups} onChangeText={setWaterCups} suffix="glasses" keyboardType="numeric" />
          </Card>

          <Button title={saving ? "Saving..." : "Save Changes"} disabled={saving} onPress={onSave} style={{ marginTop: spacing(2) }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RowInput({ value, onChangeText, suffix, keyboardType = "default" }) {
  return (
    <View style={s.inputRow}>
      <TextInput style={s.input} value={value} onChangeText={onChangeText} keyboardType={keyboardType} inputMode={keyboardType === "numeric" ? "numeric" : "text"} />
      {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
    </View>
  );
}
function Col({ label, children }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.smallLabel}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  h1: { color: colors.text, fontWeight: "800", fontSize: 22, marginBottom: spacing(1) },
  section: { color: colors.text, fontWeight: "800", marginTop: spacing(1.25), marginBottom: spacing(1) },
  card: { padding: spacing(1.25) },

  label: { color: colors.textMuted, marginBottom: 6, fontWeight: "600" },
  smallLabel: { color: colors.textMuted, marginBottom: 6, fontSize: 12 },

  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  input: { flex: 1, color: colors.text },
  suffix: { color: colors.textMuted, marginLeft: 8 },

  macroRow: { flexDirection: "row", gap: spacing(1) },
});
