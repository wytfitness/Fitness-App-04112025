// app/settings/edit-goals.js
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { colors, spacing } from "../../lib/theme";
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing(2),
            paddingBottom: spacing(4),
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Screen title */}
          <Text style={sEdit.h1}>Edit Goals</Text>

          {/* FITNESS GOALS CARD */}
          <View style={sEdit.cardOuter}>
            <Text style={sEdit.cardTitle}>Fitness Goals</Text>

            <View style={sEdit.cardBody}>
              <Text style={sEdit.label}>Target Weight</Text>
              <RowInput
                value={weight}
                onChangeText={setWeight}
                suffix="kg"
                keyboardType="numeric"
              />

              <Text style={[sEdit.label, { marginTop: spacing(2) }]}>
                Workouts per week
              </Text>
              <RowInput
                value={workoutDays}
                onChangeText={setWorkoutDays}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* NUTRITION GOALS CARD */}
          <View style={sEdit.cardOuter}>
            <Text style={sEdit.cardTitle}>Nutrition Goals</Text>

            <View style={sEdit.cardBody}>
              <Text style={sEdit.label}>Target Calories</Text>
              <RowInput
                value={calories}
                onChangeText={setCalories}
                suffix="kcal"
                keyboardType="numeric"
              />

              <Text style={[sEdit.label, { marginTop: spacing(2) }]}>
                Water Intake
              </Text>
              <RowInput
                value={waterCups}
                onChangeText={setWaterCups}
                suffix="glasses"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* SAVE BUTTON */}
          <View style={sEdit.saveWrap}>
            <Button
              title={saving ? "Saving..." : "Save Changes"}
              disabled={saving}
              onPress={onSave}
              style={sEdit.saveBtn}
              textStyle={sEdit.saveBtnText}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ----- Reusable subcomponents ----- */

function RowInput({
  value,
  onChangeText,
  suffix,
  keyboardType = "default",
}) {
  return (
    <View style={sEdit.inputRow}>
      <TextInput
        style={sEdit.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        inputMode={keyboardType === "numeric" ? "numeric" : "text"}
      />
      {suffix ? <Text style={sEdit.suffix}>{suffix}</Text> : null}
    </View>
  );
}

function Col({ label, children }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={sEdit.smallLabel}>{label}</Text>
      {children}
    </View>
  );
}

/* ----- Styles ----- */

const sEdit = StyleSheet.create({
  // Page main heading
  h1: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 20,
    marginBottom: spacing(2),
  },

  // Outer card wrapper (matches "Preferences" card style in Settings)
  cardOuter: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(2),

    // soft shadow to lift off background a bit
    shadowColor: "rgba(0,0,0,0.03)",
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  // Card title row
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: spacing(1.5),
    paddingTop: spacing(1.5),
    paddingBottom: spacing(0.5),
  },

  // Inner content spacing
  cardBody: {
    paddingHorizontal: spacing(1.5),
    paddingBottom: spacing(1.5),
  },

  // Field label above inputs ("Target Weight", "Macros", etc.)
  label: {
    color: colors.textMuted,
    marginBottom: 6,
    fontWeight: "600",
    fontSize: 15,
  },

  // Smaller sublabel for macro columns ("Carbs", "Protein", "Fat")
  smallLabel: {
    color: colors.textMuted,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
  },

  // Horizontal row input (text box + suffix)
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },

  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },

  suffix: {
    color: colors.textMuted,
    fontSize: 15,
    marginLeft: 8,
    fontWeight: "500",
  },

  macroRow: {
    flexDirection: "row",
    gap: spacing(1),
  },

  // Save button block
  saveWrap: {
    alignItems: "center",
    marginTop: spacing(1),
  },

  saveBtn: {
    minWidth: 150,
    borderRadius: 10,
    backgroundColor: colors.success, // same family as "Edit Goals"
    paddingVertical: 12,
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  saveBtnText: {
    color: colors.onPrimary ?? "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
