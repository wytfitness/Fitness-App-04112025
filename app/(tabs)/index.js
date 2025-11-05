// app/(tabs)/index.js
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, shadow } from "../../lib/theme";
import Card from "../../components/Card";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../lib/api";
import { getGoals } from "../../lib/goals";
import Svg, { Circle } from "react-native-svg";
import { Animated, Easing, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";

const nf = new Intl.NumberFormat();

// Soft pastel backgrounds + bold accents for nutrition cards (kept if you use later)
const MACRO_COLORS = {
  calories: { bg: "#FFE7C2", accent: "#FF7A00" },
  protein: { bg: "#EAF3FF", accent: "#0A66FF" },
  carbs: { bg: "#D9F8EB", accent: "#12D3C1" },
  fat: { bg: "#FFE1EA", accent: "#FF3B70" },
};

// helper to safely call optional API methods
async function safeCall(fn) {
  try {
    return await fn?.();
  } catch (e) {
    console.warn("dashboard fetch:", e?.message || e);
    return undefined;
  }
}

function todayWindowLocal() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0
  );
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function overlapMinutesInWindow(row, { start, end }) {
  const s = toMs(row?.started_at ?? row?.start_time ?? row?.start);
  const eRaw = row?.ended_at ?? row?.end_time ?? row?.completed_at;
  const eVal = toMs(eRaw);
  const e = Number.isFinite(eVal) ? eVal : Date.now(); // handle ongoing

  if (!Number.isFinite(s)) return 0;

  const a = Math.max(s, start.getTime());
  const b = Math.min(e, end.getTime());
  return b > a ? Math.max(1, Math.round((b - a) / 60000)) : 0;
}

/** ===== NEW helpers to count ongoing sessions & estimate calories ===== */
function toMs(d) {
  return Date.parse(String(d));
}



function minutesOf(row, { allowOngoing = true } = {}) {
  const s = toMs(row?.started_at ?? row?.start_time ?? row?.start);
  const e = toMs(
    row?.ended_at ?? row?.end_time ?? row?.completed_at ?? row?.date
  );

  // finished
  if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
    return Math.max(1, Math.round((e - s) / 60000));
  }
  // ongoing (no end yet)
  if (allowOngoing && Number.isFinite(s)) {
    const now = Date.now();
    if (now > s)
      return Math.min(180, Math.max(1, Math.round((now - s) / 60000))); // clamp 3h
  }
  // fallback to precomputed fields
  const raw = Number(row?.duration_min ?? row?.duration ?? 0);
  return Math.max(0, Math.round(raw));
}

function caloriesOf(row, latestWeightKg = 70) {
  const v = Number(row?.calories_burned ?? row?.calories);
  if (Number.isFinite(v) && v > 0) return Math.round(v);
  const mins = minutesOf(row, { allowOngoing: true });
  const MET = 6; // moderate estimate
  return Math.round((MET * 3.5 * latestWeightKg) / 200 * mins);
}

// Weight-based macro goals (fallbacks if no weight available)
const PROTEIN_G_PER_KG = 1.6;
const FAT_G_PER_KG = 0.8;

function deriveMacroGoals({ cal, macroPct, weightKg }) {
  if (Number.isFinite(weightKg) && weightKg > 0) {
    const pGoalG = Math.max(0, Math.round(PROTEIN_G_PER_KG * weightKg));
    const fGoalG = Math.max(0, Math.round(FAT_G_PER_KG * weightKg));
    const usedCal = pGoalG * 4 + fGoalG * 9;
    const carbCal = Math.max(0, Math.round((cal || 0) - usedCal));
    const cGoalG = Math.round(carbCal / 4);
    return { p: pGoalG, c: cGoalG, f: fGoalG };
  }

  // fallback to percents only if no weight
  const safeCal = Number(cal || 0);
  const pPct = Number(macroPct?.p || 0);
  const cPct = Number(macroPct?.c || 0);
  const fPct = Number(macroPct?.f || 0);

  const pGoal = (safeCal * (pPct / 100)) / 4;
  const cGoal = (safeCal * (cPct / 100)) / 4;
  const fGoal = (safeCal * (fPct / 100)) / 9;

  return {
    p: Math.max(0, Math.round(pGoal || 0)),
    c: Math.max(0, Math.round(cGoal || 0)),
    f: Math.max(0, Math.round(fGoal || 0)),
  };
}

/** ===================================================================== */

