// app/onboarding/goals.js (or wherever your Goals screen lives)
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import Button from "../../components/Button";
import HeaderBar from "../../components/HeaderBar";
import Card from "../../components/Card";
import { api } from "../../lib/api";

export default function Goals() {
  const router = useRouter();

  const [currentWeight, setCurrentWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [height, setHeight] = useState("");
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    const cur = Number(currentWeight);
    const goal = Number(goalWeight);
    const h = Number(height);
    const wDays = Number(workoutsPerWeek);

    if (!Number.isFinite(cur) || cur <= 0) {
      Alert.alert("Invalid weight", "Please enter your current weight in kg.");
      return;
    }
    if (!Number.isFinite(goal) || goal <= 0) {
      Alert.alert("Invalid goal", "Please enter your goal weight in kg.");
      return;
    }

    try {
      setSaving(true);

      await api.upsertProfileAndGoals({
        // profile fields
        weight_kg: cur,
        height_cm: Number.isFinite(h) && h > 0 ? h : undefined,

        // goals table fields
        target_weight_kg: goal,                    // -> goal_type 'weight'
        workout_days_goal: Number.isFinite(wDays) && wDays > 0 ? wDays : undefined,
        // (you can add calorie_goal, water_cups_goal here later)
      });

      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert(
        "Could not save",
        e?.message || "Something went wrong while saving your goals."
      );
    } finally {
      setSaving(false);
    }
  };

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

      <TextInput
        style={s.input}
        placeholder="Current Weight (kg)"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={currentWeight}
        onChangeText={setCurrentWeight}
      />
      <TextInput
        style={s.input}
        placeholder="Goal Weight (kg)"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={goalWeight}
        onChangeText={setGoalWeight}
      />
      <TextInput
        style={s.input}
        placeholder="Height (cm)"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
      />
      <TextInput
        style={s.input}
        placeholder="Workouts per week"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={workoutsPerWeek}
        onChangeText={setWorkoutsPerWeek}
      />

      <Button
        title={saving ? "Saving..." : "Next"}
        onPress={handleNext}
        style={{ marginTop: spacing(2) }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: spacing(2), backgroundColor: colors.bg },
  step: { color: colors.textMuted, marginBottom: 6 },
  progress: {
    height: 4,
    backgroundColor: colors.primary,
    width: "20%",
    borderRadius: 4,
    marginBottom: spacing(2),
  },
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
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
});
