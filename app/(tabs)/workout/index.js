// app/(tabs)/workout/index.js
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing } from "../../../lib/theme";
import { api } from "../../../lib/api";

const PRESETS = {
  Full: [
    { id: "back_squat", name: "Back Squat", sets: 3, reps: 10, weight_kg: null, group: "Legs" },
    { id: "bench_press", name: "Bench Press", sets: 3, reps: 10, weight_kg: null, group: "Chest" },
    { id: "dumbbell_row", name: "Dumbbell Row", sets: 3, reps: 10, weight_kg: null, group: "Back" },
  ],
  Upper: [
    { id: "bench_press", name: "Bench Press", sets: 3, reps: 10, weight_kg: null, group: "Chest" },
    { id: "overhead_press", name: "Overhead Press", sets: 3, reps: 8, weight_kg: null, group: "Shoulders" },
    { id: "lat_pulldown", name: "Lat Pulldown", sets: 3, reps: 10, weight_kg: null, group: "Back" },
  ],
  Lower: [
    { id: "back_squat", name: "Back Squat", sets: 3, reps: 8, weight_kg: null, group: "Legs" },
    { id: "romanian_deadlift", name: "Romanian Deadlift", sets: 3, reps: 10, weight_kg: null, group: "Hamstrings" },
    { id: "calf_raise", name: "Calf Raise", sets: 3, reps: 12, weight_kg: null, group: "Calves" },
  ],
};

const FAVORITES = [
  { id: "bench_press", name: "Bench Press", group: "Chest" },
  { id: "squat", name: "Squat", group: "Legs" },
  { id: "deadlift", name: "Deadlift", group: "Back" },
  { id: "pullups", name: "Pull-ups", group: "Back" },
  { id: "shoulder_press", name: "Shoulder Press", group: "Shoulders" },
  { id: "rows", name: "Rows", group: "Back" },
];

