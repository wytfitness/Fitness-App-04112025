// app/(tabs)/food/index.js
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing } from "../../../lib/theme";
import Card from "../../../components/Card";
import { Ionicons } from "@expo/vector-icons";

import {
  getMealsByDate, ensureMeal, createMealOn, isSameLocalDay,
} from "../../../lib/diary";

// --- helpers ---
const nf = new Intl.NumberFormat();
const fmtDateRangeTitle = (d) =>
  d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

const TITLE_BY_TYPE = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

// safe API call (optional endpoints)
import { api } from "../../../lib/api";
async function safeCall(fn) {
  try { return await fn?.(); } catch { return undefined; }
}

export default function Diary() {
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState([]);

  // top cards
  const [water, setWater] = useState({ cups: 8, goal: 12 });   // fallback values
  const [weight, setWeight] = useState({ kg: null, deltaKg: null });

  const refresh = useCallback(async () => {
    setLoading(true);

    // Meals for the selected date
    const m = await getMealsByDate(date);
    setMeals(m || []);

    // Optional: water today
    const w = await safeCall(() => api.waterToday?.(date));
    if (w && (w.cups != null || w.value_ml != null)) {
      const cups = w.cups ?? Math.round((w.value_ml ?? 0) / 250);
      setWater({ cups, goal: w.goal_cups ?? 12 });
    }

    // Optional: latest weight for or before date
    const lw =
      (await safeCall(() => api.weightOn?.(date))) ||
      (await safeCall(() => api.latestWeight?.()));
    if (lw) setWeight({ kg: lw.weight_kg ?? lw.value_kg ?? lw.kg ?? null, deltaKg: lw.delta_kg ?? null });

    setLoading(false);
  }, [date]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Create/open a meal for this date & type, then push modal
  async function handleAdd(mealType) {
    let existing = meals?.find((m) => m.meal_type === mealType);
    if (!existing) existing = await ensureMeal(mealType, date) || await createMealOn(mealType, date);
    if (!existing) return;
    router.push({ pathname: "/(models)/add-food", params: { mealId: String(existing.id) } });
  }

  function openMealHistory(mealType) {
    router.push({ pathname: "/(tabs)/food/meal-history", params: { date: date.toISOString(), mealType } });
  }

  // derived progress
  const waterPct = Math.max(0, Math.min(1, water.goal ? water.cups / water.goal : 0));

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={s.container}>

        {/* Date bar */}
        <Card style={s.dateCard}>
          <TouchableOpacity onPress={() => setDate(new Date(date.getTime() - 86400000))} style={s.navBtn}>
            <Ionicons name="chevron-back-outline" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.dateTitle}>{fmtDateRangeTitle(date)}</Text>
          <TouchableOpacity onPress={() => setDate(new Date(date.getTime() + 86400000))} style={s.navBtn}>
            <Ionicons name="chevron-forward-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </Card>

        {/* Top stats */}
        <View style={s.grid2}>
          <StatCard
            title="Water"
            icon="water-outline"
            value={`${water.cups} ${water.cups === 1 ? "cup" : "cups"}`}
            goal={`Goal: ${water.goal} ${water.goal === 1 ? "cup" : "cups"}`}
            progress={waterPct}
            accent={colors.info}
            onPress={() => router.push("/(models)/add-water")}
          />
          <StatCard
            title="Weight"
            icon="scale-outline"
            value={weight.kg != null ? `${Number(weight.kg).toFixed(1)} kg` : "— kg"}
            goal={weight.deltaKg != null ? `${weight.deltaKg > 0 ? "+" : ""}${weight.deltaKg} kg` : "Tap to log"}
            progress={0}
            accent={colors.purple}
            onPress={() => router.push("/(models)/add-weight")}
          />
        </View>

        {/* Meal sections */}
        <MealSection
          title="Breakfast"
          color="#E6F7F5"
          icon="cafe-outline"
          items={itemsFrom(meals, "breakfast")}
          onAdd={() => handleAdd("breakfast")}
          onOpenHistory={() => openMealHistory("breakfast")}
        />
        <MealSection
          title="Lunch"
          color="#E6F7F5"
          icon="restaurant-outline"
          items={itemsFrom(meals, "lunch")}
          onAdd={() => handleAdd("lunch")}
          onOpenHistory={() => openMealHistory("lunch")}
        />
        <MealSection
          title="Dinner"
          color="#E6F7F5"
          icon="moon-outline"
          items={itemsFrom(meals, "dinner")}
          onAdd={() => handleAdd("dinner")}
          onOpenHistory={() => openMealHistory("dinner")}
        />
        <MealSection
          title="Snacks"
          color="#E6F7F5"
          icon="ice-cream-outline"
          items={itemsFrom(meals, "snack")}
          onAdd={() => handleAdd("snack")}
          onOpenHistory={() => openMealHistory("snack")}
        />

        {loading ? <ActivityIndicator style={{ marginTop: spacing(1) }} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- helpers/components ----
function itemsFrom(meals, type) {
  const m = meals?.filter((x) => x.meal_type === type) || [];
  const items = m.flatMap((mi) => mi.meal_items ?? []);
  return items.map((it) => ({ id: it.id, name: it.food_name, kcal: it.calories }));
}

function StatCard({ title, icon, value, goal, progress, accent, onPress }) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flex: 1 }}>
      <Card style={s.statCard}>
        <View style={s.rowBetween}>
          <Text style={s.statTitle}>{title}</Text>
          <Ionicons name={icon} size={16} color={accent} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 6 }}>
          <Text style={s.statValue}>{value}</Text>
        </View>
        <View style={s.progress}>
          <View style={[s.bar, { width: `${pct * 100}%`, backgroundColor: accent }]} />
        </View>
        <Text style={s.statGoal}>{goal}</Text>
      </Card>
    </TouchableOpacity>
  );
}

