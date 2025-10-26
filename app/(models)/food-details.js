// app/(models)/food-details.js
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { api } from "../../lib/api";

export default function FoodDetailsSheet() {
  const router = useRouter();

  // ✅ ensure we always have a mealId (create today's snack if absent)
  const { mealId: routeMealId } = useLocalSearchParams();
  const [mealId, setMealId] = useState(routeMealId ? String(routeMealId) : null);
  const [preppingMeal, setPreppingMeal] = useState(false);
  const [prepError, setPrepError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (mealId) return;
      setPreppingMeal(true);
      setPrepError(null);
      try {
        const { meal } = await api.createMeal({ meal_type: "snack" });
        if (alive) setMealId(meal.id);
      } catch (e) {
        if (alive) setPrepError("Could not create a meal. Please close and try again.");
      } finally {
        if (alive) setPreppingMeal(false);
      }
    })();
    return () => { alive = false };
  }, [mealId]);

  // form state
  const [name, setName] = useState("");
  const [qty, setQty] = useState("100");
  const [unit, setUnit] = useState("g");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [loading, setLoading] = useState(false);

  const add = async () => {
    if (!mealId) return; // still preparing or failed
    if (!name.trim()) return Alert.alert("Missing name", "Please enter a food name.");

    setLoading(true);
    try {
      await api.addMealItemManual({
        meal_id: mealId,
        food_name: name.trim(),
        qty: qty ? Number(qty) : null,
        unit: unit || null,
        calories: calories ? Number(calories) : null,
        protein_g: protein ? Number(protein) : null,
        carbs_g: carbs ? Number(carbs) : null,
        fat_g: fat ? Number(fat) : null,
        meta: { source: "manual" },
      });
      Alert.alert("Added", name.trim());
      router.back();
    } catch (e) {
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.overlay} edges={["bottom"]}>
      <View style={s.sheet}>
        <View style={s.handle} />

        {/* Header */}
        <View style={s.headerRow}>
          <Text style={s.title}>Manual Food</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.x}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={{ paddingHorizontal: spacing(2), gap: spacing(1.25) }}>
          {preppingMeal ? (
            <View style={{ alignItems: "center", paddingVertical: spacing(2) }}>
              <ActivityIndicator />
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>Preparing meal…</Text>
            </View>
          ) : prepError ? (
            <Text style={{ color: colors.danger, textAlign: "center" }}>{prepError}</Text>
          ) : (
            <>
              {/* Name */}
              <Text style={s.label}>Name</Text>
              <TextInput
                placeholder="e.g. Oatmeal"
                placeholderTextColor={colors.textMuted}
                style={s.input}
                value={name}
                onChangeText={setName}
              />

              {/* Qty / Unit */}
              <Text style={s.label}>Amount</Text>
              <Card style={{ padding: spacing(1) }}>
                <View style={{ flexDirection: "row", gap: spacing(1) }}>
                  <TextInput
                    placeholder="Qty (e.g. 100)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                    value={qty}
                    onChangeText={setQty}
                  />
                  <TextInput
                    placeholder="Unit (g, ml, piece)"
                    placeholderTextColor={colors.textMuted}
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
              </Card>

              {/* Macros */}
              <Text style={s.label}>Macros (for the amount above)</Text>
              <Card style={{ padding: spacing(1) }}>
                <View style={s.macroRow}>
                  <Text style={s.macroKey}>Calories</Text>
                  <TextInput
                    placeholder="kcal"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={s.macroInput}
                    value={calories}
                    onChangeText={setCalories}
                  />
                </View>
                <View style={s.macroRow}>
                  <Text style={s.macroKey}>Protein</Text>
                  <TextInput
                    placeholder="g"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={s.macroInput}
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>
                <View style={s.macroRow}>
                  <Text style={s.macroKey}>Carbs</Text>
                  <TextInput
                    placeholder="g"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={s.macroInput}
                    value={carbs}
                    onChangeText={setCarbs}
                  />
                </View>
                <View style={s.macroRow}>
                  <Text style={s.macroKey}>Fat</Text>
                  <TextInput
                    placeholder="g"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={s.macroInput}
                    value={fat}
                    onChangeText={setFat}
                  />
                </View>
              </Card>
            </>
          )}
        </View>

        {/* Action */}
        <View style={{ padding: spacing(2) }}>
          <Button
            title={loading ? "Adding…" : "Add Food"}
            onPress={add}
            disabled={loading || preppingMeal || !name}
          />
          {loading ? <ActivityIndicator style={{ marginTop: spacing(1) }} /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: spacing(1) },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 6 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing(2) },
  title: { color: colors.text, fontWeight: "700", fontSize: 16, paddingVertical: spacing(1) },
  x: { color: colors.textMuted, fontSize: 18 },

  label: { color: colors.textMuted, fontWeight: "600" },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 14, height: 44,
    paddingHorizontal: 12, color: colors.text, backgroundColor: colors.surface, marginBottom: spacing(1),
  },

  macroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 6 },
  macroKey: { color: colors.textMuted },
  macroInput: {
    width: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 10,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlign: "right",
  },
});