/* ---------- helpers ---------- */
const minsBetween = (a, b) => {
  const ta = Date.parse(a), tb = Date.parse(b);
  return Number.isFinite(ta) && Number.isFinite(tb) && tb > ta
    ? Math.max(1, Math.round((tb - ta) / 60000))
    : 0;
};
const timeAgo = (d) => {
  const t = typeof d === "string" ? Date.parse(d) : d?.getTime?.();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const dd = Math.round(h / 24);
  return `${dd} day${dd > 1 ? "s" : ""} ago`;
};
const slug = (s) => String(s || "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

/* ---------- component ---------- */
export default function GymHomeTab() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [recents, setRecents] = useState([]); // [{id,title,started_at,ended_at,calories_burned,setsCount}]

  const loadRecents = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const j = await api.workouts(10);                         // { workouts: [...] }
      const arr = j.workouts ?? [];
      setRecents(arr);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadRecents(); }, [loadRecents]));

  const goBuild = () => router.push("/workout/exercise-picker");

  const quick = (type = "Full") => {
    const plan = PRESETS[type] || PRESETS.Full;
    router.push({
      pathname: "/workout/review",
      params: { name: `${type} Quick Start`, plan: encodeURIComponent(JSON.stringify(plan)) },
    });
  };

  const repeatWorkout = async (w) => {
    try {
      // fetch sets from last time and rebuild a compact plan
      const detail = await api.workoutDetail(w.id);
      const sets = detail?.sets ?? [];
      if (!sets.length) {
        // no sets stored → just open quick full with the same title
        return router.push({
          pathname: "/workout/review",
          params: { name: w.notes || "Workout", plan: encodeURIComponent(JSON.stringify(PRESETS.Full)) },
        });
      }
      // group by exercise
      const byEx = new Map();
      sets.forEach((s) => {
        const key = s.exercise || "Exercise";
        if (!byEx.has(key)) byEx.set(key, []);
        byEx.get(key).push(s);
      });
      const plan = Array.from(byEx.entries()).map(([name, rows]) => {
        const first = rows[0] || {};
        return {
          id: slug(name) || slug(first.exercise) || `ex_${rows.length}`,
          name,
          sets: rows.length,
          reps: first.reps ?? null,
          weight_kg: first.weight_kg ?? null,
          group: null,
        };
      });

      router.push({
        pathname: "/workout/review",
        params: { name: w.notes || "Workout", plan: encodeURIComponent(JSON.stringify(plan)) },
      });
    } catch (e) {
      console.warn("repeat workout:", e?.message || e);
      // fallback
      quick("Full");
    }
  };

  const startFresh = () => goBuild();

  // …inside component:
  const [favorites, setFavorites] = useState([]);
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const j = await api.favoriteWorkouts();
          setFavorites(j.items ?? j.favorites ?? []);
        } catch (e) {
          setFavorites([]);
        }
      })();
    }, [])
  );

  // helper to launch a stored routine
  const startFavorite = (fav) => {
    const plan = encodeURIComponent(JSON.stringify(fav.plan || []));
    const name = fav.name || "Favorite Workout";
    router.push({ pathname: "/workout/review", params: { name, plan } });
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(6) }} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>Gym</Text>

        {/* Top tiles */}
        <View style={s.row}>
          {/* QUICK START */}
          <View style={[s.tile, { backgroundColor: colors.successSoft }]}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => quick("Full")}>
              <View style={s.tileHead}>
                <View style={[s.iconWrap, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                  <Ionicons name="flash-outline" size={16} color={colors.success} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
              <Text style={s.tileTitle}>Quick Start</Text>
              <Text style={s.tileSub}>Full / Upper / Lower</Text>
            </TouchableOpacity>

            <View style={s.chipsRow}>
              {["Full", "Upper", "Lower"].map((t) => (
                <TouchableOpacity key={t} onPress={() => quick(t)} style={s.chip}>
                  <Text style={s.chipTxt}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* BUILD YOUR OWN */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[s.tile, { backgroundColor: colors.infoSoft }]}
            onPress={goBuild}
          >
            <View style={s.tileHead}>
              <View style={[s.iconWrap, { backgroundColor: "rgba(37,99,235,0.12)" }]}>
                <Ionicons name="list-outline" size={16} color={colors.info} />
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
            <Text style={s.tileTitle}>Build Your Own</Text>
            <Text style={s.tileSub}>Choose exercises</Text>
          </TouchableOpacity>
        </View>

        {/* RECENT */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Recent</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
              <Text style={s.link}>See last workouts →</Text>
            </TouchableOpacity>
          </View>

          {err ? <Text style={s.muted}>{err}</Text> : null}
          {loading ? (
            <ActivityIndicator />
          ) : recents.length === 0 ? (
            <Text style={s.muted}>Your last sessions will appear here.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {recents.map((w) => {
                const mins = minsBetween(w.started_at, w.ended_at);
                const when = w.ended_at ?? w.started_at;
                const ago = timeAgo(when);
                const kcal = Math.round(Number(w.calories_burned ?? 0));

                return (
                  <View key={w.id} style={s.recentItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.recentTitle}>{w.notes || "Workout"}</Text>
                      <Text style={s.recentMeta}>
                        {ago} • {mins} min • {kcal} kcal
                      </Text>
                    </View>
                    <TouchableOpacity style={s.repeatBtn} onPress={() => repeatWorkout(w)}>
                      <Text style={s.repeatTxt}>Repeat</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

       
        {/* FAVORITES */}
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: spacing(1) }]}>Favorites</Text>

          {favorites.length === 0 ? (
            <Text style={s.muted}>Star a workout on the Complete screen to save it here.</Text>
          ) : (
            <View style={s.favGrid}>
              {favorites.map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  activeOpacity={0.9}
                  style={s.favTile}
                  onPress={() => startFavorite(fav)}
                >
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={s.favTitle}>{fav.name}</Text>
                  <Text style={s.favSub}>{(fav.plan?.length ?? 0)} exercises</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* START FRESH */}
        <TouchableOpacity style={s.freshBox} activeOpacity={0.9} onPress={startFresh}>
          <View style={s.freshIcon}>
            <Ionicons name="sync-outline" size={20} color={colors.textMuted} />
          </View>
          <Text style={s.freshText}>Start Fresh Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing(2) },
  h1: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing(1.5) },

  row: { flexDirection: "row", gap: spacing(1) },

  tile: { flex: 1, borderRadius: 16, padding: 14 },
  tileHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tileTitle: { color: colors.text, fontWeight: "800", fontSize: 16, marginTop: 6 },
  tileSub: { color: colors.textMuted, marginTop: 2 },

  chipsRow: { flexDirection: "row", gap: 5, marginTop: 10 },
  chip: {
    paddingHorizontal: 5,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipTxt: { color: colors.text, fontWeight: "700", fontSize: 12 },

  card: {
    marginTop: spacing(2),
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  cardTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  link: { color: colors.primary, fontWeight: "700" },
  muted: { color: colors.textMuted },

  // Recent list
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  recentTitle: { color: colors.text, fontWeight: "800", marginBottom: 3 },
  recentMeta: { color: colors.textMuted, fontSize: 12 },
  repeatBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.success,
    borderRadius: 999,
  },
  repeatTxt: { color: "#fff", fontWeight: "800" },

  // Favorites grid
  favGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  favTile: {
    width: "48%",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  favTitle: { color: colors.text, fontWeight: "800", marginTop: 6 },
  favSub: { color: colors.textMuted, fontSize: 12 },

  // Start fresh
  freshBox: {
    marginTop: spacing(2),
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  freshIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  freshText: { color: colors.textMuted, fontWeight: "700" },
});
