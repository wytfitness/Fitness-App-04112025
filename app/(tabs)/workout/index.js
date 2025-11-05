import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, shadow } from "../../../lib/theme";
import { api } from "../../../lib/api";
import { LinearGradient } from "expo-linear-gradient";

const PRESETS = {
  Full: [
    {
      id: "back_squat",
      name: "Back Squat",
      sets: 3,
      reps: 10,
      weight_kg: null,
      group: "Legs",
    },
    {
      id: "bench_press",
      name: "Bench Press",
      sets: 3,
      reps: 10,
      weight_kg: null,
      group: "Chest",
    },
    {
      id: "dumbbell_row",
      name: "Dumbbell Row",
      sets: 3,
      reps: 10,
      weight_kg: null,
      group: "Back",
    },
  ],
  Upper: [
    {
      id: "bench_press",
      name: "Bench Press",
      sets: 3,
      reps: 10,
      weight_kg: null,
      group: "Chest",
    },
    {
      id: "overhead_press",
      name: "Overhead Press",
      sets: 3,
      reps: 8,
      weight_kg: null,
      group: "Shoulders",
    },
    {
      id: "lat_pulldown",
      name: "Lat Pulldown",
      sets: 3,
      reps: 10,
      weight_kg: null,
      group: "Back",
    },
  ],
  Lower: [
    {
      id: "back_squat",
      name: "Back Squat",
      sets: 3,
      reps: 8,
      weight_kg: null,
      group: "Legs",
    },
    {
      id: "romanian_deadlift",
      name: "Romanian Deadlift",
      sets: 3,
      reps: 10,
      weight_kg: null,
      group: "Hamstrings",
    },
    {
      id: "calf_raise",
      name: "Calf Raise",
      sets: 3,
      reps: 12,
      weight_kg: null,
      group: "Calves",
    },
  ],
};

