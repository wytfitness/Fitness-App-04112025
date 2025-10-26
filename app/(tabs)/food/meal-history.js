import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { colors, spacing } from "../../../lib/theme";
import Card from "../../../components/Card";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../../lib/api";

const tabs = ["Meals", "Workouts", "Weight"];
const ranges = ["Today", "7D", "30D"];

function Segmented({ value, onChange, options }) {
  return (
    <View style={s.segmentWrap}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[s.segmentBtn, active && s.segmentActive]}
          >
            <Text style={[s.segmentTxt, active && s.segmentTxtActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function TopTabs({ value, onChange }) {
  return (
    <View style={s.topTabs}>
      {tabs.map((t) => {
        const active = value === t;
        return (
          <TouchableOpacity key={t} onPress={() => onChange(t)} style={s.topTabBtn}>
            <Text style={[s.topTabTxt, active && s.topTabTxtActive]}>{t}</Text>
            {active ? <View style={s.topTabUnderline} /> : <View style={{ height: 2 }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MealRow({ title, sub, img }) {
  return (
    <TouchableOpacity>
      <View style={s.row}>
        <Image source={img ?? require("../../../assets/splash.png")} style={s.thumb} />
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>{title}</Text>
          <Text style={s.rowSub}>{sub}</Text>
        </View>
        <Text style={s.chev}>⌄</Text>
      </View>
    </TouchableOpacity>
  );
}

function WorkoutRow({ title, sub, onPress }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={s.row}>
        <View style={[s.thumb, s.thumbIcon]}>
          <Text style={{ color: colors.text }}>🏋️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>{title}</Text>
          <Text style={s.rowSub}>{sub}</Text>
        </View>
        <Text style={s.chev}>⌄</Text>
      </View>
    </TouchableOpacity>
  );
}

function WeightRow({ date, value, unit = "lbs", onPress }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={s.row}>
        <View style={[s.thumb, s.thumbIcon]}>
          <Text style={{ color: colors.text }}>⚖️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>
            {value} {unit}
          </Text>
          <Text style={s.rowSub}>{date}</Text>
        </View>
        <Text style={s.chev}>⌄</Text>
      </View>
    </TouchableOpacity>
  );
}

// helpers
const kgToLbs = (kg) => Number((Number(kg) * 2.20462262).toFixed(1));
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function durMin(w) {
  const s = w?.started_at ? new Date(w.started_at) : null;
  const e = w?.ended_at ? new Date(w.ended_at) : null;
  if (s && e && e > s) return Math.max(1, Math.round((e - s) / 60000));
  return w?.duration_min != null ? Math.max(0, Math.round(Number(w.duration_min))) : 0;
}

export default function History() {
  const router = useRouter();

  const [tab, setTab] = useState("Workouts");
  const [range, setRange] = useState("Today");

  // data
  const [weights, setWeights] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [meals, setMeals] = useState([]); // flattened items for current range

  // loading states
  const [loadingWW, setLoadingWW] = useState(true);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [err, setErr] = useState(null);

  // range start date
  const rangeStart = useMemo(() => {
    const now = new Date();
    if (range === "Today") {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const days = range === "7D" ? 7 : 30;
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [range]);

  // fetchers
  const loadWW = useCallback(async () => {
    setLoadingWW(true);
    try {
      const [wWeights, wWorkouts] = await Promise.all([
        api.weights(200),
        api.workouts(200),
      ]);
      setWeights(wWeights.weights ?? []);
      setWorkouts(wWorkouts.workouts ?? []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoadingWW(false);
    }
  }, []);

  const loadMeals = useCallback(async () => {
    setLoadingMeals(true);
    try {
      let items = [];
      if (range === "Today") {
        const { meals } = await api.mealsToday();
        const mapType = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
        for (const m of meals ?? []) {
          const label = mapType[m.meal_type ?? "snack"] ?? "Snack";
          for (const it of m.meal_items ?? []) {
            items.push({
              id: it.id,
              title: it.food_name,
              sub: `${label}${it.calories != null ? ` • ${Math.round(it.calories)} cal` : ""}`,
            });
          }
        }
      } else {
        // Use range endpoint for 7D/30D
        const endISO = new Date().toISOString();
        const startISO = new Date(rangeStart).toISOString();
        const { meals } = await api.mealsRange(startISO, endISO);

        const mapType = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
        for (const m of meals ?? []) {
          const label = mapType[m.meal_type ?? "snack"] ?? "Snack";
          const when = m.eaten_at ? new Date(m.eaten_at).toLocaleDateString() : "";
          for (const it of m.meal_items ?? []) {
            items.push({
              id: it.id,
              title: it.food_name,
              sub: `${label}${it.calories != null ? ` • ${Math.round(it.calories)} cal` : ""}${when ? ` • ${when}` : ""}`,
            });
          }
        }
        // newest first
        items.sort((a, b) => (a.sub > b.sub ? -1 : 1));
      }
      setMeals(items);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoadingMeals(false);
    }
  }, [range, rangeStart]);

  // initial + focus load
  useEffect(() => { loadWW(); }, [loadWW]);
  useEffect(() => { loadMeals(); }, [loadMeals]);
  useFocusEffect(useCallback(() => { loadWW(); loadMeals(); }, [loadWW, loadMeals]));

  // filter by range
  const filteredWorkouts = useMemo(() => {
    const start = rangeStart.getTime();
    return (workouts ?? []).filter((w) => {
      const ts = w.ended_at ?? w.started_at;
      const t = ts ? new Date(ts).getTime() : NaN;
      if (Number.isNaN(t)) return false;
      if (range === "Today") return isSameDay(new Date(t), new Date());
      return t >= start;
    });
  }, [workouts, range, rangeStart]);

  const filteredWeights = useMemo(() => {
    const start = rangeStart.getTime();
    return (weights ?? []).filter((w) => {
      const ts = w.recorded_at ?? w.created_at ?? w.inserted_at;
      const t = ts ? new Date(ts).getTime() : NaN;
      if (Number.isNaN(t)) return false;
      if (range === "Today") return isSameDay(new Date(t), new Date());
      return t >= start;
    });
  }, [weights, range, rangeStart]);

  // dataset for current tab
  let data = [];
  if (tab === "Meals") {
    data = meals;
  } else if (tab === "Workouts") {
    data = filteredWorkouts
      .sort((a, b) => new Date(b.ended_at ?? b.started_at) - new Date(a.ended_at ?? a.started_at))
      .map((w) => {
        const when = new Date(w.ended_at ?? w.started_at);
        const sub = `${when.toLocaleDateString()} • ${durMin(w)} min • ${Math.round(Number(w.calories_burned ?? 0))} kcal`;
        return { id: w.id, title: w.notes || "Workout", sub };
      });
  } else if (tab === "Weight") {
    data = filteredWeights.map((w) => {
      const ts = w.recorded_at ?? w.created_at ?? w.inserted_at;
      return {
        id: w.id,
        date: ts ? new Date(ts).toLocaleDateString() : "",
        value: kgToLbs(w.weight_kg),
      };
    });
  }

  const isLoading = tab === "Meals" ? loadingMeals : loadingWW;

  return (
    <SafeAreaView style={s.wrap} edges={["top"]}>
      <View style={s.headerRow}>
        <Text style={s.hTitle}>History</Text>
      </View>

      <TopTabs value={tab} onChange={setTab} />

      <Card style={{ marginTop: spacing(1) }}>
        <Segmented value={range} onChange={setRange} options={ranges} />
      </Card>

      {err ? (
        <Text style={{ color: colors.danger, marginTop: spacing(1) }}>{err}</Text>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing(2) }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) =>
            tab === "Meals" ? (
              <MealRow title={item.title} sub={item.sub} img={require("../../../assets/splash.png")} />
            ) : tab === "Workouts" ? (
              <WorkoutRow
                title={item.title}
                sub={item.sub}
                onPress={() =>
                  router.push({ pathname: "/history/workout-details", params: { id: item.id } })
                }
              />
            ) : (
              <WeightRow
                date={item.date}
                value={item.value}
                onPress={() => router.push("/history/weight-history")}
              />
            )
          }
          contentContainerStyle={{ paddingVertical: spacing(1) }}
          ItemSeparatorComponent={() => <View style={{ height: spacing(1) }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2), paddingBottom: spacing(2) },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(1) },
  hTitle: { color: colors.text, fontWeight: "700", fontSize: 20 },

  topTabs: { flexDirection: "row", justifyContent: "space-around", borderBottomWidth: 1, borderColor: colors.border },
  topTabBtn: { flex: 1, paddingVertical: spacing(1), alignItems: "center" },
  topTabTxt: { color: colors.textMuted, fontWeight: "600" },
  topTabTxtActive: { color: colors.text },
  topTabUnderline: { marginTop: spacing(0.5), height: 2, width: "100%", backgroundColor: colors.primary, borderRadius: 2 },

  segmentWrap: { backgroundColor: colors.surface, borderRadius: 999, flexDirection: "row", padding: 4, gap: 6 },
  segmentBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999 },
  segmentActive: { backgroundColor: colors.card },
  segmentTxt: { color: colors.textMuted, fontWeight: "600" },
  segmentTxtActive: { color: colors.text },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing(1),
    gap: spacing(1),
  },
  thumb: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  thumbIcon: { alignItems: "center", justifyContent: "center" },
  rowTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  rowSub: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
  chev: { color: colors.textMuted, fontSize: 18, paddingHorizontal: 6 },
});