export default function Dashboard() {
  const router = useRouter();
  const PADX = spacing(2); // more padding to match Figma side margins

  // totals from meals (FOOD)
  const [totals, setTotals] = useState({ kcal: 0, p: 0, c: 0, f: 0 });

  // goals
  const [goals, setGoals] = useState({
    cal: 2200,
    waterMl: 2500,
    activeMin: 60,
    targetWeightKg: 72,
  });
  const [macroPct, setMacroPct] = useState({ c: 40, p: 30, f: 30 });

  // weekly summary (last 7 days)
  const [weekly, setWeekly] = useState({
    workouts: 0,
    calories: 0,
    active_min: 0,
  });
  const formatK = (n) => {
    const v = Math.round(Number(n || 0));
    return v >= 1000
      ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
      : String(v);
  };

  // weight & workout
  const [weight, setWeight] = useState({ valueKg: null, deltaKg: 0 });
  const [workout, setWorkout] = useState({
    title: "—",
    durationMin: 0,
    calories: 0,
    dateLabel: "",
    completed: true,
  });

  // 🔹 Exercise kcal (today) — used to compute Remaining from Net = Food - Exercise
  const [exerciseKcal, setExerciseKcal] = useState(0);

  // daily activity
  const [steps, setSteps] = useState({ value: 8234, goal: 10000 });
  const [water, setWater] = useState({ ml: 1800 });

  // recommendations
  const [recs, setRecs] = useState([]);

  // macro dialog
  const [showMacros, setShowMacros] = useState(false);

  //active state
  const [active, setActive] = useState({ minsToday: 0, streak: 0 });

  const loadDashboard = useCallback(async () => {
    // 1) meals/macros (FOOD)
    const mealsRes = (await safeCall(() => api.mealsToday?.())) || {};
    const meals = mealsRes?.meals ?? [];
    const items = meals.flatMap((m) => m.meal_items ?? []);
    const t = items.reduce(
      (acc, it) => {
        acc.kcal += Number(it.calories ?? 0);
        acc.p += Number(it.protein_g ?? 0);
        acc.c += Number(it.carbs_g ?? 0);
        acc.f += Number(it.fat_g ?? 0);
        return acc;
      },
      { kcal: 0, p: 0, c: 0, f: 0 }
    );
    setTotals(t);

    // 2) goals from DB (fallback profile)
    const g = (await safeCall(() => getGoals?.())) || null;
    if (g) {
      setGoals((prev) => ({
        ...prev,
        cal: g.calories ?? prev.cal,
        waterMl: (g.water_cups ?? 12) * 250,
        targetWeightKg: g.weight ?? prev.targetWeightKg,
      }));
      setMacroPct({
        c: g.carbs_pct ?? 40,
        p: g.protein_pct ?? 30,
        f: g.fat_pct ?? 30,
      });
    } else {
      const profile = await safeCall(() => api.profile?.());
      if (profile) {
        setGoals((prev) => ({
          ...prev,
          cal: profile.calorie_goal ?? prev.cal,
          waterMl: profile.water_goal_ml ?? prev.waterMl,
          activeMin: profile.active_minutes_goal ?? prev.activeMin,
          targetWeightKg: profile.target_weight_kg ?? prev.targetWeightKg,
        }));
      }
    }

    // 3) latest weight + delta vs target
    const w = (await safeCall(() => api.latestWeight?.())) || null;
    if (w) {
      const current = Number(w.weight_kg ?? w.value_kg ?? w.kg);
      const tgt = Number(goals.targetWeightKg);
      setWeight({
        valueKg: Number.isFinite(current) ? current : null,
        deltaKg:
          Number.isFinite(current) && Number.isFinite(tgt) ? current - tgt : 0,
      });
    }

    // 4) last workout (for the "Last Workout" data)
    let lw = await safeCall(() => api.lastWorkout?.());
    if (lw && lw.workout) lw = lw.workout;
    if (!lw) {
      const d = await safeCall(() => api.dashboard?.());
      lw = d?.last_workout ?? d?.lastWorkout ?? lw;
    }
    if (!lw) {
      const list = (await safeCall(() => api.workouts?.(25))) || {};
      const arr =
        list?.workouts ?? list?.items ?? (Array.isArray(list) ? list : []);
      lw = pickLatestWorkout(arr);
    }
    if (!lw) lw = await fetchLastWorkoutDirect();
    if (lw) {
      setWorkout(normalizeWorkout(lw));
    } else {
      setWorkout({
        title: "—",
        durationMin: 0,
        calories: 0,
        dateLabel: "",
        completed: false,
      });
    }
    /** ===== 4b) Today’s workouts (LOCAL today, only workouts started today) ===== */
    try {
      const { start, end } = todayWindowLocal();
      const dayStartMs = start.getTime();
      const dayEndMs   = end.getTime();

      const wks = (await safeCall(() => api.workouts?.(120))) || {};
      const arr =
        wks?.workouts ?? wks?.items ?? (Array.isArray(wks) ? wks : []);

      const latestW =
        Number(weight?.valueKg ?? goals?.targetWeightKg ?? 70) || 70;

      let minsToday = 0;
      let kcalFromWorkouts = 0;

      for (const r of arr) {
        // only workouts that STARTED today (local)
        const s = toMs(
          r.started_at ??
          r.start_time ??
          r.date ??
          r.completed_at ??
          r.ended_at
        );
        if (!Number.isFinite(s) || s < dayStartMs || s >= dayEndMs) continue;

        // minutes for THIS workout (clamp to 3h so bad timestamps can't explode)
        const mins = Math.min(180, minutesOf(r, { allowOngoing: true }));
        if (!mins) continue;

        minsToday += mins;

        // use recorded calories if they look sane, else estimate
        let c = Number(r.calories_burned ?? r.calories);
        if (!Number.isFinite(c) || c <= 0 || c > 3000) {
          const MET = 6;
          c = Math.round((MET * 3.5 * latestW / 200) * mins);
        }
        kcalFromWorkouts += c;
      }

      // clamp daily total as a final safety (no one burns 200k kcal in a day)
      const finalKcal = Math.min(8000, Math.max(0, Math.round(kcalFromWorkouts)));

      setExerciseKcal(finalKcal);

      // === streak logic (reuse the same arr, you had this part already) ===
      const daysWithWorkout = new Set(
        arr
          .map((r) =>
            String(
              r.completed_at ||
                r.ended_at ||
                r.recorded_at ||
                r.started_at ||
                r.date ||
                r.start_time ||
                ""
            ).slice(0, 10)
          )
          .filter(Boolean)
      );

      let streak = 0;
      for (let i = 0; i < 90; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        if (daysWithWorkout.has(key)) streak++;
        else break;
      }

      setActive?.({ minsToday, streak });
    } catch (e) {
      console.warn("dashboard fetch (workouts today):", e?.message || e);
      setExerciseKcal(0);
      setActive?.({ minsToday: 0, streak: 0 });
    }




    /** ===== 4c) Weekly Summary (server preferred; fallback to client compute) ===== */
    let ws = await safeCall(() => api.getWeeklySummary?.());
    if (!ws) {
      const wks = (await safeCall(() => api.workouts?.(60))) || {};
      const arr =
        wks?.workouts ?? wks?.items ?? (Array.isArray(wks) ? wks : []);
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setUTCDate(cutoff.getUTCDate() - 6); // last 7 days

      const stats = arr.reduce(
        (acc, r) => {
          // use end time if present; else use start (so ongoing today counts)
          const t = toMs(
            r.ended_at ??
              r.completed_at ??
              r.date ??
              r.started_at ??
              r.start_time
          );
          if (
            Number.isFinite(t) &&
            t >= cutoff.getTime() &&
            t <= now.getTime()
          ) {
            acc.workouts += 1;
            acc.active_min += minutesOf(r, { allowOngoing: true });
            acc.calories += caloriesOf(
              r,
              Number(
                weight?.valueKg ?? goals?.targetWeightKg ?? 70
              ) || 70
            );
          }
          return acc;
        },
        { workouts: 0, calories: 0, active_min: 0 }
      );
      ws = stats;
    }

    setWeekly({
      workouts: ws.workouts ?? 0,
      calories: Math.round(ws.calories ?? 0),
      active_min: ws.active_min ?? 0,
    });

    // 5) daily activity (optional)
    const st = await safeCall(() => api.stepsToday?.());
    if (st)
      setSteps({
        value: st.steps ?? st.value ?? steps.value,
        goal: st.goal ?? steps.goal,
      });

    const wt = await safeCall(() => api.waterToday?.());
    if (wt) setWater({ ml: wt.ml ?? wt.value_ml ?? water.ml });

    // 6) recommendations (kept for later if you add the cards back)
    const rw = (await safeCall(() => api.recommendedWorkouts?.())) || [];
    setRecs(
      Array.isArray(rw) && rw.length
        ? rw.slice(0, 6)
        : [
            {
              id: "yoga",
              title: "Morning Yoga",
              durationMin: 30,
              kcal: 180,
              badge: "New",
              imageUrl: null,
            },
            {
              id: "hiit",
              title: "HIIT Cardio",
              durationMin: 20,
              kcal: 280,
              badge: "New",
              imageUrl: null,
            },
          ]
    );
  }, [goals.targetWeightKg, steps.goal, steps.value, water.ml, weight?.valueKg]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  // derived values for goals/progress
  const weightForMacros = Number(goals?.targetWeightKg ?? weight?.valueKg);

  const { p: pGoal, c: cGoal, f: fGoal } = deriveMacroGoals({
    cal: goals.cal,
    macroPct,
    weightKg: weightForMacros,
  });

  const clampPct = (v) => Math.max(0, Math.min(100, Math.round(v)));
  const proteinPct = clampPct((totals.p / pGoal) * 100 || 0);
  const carbsPct = clampPct((totals.c / cGoal) * 100 || 0);
  const fatsPct = clampPct((totals.f / fGoal) * 100 || 0);

  // Keep progress bar using FOOD (to match your UI), but compute Remaining from NET
  const kcalPct = Math.max(
    0,
    Math.min(1, goals.cal ? totals.kcal / goals.cal : 0)
  ); // FOOD progress
  const netKcal = Math.max(0, totals.kcal - exerciseKcal); // NET = Food - Exercise
  const remaining = Math.round(goals.cal - netKcal); // Remaining from NET

  const stepsPct = Math.max(
    0,
    Math.min(1, steps.goal ? steps.value / steps.goal : 0)
  );
  const waterPct = Math.max(
    0,
    Math.min(1, goals.waterMl ? water.ml / goals.waterMl : 0)
  );
  const weightPct = Math.max(
    0,
    Math.min(
      1,
      goals.targetWeightKg && weight.valueKg != null
        ? weight.valueKg / goals.targetWeightKg
        : 0
    )
  );

  const [wkTab, setWkTab] = useState("duration");

  // ── Drawer (not shown in this Figma screen, but helpers kept)
  const DRAWER_WIDTH = Math.min(300, Dimensions.get("window").width * 0.6);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerX, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerX, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => finished && setDrawerOpen(false));
  };

  const go = (path) => {
    closeDrawer();
    setTimeout(() => router.push(path), 180);
  };

  const WORKOUT_IMAGES = {
    yoga: require("../../assets/workouts/yoga.jpeg"),
  };
  const RECOMMENDED_PLANS = {
    yoga: {
      name: "Morning Yoga",
      plan: [
        {
          id: "cat_cow",
          name: "Cat–Cow",
          sets: 2,
          reps: 10,
          weight_kg: null,
          group: "Mobility",
        },
        {
          id: "downward_dog",
          name: "Downward Dog (hold)",
          sets: 2,
          reps: 30,
          weight_kg: null,
          group: "Mobility",
        },
        {
          id: "child_pose",
          name: "Child’s Pose (hold)",
          sets: 2,
          reps: 30,
          weight_kg: null,
          group: "Stretch",
        },
        {
          id: "sun_salutation_a",
          name: "Sun Salutation A",
          sets: 2,
          reps: 10,
          weight_kg: null,
          group: "Flow",
        },
        {
          id: "seated_forward",
          name: "Seated Forward Fold",
          sets: 2,
          reps: 30,
          weight_kg: null,
          group: "Stretch",
        },
      ],
    },
  };
  const DEFAULT_WORKOUT_IMG = require("../../assets/workouts/default.jpg");

  function imgFor(rec) {
    if (rec?.imageUrl) return { uri: rec.imageUrl };
    return WORKOUT_IMAGES[rec?.id] || DEFAULT_WORKOUT_IMG;
  }
  function startRecommended(recOrId) {
    const key = typeof recOrId === "string" ? recOrId : recOrId?.id;
    const cfg = RECOMMENDED_PLANS[key];
    if (!cfg) return;

    router.push({
      pathname: "/workout/review",
      params: {
        name: cfg.name,
        plan: encodeURIComponent(JSON.stringify(cfg.plan)),
      },
    });
  }

  // ---- Last-workout normalizers ----
  function prettyDate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);

    const same = (A, B) =>
      A.getFullYear() === B.getFullYear() &&
      A.getMonth() === B.getMonth() &&
      A.getDate() === B.getDate();

    const timeStr = d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    if (same(d, today)) return `Today • ${timeStr}`;
    if (same(d, yest)) return `Yesterday • ${timeStr}`;
    const dateStr = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${dateStr} • ${timeStr}`;
  }

  function labelFromWorkout(w) {
    const raw =
      typeof w?.date_label === "string" ? w.date_label.trim() : "";
    if (raw) {
      const lower = raw.toLowerCase();
      if (lower === "today" || lower === "yesterday") return cap(lower);
      if (/\d{4}-\d{2}-\d{2}/.test(raw)) {
        const d = new Date(raw);
        return prettyDate(d);
      }
      return raw;
    }
    const iso =
      w?.completed_at ??
      w?.recorded_at ??
      w?.ended_at ??
      w?.started_at ??
      w?.start_time ??
      w?.date;
    if (!iso) return "";
    return prettyDate(new Date(iso));
  }

  function minutesFromWorkout(w) {
    if (w?.duration_min != null)
      return Math.max(0, Math.round(Number(w.duration_min)));
    if (w?.duration != null && Number(w.duration) < 1000)
      return Math.max(0, Math.round(Number(w.duration)));
    const start = Date.parse(w?.started_at ?? w?.start_time ?? w?.start);
    const end = Date.parse(
      w?.completed_at ?? w?.ended_at ?? w?.end_time ?? w?.end
    );
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return Math.max(0, Math.round((end - start) / 60000));
    }
    return 0;
  }

  function caloriesFromWorkout(w) {
    return Math.max(
      0,
      Math.round(Number(w?.calories ?? w?.calories_burned ?? w?.kcal ?? 0))
    );
  }

  function tsOfWorkout(w) {
    const d =
      w?.completed_at ||
      w?.ended_at ||
      w?.end_time ||
      w?.recorded_at ||
      w?.started_at ||
      w?.start_time ||
      w?.date;
    const t = Date.parse(d);
    return Number.isFinite(t) ? t : 0;
  }
  function pickLatestWorkout(arr = []) {
    if (!Array.isArray(arr) || !arr.length) return null;
    return [...arr].sort((a, b) => tsOfWorkout(b) - tsOfWorkout(a))[0] ?? null;
  }
  function normalizeWorkout(w) {
    return {
      title: w?.name ?? w?.title ?? "Workout",
      durationMin: minutesFromWorkout(w),
      calories: caloriesFromWorkout(w),
      dateLabel: labelFromWorkout(w),
      completed: Boolean(
        w?.completed || w?.completed_at || w?.ended_at || w?.end_time
      ),
    };
  }
  async function fetchLastWorkoutDirect() {
    const candidates = [
      {
        table: "workout_sessions",
        orderBy: ["ended_at", "completed_at", "recorded_at", "started_at"],
        select:
          "id,name,calories_burned,calories,started_at,start_time,ended_at,end_time,completed_at,recorded_at,title,date,duration,duration_min",
      },
      {
        table: "workouts",
        orderBy: ["ended_at", "completed_at", "recorded_at", "started_at"],
        select:
          "id,name,calories_burned,calories,started_at,start_time,ended_at,end_time,completed_at,recorded_at,title,date,duration,duration_min",
      },
    ];
    for (const c of candidates) {
      try {
        for (const col of c.orderBy) {
          const tryOrder = await supabase
            .from(c.table)
            .select(c.select)
            .order(col, { ascending: false })
            .limit(1);
          if (!tryOrder.error && tryOrder.data?.length) {
            const batch = await supabase
              .from(c.table)
              .select(c.select)
              .order(col, { ascending: false })
              .limit(10);
            if (!batch.error && batch.data?.length)
              return pickLatestWorkout(batch.data);
            break;
          }
        }
      } catch {}
    }
    return null;
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingHorizontal: PADX }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Dashboard</Text>
            <Text style={s.headerSubtitle}>
              Track your fitness journey
            </Text>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity style={s.headerIconBtn}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerIconBtn}
              onPress={() => router.push("/settings")}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* EDIT GOAL TEXT (small, right aligned) */}
        <View style={s.editRow}>
          <Pressable
            onPress={() => router.push("/settings/edit-goals")}
            android_ripple={{ color: "#e5e7eb", borderless: false }}
          >
            <Text style={s.editBtnTxt}>Edit Goal</Text>
          </Pressable>
        </View>

        {/* TOP STATS: CALORIES + STEPS */}
        <View style={s.topStatsRow}>
          <Card style={[s.statCard, shadow]}>
            <View style={s.statHeader}>
              <Text style={s.statLabel}>Calories</Text>
              <View
                style={[
                  s.statIconWrap,
                  { backgroundColor: colors.warningSoft },
                ]}
              >
                <Ionicons
                  name="flame-outline"
                  size={18}
                  color={colors.warning}
                />
              </View>
            </View>
            <View style={s.statValueRow}>
              <Text style={s.statNumber}>
                {nf.format(Math.max(0, Math.round(exerciseKcal)))}
              </Text>
              <Text style={s.statSuffix}>kcal</Text>
            </View>
            <Text style={s.statHint}>kCal burnt</Text>
          </Card>

          <Card style={[s.statCard, shadow]}>
            <View style={s.statHeader}>
              <Text style={s.statLabel}>Steps</Text>
              <View
                style={[
                  s.statIconWrap,
                  { backgroundColor: colors.infoSoft },
                ]}
              >
                <Ionicons
                  name="walk-outline"
                  size={18}
                  color={colors.info}
                />
              </View>
            </View>
            <View style={s.statValueRow}>
              <Text style={s.statNumber}>
                {formatK(Math.max(0, Math.round(steps.value)))}
              </Text>
              <Text style={s.statSuffix}>k</Text>
            </View>
            <Text style={s.statHint}>steps today</Text>
          </Card>
        </View>

        {/* CALENDAR CARD (Nov 04–10, W 07 highlighted like Figma) */}
        <Card style={[s.calendarCard, shadow]}>
          <View style={s.rowBetween}>
            <Text style={s.calendarTitle}>November 2024</Text>
            <View style={s.calendarNav}>
              <Ionicons
                name="chevron-back-outline"
                size={18}
                color={colors.textMuted}
              />
              <Ionicons
                name="chevron-forward-outline"
                size={18}
                color={colors.textMuted}
              />
            </View>
          </View>

          <View style={s.calendarWeekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
              <Text key={`${d}-${idx}`} style={s.calendarWeekLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={s.calendarDaysRow}>
            {[4, 5, 6, 7, 8, 9, 10].map((d) => {
              const isActive = d === 7;
              return (
                <View
                  key={d}
                  style={[s.calendarDay, isActive && s.calendarDayActive]}
                >
                  <Text
                    style={[
                      s.calendarDayText,
                      isActive && s.calendarDayTextActive,
                    ]}
                  >
                    {String(d).padStart(2, "0")}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* NUTRITION GOALS: BIG RING + MACRO BREAKDOWN */}
        <Card style={[s.nutritionCard, shadow]}>
          <Text style={s.sectionTitle}>Nutrition Goals</Text>
          <View style={s.nutritionTopRow}>
            <CalorieRing
              pct={kcalPct}
              total={Math.round(totals.kcal)}
              goal={Math.round(goals.cal)}
            />
          </View>

          <View style={s.macroList}>
            <MacroRow
              label="Protein"
              color="#FF2D92"
              consumed={Math.round(totals.p)}
              goal={Math.round(pGoal)}
              pct={proteinPct}
              unit="g"
            />
            <MacroRow
              label="Fats"
              color="#2563EB"
              consumed={Math.round(totals.f)}
              goal={Math.round(fGoal)}
              pct={fatsPct}
              unit="g"
            />
            <MacroRow
              label="Carbs"
              color="#F59E0B"
              consumed={Math.round(totals.c)}
              goal={Math.round(cGoal)}
              pct={carbsPct}
              unit="g"
            />
          </View>
        </Card>

        {/* DAILY ACTIVITY – Steps / Water / Weight (like old design) */}
        <Card style={[s.activityCard, shadow]}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>Daily Activity</Text>
          </View>

          <View style={s.activityRow}>
            <ActivityRing
              pct={stepsPct}
              color={colors.info}
              icon="footsteps-outline"
              value={nf.format(steps.value)}
              label="Steps"
            />

            <ActivityRing
              pct={waterPct}
              color={colors.success}
              icon="water-outline"
              value={`${nf.format(water.ml)}ml`}
              label="Water"
            />

            <ActivityRing
              pct={weightPct}
              color={colors.purple}
              icon="scale-outline"
              value={
                weight.valueKg != null
                  ? `${weight.valueKg.toFixed(1)}kg`
                  : "— kg"
              }
              label="Weight"
            />
          </View>
        </Card>

        {/* QUICK ACTIONS CARD – 2 rows, 8 icons like Figma */}
        <Card style={[s.quickCard, shadow]}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={s.quickGridRow}>
            <QuickIconTile
              label="Log Food"
              icon="nutrition-outline"
              bg="#FFECEF"
              iconColor="#FF2D55"
              onPress={() => router.push("/(models)/add-food")}
            />
            <QuickIconTile
              label="Add Water"
              icon="water-outline"
              bg="#E7F3FF"
              iconColor={colors.info}
              onPress={() => router.push("/(models)/add-water")}
            />
            <QuickIconTile
              label="Workout"
              icon="barbell-outline"
              bg="#F3E8FF"
              iconColor={colors.purple}
              onPress={() => router.push("/workout")}
            />
            <QuickIconTile
              label="Weight"
              icon="barbell-outline"
              bg="#EAF0FF"
              iconColor="#6366F1"
              onPress={() => router.push("/(models)/add-weight")}
            />
          </View>
        </Card>

        {/* WEEKLY PROGRESS GRADIENT CARD */}
        <LinearGradient
          colors={["#FFE5F4", "#FFF4DF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.weeklyCard, shadow]}
        >
          <View style={s.rowBetween}>
            <View>
              <Text style={s.sectionTitle}>Weekly Progress</Text>
              <Text style={s.weeklySubtitle}>Keep it up!</Text>
            </View>
            <View style={s.weekChip}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.purple}
              />
              <Text style={s.weekChipText}>Week</Text>
            </View>
          </View>
          <View style={s.weeklyStatsRow}>
            <View style={s.weeklyStatItem}>
              <Text style={s.weeklyStatValue}>{weekly.workouts}</Text>
              <Text style={s.weeklyStatLabel}>Workouts</Text>
            </View>
            <View style={s.weeklyStatItem}>
              <Text style={s.weeklyStatValue}>
                {formatK(weekly.calories)}
              </Text>
              <Text style={s.weeklyStatLabel}>Calories</Text>
            </View>
            <View style={s.weeklyStatItem}>
              <Text style={s.weeklyStatValue}>
                {weekly.active_min}
              </Text>
              <Text style={s.weeklyStatLabel}>Active</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ height: spacing(4) }} />
      </ScrollView>

      {/* ==== MACRO POP-UP (kept, if you still want it) ==== */}
      <Modal
        visible={showMacros}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMacros(false)}
      >
        <Pressable
          style={s.modalBackdrop}
          onPress={() => setShowMacros(false)}
        >
          <Pressable style={[s.macroSheet, shadow]} onPress={() => {}}>
            <View style={s.macroHeader}>
              <Text style={s.sheetTitle}>Your Macros</Text>
              <TouchableOpacity onPress={() => setShowMacros(false)}>
                <Text style={s.closeLink}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={s.macroCards}>
              <MacroCard
                title="Calories"
                color={colors.success}
                icon="flame-outline"
                value={Math.round(totals.kcal)}
                goal={Math.round(goals.cal)}
                unit=""
              />
              <MacroCard
                title="Protein"
                color={colors.info}
                icon="restaurant-outline"
                value={Math.round(totals.p)}
                goal={Math.round(pGoal)}
                unit="g"
              />
              <MacroCard
                title="Carbs"
                color={colors.orange}
                icon="leaf-outline"
                value={Math.round(totals.c)}
                goal={Math.round(cGoal)}
                unit="g"
              />
              <MacroCard
                title="Fats"
                color={colors.purple}
                icon="water-outline"
                value={Math.round(totals.f)}
                goal={Math.round(fGoal)}
                unit="g"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- UI helpers ---------- */
function Row({ icon, iconColor, label, value }) {
  return (
    <View style={s.inline}>
      <View style={s.roundIcon}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ marginLeft: 10 }}>
        <Text style={s.muted}>{label}</Text>
        <Text style={s.big}>{value}</Text>
      </View>
    </View>
  );
}

function Progress({ pct, fill = colors.primary, track = colors.ringTrack }) {
  const width = `${Math.max(0, Math.min(1, pct)) * 100}%`;
  return (
    <View style={[s.progress, { backgroundColor: track }]}>
      <View style={[s.progressBar, { width, backgroundColor: fill }]} />
    </View>
  );
}

function QuickPill({ label, icon, bg, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.qpill, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={s.qpillTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

// NEW quick-action tile matching Figma
function QuickIconTile({ label, icon, bg, onPress, iconColor }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.quickIconTile, { backgroundColor: bg }]}
      activeOpacity={0.9}
    >
      <View style={s.quickIconCircle}>
        <Ionicons
          name={icon}
          size={20}
          color={iconColor || colors.primary}
        />
      </View>
      <Text style={s.quickIconLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Insight({ label, value }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={s.insightVal}>{value}</Text>
      <Text style={s.insightLbl}>{label}</Text>
    </View>
  );
}

// BIG calories ring like Figma
function CalorieRing({ pct, total, goal }) {
  const size = 150;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const dash = c * clamped;
  const gap = c - dash;

  return (
    <View style={s.calorieRingWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.ringTrack}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#FF3B8D"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash},${gap}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={s.calorieRingCenter}>
        <Text style={s.calorieRingValue}>{nf.format(total)}</Text>
        <Text style={s.calorieRingUnit}>kcal</Text>
        <Text style={s.calorieRingGoal}>
          of {nf.format(goal)} kcal
        </Text>
      </View>
    </View>
  );
}

// Macro row like Figma (dot + text + percentage)
function MacroRow({ label, color, consumed, goal, pct, unit = "g" }) {
  return (
    <View style={s.macroRow}>
      <View style={s.macroRowLeft}>
        <View style={[s.macroDot, { backgroundColor: color }]} />
        <View>
          <Text style={s.macroLabel}>{label}</Text>
          <Text style={s.macroSub}>
            {nf.format(consumed)}
            {unit} of {nf.format(goal)}
            {unit}
          </Text>
        </View>
      </View>
      <Text style={s.macroPct}>{`${pct}%`}</Text>
    </View>
  );
}

// small circular ring
function ActivityRing({
  pct = 0.6,
  color = colors.primary,
  icon = "help",
  value,
  label,
  size = 80,
  stroke = 8,
  showTexts = true,
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const dash = c * clamped;
  const gap = c - dash;
  return (
    <View style={s.activityItem}>
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.ringTrack}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash},${gap}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={s.activityIconWrap}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
      </View>
      {showTexts && (
        <>
          <Text style={s.activityValue}>{value}</Text>
          <Text style={s.activityLabel}>{label}</Text>
        </>
      )}
    </View>
  );
}

// tile for the macro dialog
function MacroCard({ title, color, icon, value, goal, unit }) {
  const pct = Math.max(0, Math.min(1, goal ? value / goal : 0));
  return (
    <Card style={s.macroCard}>
      <ActivityRing
        pct={pct}
        color={color}
        icon={icon}
        size={60}
        stroke={8}
        showTexts={false}
      />
      <View style={{ marginTop: 10 }}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.muted}>
          {nf.format(value)}
          {unit ? unit : ""} / {nf.format(goal)}
          {unit ? unit : title === "Calories" ? "" : ""}
        </Text>
      </View>
    </Card>
  );
}

function DrawerItem({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.drawerItem}>
      <Ionicons size={20} color={colors.text} />
      <Text style={s.drawerItemTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

function cap(x) {
  return x.charAt(0).toUpperCase() + x.slice(1);
}

/* -------------------- styles -------------------- */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { paddingBottom: spacing(3) },

  /* HEADER */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing(1),
    marginBottom: spacing(1.5),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  editRow: {
    alignItems: "flex-end",
    marginBottom: spacing(1),
  },

  // legacy topBar/search kept (not used here)
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 0 },

  row2: { flexDirection: "row", gap: spacing(1), marginTop: spacing(4) },
  sheetTitle: { flex: 2, padding: 5, borderRadius: 16, fontSize: 15 },

  // tile styles (kept for future sections)
  tile: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 0,
    borderColor: "#E7EEF6",
  },
  tileShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tileBg: { ...StyleSheet.absoluteFillObject },
  tileInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  tileContent: { padding: 14 },
  tileHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tileOver: {
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 1,
    fontSize: 12,
    marginTop: 6,
  },
  tileTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    marginTop: 6,
    includeFontPadding: false,
  },
  tileSub: {
    color: colors.textMuted,
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
  },
  tileBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileBtnTxt: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  tileLink: {
    color: colors.home.nutritionAccent,
    fontWeight: "800",
    fontSize: 15,
    marginTop: 2,
  },

  block: { borderRadius: 10 },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.text, fontWeight: "800" },
  link: { color: colors.primary, fontWeight: "700" },

  tabsRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  tabBtn: { paddingVertical: 6 },
  tabTxt: { color: colors.textMuted, fontWeight: "700" },
  tabActive: { color: colors.primary },

  inline: { flexDirection: "row", alignItems: "center" },
  roundIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: colors.textMuted },
  big: { color: colors.text, fontSize: 18, fontWeight: "800" },
  title: { color: colors.text, fontSize: 14, fontWeight: "400" },

  badgeSuccess: {
    color: colors.badgeSuccessText,
    backgroundColor: colors.badgeSuccessBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: "700",
  },

  quickRow: {
    flexDirection: "row",
    gap: spacing(1),
    marginTop: spacing(1),
    marginBottom: spacing(1),
  },
  qpill: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  qpillTxt: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },

  /* NEW: TOP STATS */
  topStatsRow: {
    flexDirection: "row",
    gap: spacing(1.5),
    marginTop: spacing(0.5),
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.card,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 10,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
  },
  statSuffix: {
    marginLeft: 4,
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 2,
  },
  statHint: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 12,
  },

  /* CALENDAR CARD */
  calendarCard: {
    marginTop: spacing(3),
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.card,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  calendarWeekLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  calendarDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayActive: {
    backgroundColor: "#7C3AED",
  },
  calendarDayText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  calendarDayTextActive: {
    color: "#FFFFFF",
  },

  /* NUTRITION CARD */
  nutritionCard: {
    marginTop: spacing(3),
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.card,
  },
  nutritionTopRow: {
    alignItems: "center",
    marginTop: spacing(1.5),
    marginBottom: spacing(1),
  },
  macroList: {
    marginTop: spacing(1),
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  macroRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  macroSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  macroPct: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },

  /* CALORIE RING */
  calorieRingWrap: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  calorieRingCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  calorieRingValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  calorieRingUnit: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  calorieRingGoal: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Daily Activity / Activity rings */
  activityCard: {
    marginTop: spacing(3),
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
  },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing(2),
    paddingHorizontal: 2,
  },
  activityItem: { alignItems: "center", width: "32%" },
  activityIconWrap: { position: "absolute" },
  activityValue: {
    color: colors.text,
    fontWeight: "800",
    marginTop: 8,
    fontSize: 18,
  },
  activityLabel: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },

  /* Recs (not used in new layout but kept) */
  recCard: {
    width: 180,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  recImageWrap: { width: "100%", height: 104, backgroundColor: colors.surface },
  recImage: { width: "100%", height: "100%" },
  newBadge: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: colors.newBadgeBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeTxt: {
    color: colors.newBadgeText,
    fontSize: 10,
    fontWeight: "700",
  },
  recTitle: {
    color: colors.text,
    fontWeight: "800",
    marginTop: 8,
    marginHorizontal: 10,
  },
  recMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  recMetaTxt: { color: colors.textMuted, marginRight: 10 },

  insightsRow: {
    flexDirection: "row",
    marginTop: 12,
    alignItems: "center",
  },

  progress: {
    height: 6,
    backgroundColor: colors.ringTrack,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },

  /* Macro dialog */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: spacing(1),
  },
  macroSheet: {
    backgroundColor: colors.bg,
    padding: spacing(2),
    maxWidth: 640,
    alignSelf: "center",
    width: "100%",
  },
  macroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(0.5),
    paddingHorizontal: 4,
  },
  closeLink: { color: colors.success, fontWeight: "700" },
  macroCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1),
  },
  macroCard: { width: "48%", padding: 14, borderRadius: 10 },

  insightVal: { color: colors.text, fontWeight: "800", fontSize: 16 },
  insightLbl: { color: colors.textMuted, marginTop: 2 },

  /* Drawer */
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    flexDirection: "row",
  },
  drawer: {
    backgroundColor: colors.bg,
    paddingTop: spacing(2),
    paddingHorizontal: spacing(1),
    paddingBottom: spacing(2),
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1.5),
    paddingRight: spacing(0.5),
  },
  drawerTitle: { color: colors.text, fontWeight: "800", fontSize: 18 },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  drawerItemTxt: { marginLeft: 10, color: colors.text },

  topActions: { alignItems: "flex-end" },

  editBtnTxt: {
    paddingTop: 0,
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },

  tileSubSm: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },

  /* Quick actions grid like Figma */
  quickCard: {
    marginTop: spacing(3),
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
  },
  quickGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  quickIconTile: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 6,
  },
  quickIconLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },

  /* Weekly progress gradient card */
  weeklyCard: {
    marginTop: spacing(3),
    borderRadius: 18,
    padding: 16,
  },
  weeklySubtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  weekChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  weekChipText: {
    marginLeft: 6,
    fontSize: 12,
    color: colors.purple,
    fontWeight: "600",
  },
  weeklyStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  weeklyStatItem: { alignItems: "center", flex: 1 },
  weeklyStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  weeklyStatLabel: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
});