/* ---------- helpers ---------- */
const minsBetween = (a, b) => {
  const ta = Date.parse(a),
    tb = Date.parse(b);
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
const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/* ---------- component ---------- */
export default function GymHomeTab() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [recents, setRecents] = useState([]); // [{id,title,started_at,ended_at,calories_burned,setsCount}]
  const [favorites, setFavorites] = useState([]);

  const loadRecents = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const j = await api.workouts(10); // { workouts: [...] }
      const arr = j.workouts ?? [];
      setRecents(arr);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecents();
    }, [loadRecents])
  );

  // favorites from backend
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

  const goBuild = () => router.push("/workout/exercise-picker");

  const quick = (type = "Full") => {
    const plan = PRESETS[type] || PRESETS.Full;
    router.push({
      pathname: "/workout/review",
      params: {
        name: `${type} Quick Start`,
        plan: encodeURIComponent(JSON.stringify(plan)),
      },
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
          params: {
            name: w.notes || "Workout",
            plan: encodeURIComponent(JSON.stringify(PRESETS.Full)),
          },
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
        params: {
          name: w.notes || "Workout",
          plan: encodeURIComponent(JSON.stringify(plan)),
        },
      });
    } catch (e) {
      console.warn("repeat workout:", e?.message || e);
      // fallback
      quick("Full");
    }
  };

  const startFresh = () => goBuild();

  // helper to launch a stored routine
  const startFavorite = (fav) => {
    const plan = encodeURIComponent(JSON.stringify(fav.plan || []));
    const name = fav.name || "Favorite Workout";
    router.push({ pathname: "/workout/review", params: { name, plan } });
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.container}
      >
        {/* HEADER */}
        <Text style={s.h1}>Gym</Text>

        {/* TOP TILES */}
        <View style={s.tilesRow}>
          {/* QUICK START */}
          <View style={[s.tile, s.quickTile,{ flex: 0.8 }, shadow]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => quick("Full")}
            >
              <View style={s.tileHead}>
                <View
                  style={[
                    s.iconWrap,
                    { backgroundColor: "rgba(0,199,165,0.12)" },
                  ]}
                >
                  <Ionicons
                    name="flash-outline"
                    size={18}
                    color={colors.success}
                  />
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </View>
              <Text style={s.tileTitle}>Quick Start</Text>
              <Text style={s.tileSub}>Full / Upper / Lower</Text>
            </TouchableOpacity>

            <View style={s.chipsRow}>
              {["Full", "Upper", "Lower"].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => quick(t)}
                  style={s.chip}
                >
                  <Text style={s.chipTxt}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* BUILD YOUR OWN */}
           <TouchableOpacity
              activeOpacity={0.9}
              style={[s.tile, s.buildTile, { flex: 1/4 }, shadow]}
              onPress={goBuild}
            >
            <View style={s.tileHead}>
              <View
                style={[
                  s.iconWrap,
                  { backgroundColor: "rgba(58,91,255,0.12)" },
                ]}
              >
                <Ionicons
                  name="list-outline"
                  size={18}
                  color={colors.info}
                />
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </View>
            <Text style={s.tileTitle}>Build Your Own</Text>
            <Text style={s.tileSub}>Choose exercises</Text>
          </TouchableOpacity>
        </View>

        {/* RECENT WORKOUTS */}
        <View style={[s.card, shadow]}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Recent</Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/history")}
              hitSlop={8}
            >
              <Text style={s.link}>See last workouts →</Text>
            </TouchableOpacity>
          </View>

          {err ? <Text style={s.muted}>{err}</Text> : null}

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 8 }} />
          ) : recents.length === 0 ? (
            <Text style={s.muted}>
              Your last training sessions will appear here.
            </Text>
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
                      <Text style={s.recentTitle}>
                        {w.notes || "Untitled Workout"}
                      </Text>
                      <Text style={s.recentMeta}>
                        {ago} • {mins} min • {kcal} kcal
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.repeatBtn}
                      onPress={() => repeatWorkout(w)}
                    >
                      <Text style={s.repeatTxt}>Repeat</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* FAVORITES */}
        <View style={[s.card, shadow]}>
          <Text style={[s.cardTitle, { marginBottom: spacing(1) }]}>
            Favorites
          </Text>

          {favorites.length === 0 ? (
            <Text style={s.muted}>
              Star a workout on the Complete screen to save it here.
            </Text>
          ) : (
            <View style={s.favGrid}>
              {favorites.map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  activeOpacity={0.9}
                  style={s.favTile}
                  onPress={() => startFavorite(fav)}
                >
                  <Ionicons
                    name="star"
                    size={16}
                    color={colors.warning}
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={s.favTitle} numberOfLines={2}>
                    {fav.name}
                  </Text>
                  <Text style={s.favSub}>
                    {(fav.plan?.length ?? 0) || 1} exercises
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* START FRESH WORKOUT */}
        <TouchableOpacity activeOpacity={0.9} onPress={startFresh}>
          <LinearGradient
            colors={["#EEF3FF", "#E3F5FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.freshBox, shadow]}
          >
            <View style={s.freshIcon}>
              <Ionicons
                name="sync-outline"
                size={20}
                color={colors.info}
              />
            </View>
            <View>
              <Text style={s.freshTitle}>Start Fresh Workout</Text>
              <Text style={s.freshSub}>
                Begin a new training session
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: spacing(5),
  },

  /* header */
  h1: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing(1.5),
  },

  /* top tiles */
  tilesRow: {
    flexDirection: "row",
    gap: spacing(1.5),
  },
  tile: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
  },
  quickTile: {
    backgroundColor: '#EBFEFA', // soft mint
  },
  buildTile: {
    backgroundColor: '#EDF2FF', // soft periwinkle
  },
  tileHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
    marginTop: 8,
  },
  tileSub: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 13,
  },

  chipsRow: {
    flexDirection: "row",
    gap: 0,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipTxt: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },

  /* cards */
  card: {
    marginTop: spacing(2.5),
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },

  /* recent list */
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  recentTitle: {
    color: colors.text,
    fontWeight: "800",
    marginBottom: 3,
  },
  recentMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  repeatBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    marginLeft: 10,
  },
  repeatTxt: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  /* favorites grid */
  favGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  favTile: {
    width: "48%",
    backgroundColor: "#FFF7E6",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  favTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 4,
  },
  favSub: {
    color: colors.textMuted,
    fontSize: 12,
  },

  /* start fresh */
  freshBox: {
    marginTop: spacing(2.5),
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  freshIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  freshTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  freshSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