function MealSection({ title, items = [], onAdd, onOpenHistory, color, icon }) {
  return (
    <View style={{ marginTop: spacing(1.25) }}>
      <View style={s.mealHeader}>
        <Text style={s.mealTitle}>{title}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity onPress={onOpenHistory} style={s.historyBtn}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={s.historyTxt}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAdd} style={s.addBtn}>
            <Text style={s.addTxt}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Empty state card (like the mock) */}
      {(!items || items.length === 0) ? (
        <Card style={[s.emptyMealCard, { backgroundColor: color }, s.square]}>
          <View style={s.emptyIconWrap}>
            <Ionicons name={icon} size={18} color={colors.orange} />
          </View>
          <Text style={s.emptyTxt}>No items yet</Text>
        </Card>
      ) : (
        items.map((it) => (
          <Card key={it.id} style={[s.mealItem, s.square]}>
            <View>
              <Text style={s.mealItemName} numberOfLines={1}>{it.name}</Text>
              <Text style={s.mealItemSub}>{it.kcal != null ? `${Math.round(it.kcal)} kcal` : "—"}</Text>
            </View>
            <Text style={s.chev}>›</Text>
          </Card>
        ))
      )}
    </View>
  );
}

// ---- styles ----
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(1), paddingBottom: spacing(3) },

  // Date
  dateCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: { padding: 6, borderRadius: 10 },
  dateTitle: { color: colors.text, fontWeight: "700" },

  // Stats
  grid2: { flexDirection: "row", gap: spacing(1), marginTop: spacing(1) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statCard: { flex: 1, paddingVertical: spacing(1.25) },
  statTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  statValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  statGoal: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  progress: {
    marginTop: 8, height: 6, backgroundColor: colors.surface,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  bar: { height: "100%", borderRadius: 999 },
  square: { borderRadius: 0 },

  // Meals
  mealHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing(1.25), marginBottom: spacing(0.75) },
  mealTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  historyBtn: {
    height: 32, paddingHorizontal: 10, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  historyTxt: { color: colors.textMuted, fontSize: 12 },

  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  addTxt: { color: colors.text, fontSize: 18, marginTop: -2 },

  emptyMealCard: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  emptyTxt: { color: colors.textMuted },

  mealItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing(1.25), marginTop: 6,
  },
  mealItemName: { color: colors.text, fontSize: 15, fontWeight: "600", maxWidth: "80%" },
  mealItemSub: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
  chev: { color: colors.textMuted, fontSize: 20 },
});
