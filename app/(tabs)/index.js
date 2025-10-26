// app/(tabs)/index.js
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, Modal, Pressable,
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

// helper to safely call optional API methods
async function safeCall(fn) {
  try { return await fn?.(); } catch (e) { console.warn("dashboard fetch:", e?.message || e); return undefined; }
}

export default function Dashboard() {
  const router = useRouter();
  const PADX = spacing(1.25);

  // totals from meals (FOOD)
  const [totals, setTotals] = useState({ kcal: 0, p: 0, c: 0, f: 0 });

  // goals
  const [goals, setGoals] = useState({
    cal: 2200, waterMl: 2500, activeMin: 60, targetWeightKg: 72,
  });
  const [macroPct, setMacroPct] = useState({ c: 40, p: 30, f: 30 });

  // weight & workout
  const [weight, setWeight] = useState({ valueKg: null, deltaKg: 0 });
  const [workout, setWorkout] = useState({ title: "—", durationMin: 0, calories: 0, dateLabel: "", completed: true });

  // 🔹 Exercise kcal (today) — used to compute Remaining from Net = Food - Exercise
  const [exerciseKcal, setExerciseKcal] = useState(0);

  // daily activity
  const [steps, setSteps] = useState({ value: 8234, goal: 10000 });
  const [water, setWater] = useState({ ml: 1800 });

  // recommendations
  const [recs, setRecs] = useState([]);

  // macro dialog
  const [showMacros, setShowMacros] = useState(false);

  const loadDashboard = useCallback(async () => {
    // 1) meals/macros (FOOD)
    const mealsRes = (await safeCall(() => api.mealsToday?.())) || {};
    const meals = mealsRes?.meals ?? [];
    const items = meals.flatMap((m) => m.meal_items ?? []);
    const t = items.reduce((acc, it) => {
      acc.kcal += Number(it.calories ?? 0);
      acc.p += Number(it.protein_g ?? 0);
      acc.c += Number(it.carbs_g ?? 0);
      acc.f += Number(it.fat_g ?? 0);
      return acc;
    }, { kcal: 0, p: 0, c: 0, f: 0 });
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
      setMacroPct({ c: g.carbs_pct ?? 40, p: g.protein_pct ?? 30, f: g.fat_pct ?? 30 });
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
        deltaKg: (Number.isFinite(current) && Number.isFinite(tgt)) ? current - tgt : 0,
      });
    }

    // 4) last workout (for the "Last Workout" card)
    let lw = await safeCall(() => api.lastWorkout?.());
    lw = lw?.workout ?? lw;   // ← unwrap the server response

    // dashboard payload may carry last workout
    if (!lw) {
      const d = await safeCall(() => api.dashboard?.());
      lw = d?.last_workout ?? d?.lastWorkout ?? lw;
    }

    // fallback: list → pick newest by timestamps
    if (!lw) {
      const list = (await safeCall(() => api.workouts?.(25))) || {};
      const arr = list?.workouts ?? list?.items ?? (Array.isArray(list) ? list : []);
      lw = pickLatestWorkout(arr);
    }

    // final fallback: query Supabase directly (older projects / missing actions)
    if (!lw) lw = await fetchLastWorkoutDirect();

    if (lw) {
      setWorkout(normalizeWorkout(lw));
    } else {
      setWorkout({ title: "—", durationMin: 0, calories: 0, dateLabel: "", completed: false });
    }

    // 4b) 🔹 workouts today → sum kcal burned (EXERCISE)
    try {
      const wks = (await safeCall(() => api.workouts?.(20))) || {};
      const arr = wks?.workouts ?? wks?.items ?? (Array.isArray(wks) ? wks : []);
      const todayISO = new Date().toISOString().slice(0, 10);

      const kcal = arr
        .filter((w) => {
          const d =
            w.date_label ?? w.date ?? w.completed_at ?? w.recorded_at ?? w.started_at ?? "";
          if (typeof d === "string") {
            if (d.toLowerCase?.() === "today") return true;
            return d.slice(0, 10) === todayISO;
          }
          return false;
        })
        .reduce((sum, w) => sum + Number(w.calories ?? w.calories_burned ?? 0), 0);

      setExerciseKcal(kcal);
    } catch (e) {
      console.warn("dashboard fetch (workouts today):", e?.message || e);
      setExerciseKcal(0);
    }

    // 5) daily activity (optional)
    const st = await safeCall(() => api.stepsToday?.());
    if (st) setSteps({ value: st.steps ?? st.value ?? steps.value, goal: st.goal ?? steps.goal });

    const wt = await safeCall(() => api.waterToday?.());
    if (wt) setWater({ ml: wt.ml ?? wt.value_ml ?? water.ml });

    // 6) recommendations
    const rw = (await safeCall(() => api.recommendedWorkouts?.())) || [];
    setRecs(
      Array.isArray(rw) && rw.length
        ? rw.slice(0, 6)
        : [
            { id: "yoga", title: "Morning Yoga", durationMin: 30, kcal: 180, badge: "New", imageUrl: null },
            { id: "hiit", title: "HIIT Cardio", durationMin: 20, kcal: 280, badge: "New", imageUrl: null },
          ]
    );
  }, [goals.targetWeightKg, steps.goal, steps.value, water.ml]);

  useFocusEffect(useCallback(() => { loadDashboard(); }, [loadDashboard]));

  // derived values for goals/progress
  const pGoal = (goals.cal * (macroPct.p / 100)) / 4;
  const cGoal = (goals.cal * (macroPct.c / 100)) / 4;
  const fGoal = (goals.cal * (macroPct.f / 100)) / 9;

  const clampPct = (v) => Math.max(0, Math.min(100, Math.round(v)));
  const proteinPct = clampPct((totals.p / pGoal) * 100 || 0);
  const carbsPct   = clampPct((totals.c / cGoal) * 100 || 0);
  const fatsPct    = clampPct((totals.f / fGoal) * 100 || 0);

  // Keep progress bar using FOOD (to match your UI), but compute Remaining from NET
  const kcalPct    = Math.max(0, Math.min(1, goals.cal ? totals.kcal / goals.cal : 0)); // FOOD progress
  const netKcal    = Math.max(0, totals.kcal - exerciseKcal);                            // NET = Food - Exercise
  const remaining  = Math.round(goals.cal - netKcal);                                    // Remaining from NET

  const stepsPct  = Math.max(0, Math.min(1, steps.goal ? steps.value / steps.goal : 0));
  const waterPct  = Math.max(0, Math.min(1, goals.waterMl ? water.ml / goals.waterMl : 0));
  const weightPct = Math.max(0, Math.min(1, goals.targetWeightKg && weight.valueKg != null ? (weight.valueKg / goals.targetWeightKg) : 0));

  const [wkTab, setWkTab] = useState("duration");

  // ── Drawer
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
    // hiit: require("../../assets/workouts/hiit.jpg"),
    // strength: require("../../assets/workouts/strength.jpg"),
  };
  const DEFAULT_WORKOUT_IMG = require("../../assets/workouts/default.jpg");

  function imgFor(rec) {
    // Prefer remote if API gives one; otherwise map by id, else default
    if (rec?.imageUrl) return { uri: rec.imageUrl };
    return WORKOUT_IMAGES[rec?.id] || DEFAULT_WORKOUT_IMG;
  }

  // ---- Last-workout normalizers ----
  function getDateISOonly(d) { return new Date(d).toISOString().slice(0, 10); }

  function prettyDate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    const today = new Date();
    const yest  = new Date(); yest.setDate(today.getDate() - 1);

    const same = (A, B) =>
      A.getFullYear() === B.getFullYear() &&
      A.getMonth() === B.getMonth() &&
      A.getDate() === B.getDate();

    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    if (same(d, today)) return `Today • ${timeStr}`;
    if (same(d, yest))  return `Yesterday • ${timeStr}`;
    // e.g. "Sun, Oct 27 • 3:20 PM"
    const dateStr = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return `${dateStr} • ${timeStr}`;
  }

function labelFromWorkout(w) {
  // If server sent a label already, prettify it if it looks like an ISO datetime.
  const raw = typeof w?.date_label === "string" ? w.date_label.trim() : "";
  if (raw) {
    const lower = raw.toLowerCase();
    if (lower === "today" || lower === "yesterday") return cap(lower);

    // If it contains a YYYY-MM-DD, treat as ISO and format it.
    if (/\d{4}-\d{2}-\d{2}/.test(raw)) {
      const d = new Date(raw);
      return prettyDate(d);
    }
    return raw; // already a friendly label
  }

  // Otherwise derive from timestamps we have.
  const iso = w?.completed_at ?? w?.recorded_at ?? w?.ended_at ?? w?.started_at ?? w?.start_time ?? w?.date;
  if (!iso) return "";
  return prettyDate(new Date(iso));
}

  function minutesFromWorkout(w) {
    if (w?.duration_min != null) return Math.max(0, Math.round(Number(w.duration_min)));
    if (w?.duration != null && Number(w.duration) < 1000) return Math.max(0, Math.round(Number(w.duration)));
    const start = Date.parse(w?.started_at ?? w?.start_time ?? w?.start);
    const end   = Date.parse(w?.completed_at ?? w?.ended_at ?? w?.end_time ?? w?.end);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return Math.max(0, Math.round((end - start) / 60000));
    }
    return 0;
  }

  function caloriesFromWorkout(w) {
    return Math.max(0, Math.round(Number(w?.calories ?? w?.calories_burned ?? w?.kcal ?? 0)));
  }

  // helpers to pick the latest workout reliably
  function tsOfWorkout(w) {
    const d = w?.completed_at || w?.ended_at || w?.end_time ||
              w?.recorded_at || w?.started_at || w?.start_time || w?.date;
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
      completed: Boolean(w?.completed || w?.completed_at || w?.ended_at || w?.end_time),
    };
  }
  async function fetchLastWorkoutDirect() {
    const candidates = [
      {
        table: "workout_sessions",
        orderBy: ["ended_at", "completed_at", "recorded_at", "started_at"],
        select: "id,name,calories_burned,calories,started_at,start_time,ended_at,end_time,completed_at,recorded_at,title,date,duration,duration_min",
      },
      {
        table: "workouts",
        orderBy: ["ended_at", "completed_at", "recorded_at", "started_at"],
        select: "id,name,calories_burned,calories,started_at,start_time,ended_at,end_time,completed_at,recorded_at,title,date,duration,duration_min",
      },
    ];
    for (const c of candidates) {
      try {
        for (const col of c.orderBy) {
          const tryOrder = await supabase.from(c.table).select(c.select).order(col, { ascending:false }).limit(1);
          if (!tryOrder.error && tryOrder.data?.length) {
            const batch = await supabase.from(c.table).select(c.select).order(col, { ascending:false }).limit(10);
            if (!batch.error && batch.data?.length) return pickLatestWorkout(batch.data);
            break;
          }
        }
      } catch {}
    }
    return null;
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={[s.container, { paddingHorizontal: PADX }]} showsVerticalScrollIndicator={false}>
        {/* TOP BAR */}
        <View style={[s.topBar, { paddingTop: spacing(2.5) }]}>
          <TouchableOpacity onPress={openDrawer} style={s.iconBtn}>
            <Ionicons name="menu-outline" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={[s.searchWrap, shadow]}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              placeholder="Search workouts & meals…"
              placeholderTextColor={colors.textMuted}
              style={s.searchInput}
              returnKeyType="search"
            />
          </View>

          <TouchableOpacity onPress={() => router.push("/settings")} style={s.iconBtn}>
            <Ionicons name="person-circle-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Compact "edit goals" pill */}
        <View style={s.topActions}>
          <Pressable
            onPress={() => router.push("/settings/edit-goals")}
            android_ripple={{ color: "#e5e7eb", borderless: false }}
          >
            <Text style={s.editBtnTxt}>Edit Goal</Text>
          </Pressable>
        </View>

        {/* ROW: Workout + Nutrition */}
        <View style={s.row2}>
          <Card style={[s.tile, s.tileShadow]}>
            <LinearGradient
              colors={colors.home.activeGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.tileBg}
            />
            <View pointerEvents="none" style={s.tileInnerBorder} />
            <View style={s.tileContent}>
              <View style={s.tileHead}>
                <View style={[s.tileIcon, { backgroundColor: "rgba(16,185,129,0.15)" }]} >
                  <Ionicons name="flame-outline" size={16} color={colors.home.activeAccent} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
              <Text style={s.tileTitle}>Active</Text>
              <Text style={s.tileSub}>12 day streak 🔥</Text>
              <TouchableOpacity onPress={() => router.push("/workout/select-routine")} style={s.tileBtn}>
                <Text style={s.tileBtnTxt}>View Details</Text>
              </TouchableOpacity>
            </View>
          </Card>

          <Card style={[s.tile, s.tileShadow]}>
            <LinearGradient
              colors={colors.home.nutritionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.tileBg}
            />
            <View pointerEvents="none" style={s.tileInnerBorder} />
            <View style={s.tileContent}>
              <View style={s.tileHead}>
                <View style={[s.tileIcon, { backgroundColor: "rgba(37,99,235,0.12)" }]} >
                  <Ionicons name="nutrition-outline" size={16} color={colors.home.nutritionAccent} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
              <Text style={s.tileOver}>NUTRITION</Text>
              <TouchableOpacity onPress={() => setShowMacros(true)}>
                <Text style={[s.tileLink, { color: colors.home.nutritionAccent }]}>Track Macros</Text>
              </TouchableOpacity>

              {/* FOOD line (unchanged) */}
              <Text style={s.tileSub}>
                {nf.format(Math.round(totals.kcal))} of {nf.format(goals.cal)} kcal
              </Text>

              {/* COMPACT: Exercise + Remaining on one small line */}
              <Text style={s.tileSubSm} numberOfLines={1}>
                Ex: <Text style={{ color: colors.info }}>
                  -{nf.format(Math.round(exerciseKcal))}
                </Text>
                {"  •  "}
                <Text style={{ color: remaining < 0 ? colors.danger : colors.success }}>
                  {remaining < 0
                    ? `Over: ${nf.format(Math.abs(remaining))}`
                    : `Rem: ${nf.format(remaining)}`}
                </Text> kcal
              </Text>

              <Progress pct={kcalPct} fill={colors.home.nutritionBar} track={colors.home.nutritionTrack} />
            </View>
          </Card>
        </View>

        {/* DAILY ACTIVITY */}
        <Card style={[s.block, { padding: 16, marginTop: spacing(5) }]}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>Daily Activity</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>

          <View style={s.activityRow}>
            <ActivityRing pct={stepsPct} color={colors.info} icon="footsteps-outline" value={nf.format(steps.value)} label="Steps" />
            <ActivityRing pct={waterPct} color={colors.success} icon="water-outline" value={`${nf.format(water.ml)}ml`} label="Water" />
            <ActivityRing
              pct={weightPct}
              color={colors.purple}
              icon="scale-outline"
              value={weight.valueKg != null ? `${weight.valueKg.toFixed(1)}kg` : "— kg"}
              label="Weight"
            />
          </View>
        </Card>

        {/* RECOMMENDED WORKOUTS */}
        <View style={[s.rowBetween, { marginTop: spacing(3), paddingBottom: spacing(1.5) }]}>
          <Text style={s.sectionTitle}>Recommended Workouts</Text>
          <TouchableOpacity><Text style={s.link}>View All ›</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: spacing(0.5) }}>
          {recs.map((r) => (
            <View key={r.id} style={[s.recCard, shadow]}>
              <View style={s.recImageWrap}>
                <Image source={imgFor(r)} style={s.recImage} />
                {r.badge ? <View style={s.newBadge}><Text style={s.newBadgeTxt}>{r.badge}</Text></View> : null}
              </View>
              <Text style={s.recTitle} numberOfLines={1}>{r.title}</Text>
              <View style={s.recMeta}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={s.recMetaTxt}>{r.durationMin} min</Text>
                <Ionicons name="flame-outline" size={14} color={colors.textMuted} />
                <Text style={s.recMetaTxt}>{r.kcal} kcal</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* QUICK ACTIONS */}
        <View style={[s.rowBetween, { marginTop: spacing(4) }]}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={s.quickRow}>
          <QuickPill label="Log Food"  icon="nutrition-outline"  bg={colors.warningSoft} onPress={() => router.push("/(models)/add-food")} />
          <QuickPill label="Add Water" icon="water-outline"      bg={colors.warningSoft} onPress={() => router.push("/(models)/add-water")} />
          <QuickPill label="Workout"   icon="barbell-outline"     bg={colors.warningSoft} onPress={() => router.push("/workout/select-routine")} />
          <QuickPill label="Sleep"     icon="moon-outline"        bg={colors.warningSoft} onPress={() => {}} />
        </View>

        {/* LAST WORKOUT */}
        <Card style={[s.block, { padding: 14, marginTop: spacing(5) }]}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>Last Workout</Text>
            <Text style={s.badgeSuccess}>{workout.completed ? "Completed" : "—"}</Text>
          </View>

          <View style={s.tabsRow}>
            {["duration", "calories", "date"].map((k) => (
              <TouchableOpacity key={k} onPress={() => setWkTab(k)} style={s.tabBtn}>
                <Text style={[s.tabTxt, wkTab === k && s.tabActive]}>{cap(k)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Card style={{ backgroundColor: colors.surface, padding: 14, borderRadius: 16 }}>
            {wkTab === "duration" && (<Row icon="time-outline" iconColor={colors.primary} label="Workout Duration" value={`${workout.durationMin} min`} />)}
            {wkTab === "calories" && (<Row icon="flame-outline" iconColor={colors.orange} label="Calories" value={`${nf.format(workout.calories)} kcal`} />)}
            {wkTab === "date" && (<Row icon="calendar-outline" iconColor={colors.info} label="Date" value={workout.dateLabel || "—"} />)}
          </Card>

          <Text style={[s.muted, { marginTop: 8 }]}>{workout.title}</Text>
        </Card>

        {/* PROGRESS INSIGHTS */}
        <View style={[s.rowBetween, { marginTop: spacing(5), paddingBottom: spacing(1.5) }]}>
          <Text style={s.sectionTitle}>Progress Insights</Text>
          <TouchableOpacity><Text style={s.link}>View All ›</Text></TouchableOpacity>
        </View>
        <Card style={[s.block, { padding: 14, backgroundColor: colors.cardAccent }]}>
          <View style={s.inline}>
            <View style={[s.roundIcon, { backgroundColor: colors.purpleSoft }]}><Ionicons name="trending-up-outline" size={18} color={colors.purple} /></View>
            <View style={{ marginLeft: 10 }}>
              <Text style={s.title}>Weekly Summary</Text>
              <Text style={s.muted}>You're on fire this week! 🎉</Text>
            </View>
          </View>
          <View style={s.insightsRow}>
            <Insight label="Workouts" value="5" />
            <Insight label="Calories" value="3.2k" />
            <Insight label="Active Min" value="240" />
          </View>
        </Card>

        <View style={{ height: spacing(3) }} />
      </ScrollView>

      {/* ==== MACRO POP-UP (centered 2×2 grid) ==== */}
      <Modal visible={showMacros} transparent animationType="fade" onRequestClose={() => setShowMacros(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setShowMacros(false)}>
          <Pressable style={[s.macroSheet, shadow]} onPress={() => {}}>
            <View style={s.macroHeader}>
              <Text style={s.sheetTitle}>Your Macros</Text>
              <TouchableOpacity onPress={() => setShowMacros(false)}><Text style={s.closeLink}>Close</Text></TouchableOpacity>
            </View>

            <View style={s.macroCards}>
              <MacroCard title="Calories" color={colors.success} icon="flame-outline" value={Math.round(totals.kcal)} goal={Math.round(goals.cal)} unit="" />
              <MacroCard title="Protein"  color={colors.info}    icon="restaurant-outline" value={Math.round(totals.p)} goal={Math.round(pGoal)} unit="g" />
              <MacroCard title="Carbs"    color={colors.orange}  icon="leaf-outline" value={Math.round(totals.c)} goal={Math.round(cGoal)} unit="g" />
              <MacroCard title="Fats"     color={colors.purple}  icon="water-outline" value={Math.round(totals.f)} goal={Math.round(fGoal)} unit="g" />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==== LEFT DRAWER ==== */}
      <Modal visible={drawerOpen} transparent animationType="none" onRequestClose={closeDrawer}>
        <Pressable style={s.drawerBackdrop} onPress={closeDrawer}>
          <Animated.View style={[s.drawer, { width: DRAWER_WIDTH, transform: [{ translateX: drawerX }] }]}>
            <View style={s.drawerHeader}>
              <Text style={s.drawerTitle}>Menu</Text>
              <TouchableOpacity onPress={closeDrawer} style={s.iconBtn}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <DrawerItem label="Dashboard" onPress={() => go("/(tabs)")} />
            <DrawerItem label="Diary"     onPress={() => go("/(tabs)/food")} />
            <DrawerItem label="Gym"       onPress={() => go("/(tabs)/workout")} />
            <DrawerItem label="History"   onPress={() => go("/(tabs)/history")} />
            <DrawerItem label="Progress"  onPress={() => go("/(tabs)/progress")} />
            <DrawerItem label="Settings"  onPress={() => go("/settings")} />
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- UI helpers ---------- */
function Row({ icon, iconColor, label, value }) {
  return (
    <View style={s.inline}>
      <View style={s.roundIcon}><Ionicons name={icon} size={18} color={iconColor} /></View>
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

function Insight({ label, value }) {
  return (<View style={{ alignItems: "center", flex: 1 }}><Text style={s.insightVal}>{value}</Text><Text style={s.insightLbl}>{label}</Text></View>);
}

// small circular ring; showTexts lets us reuse it inside the macro cards
function ActivityRing({ pct = 0.6, color = colors.primary, icon = "help", value, label, size = 82, stroke = 8, showTexts = true }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const dash = c * clamped;
  const gap = c - dash;
  return (
    <View style={s.activityItem}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size/2} cy={size/2} r={r} stroke={colors.ringTrack} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash},${gap}`} strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        </Svg>
        <View style={s.activityIconWrap}><Ionicons name={icon} size={20} color={color} /></View>
      </View>
      {showTexts && (<><Text style={s.activityValue}>{value}</Text><Text style={s.activityLabel}>{label}</Text></>)}
    </View>
  );
}

// tile for the macro dialog
function MacroCard({ title, color, icon, value, goal, unit }) {
  const pct = Math.max(0, Math.min(1, goal ? value / goal : 0));
  return (
    <Card style={s.macroCard}>
      <ActivityRing pct={pct} color={color} icon={icon} size={60} stroke={8} showTexts={false} />
      <View style={{ marginTop: 10 }}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.muted}>
          {nf.format(value)}{unit ? unit : ""} / {nf.format(goal)}{unit ? unit : (title === "Calories" ? "" : "")}
        </Text>
      </View>
    </Card>
  );
}

function DrawerItem({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.drawerItem}>
      <Ionicons  size={20} color={colors.text} />
      <Text style={s.drawerItemTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

function cap(x) { return x.charAt(0).toUpperCase() + x.slice(1); }

/* -------------------- styles -------------------- */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { paddingBottom: spacing(3) },

  topBar: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  searchWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, height: 40,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 0 },

  row2: { flexDirection: "row", gap: spacing(1), marginTop: spacing(4) },
  sheetTitle: { flex: 2, padding: 5, borderRadius: 16, fontSize: 15 },

  // tile styles (single definition; content padding is applied in tileContent)
  tile: { flex: 1, borderRadius: 18, overflow: "hidden" },
  tileShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tileBg: { ...StyleSheet.absoluteFillObject },
  tileInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.002)",
  },
  tileContent: { padding: 14 },
  tileHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tileOver: { color: colors.textMuted, fontWeight: "700", letterSpacing: 1, fontSize: 12, marginTop: 2 },
  tileTitle: { color: colors.text, fontSize: 22, fontWeight: "500", marginTop: 6 },
  tileSub: { color: colors.textMuted, marginTop: 4 },
  tileBtn: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  tileBtnTxt: { color: colors.text, fontWeight: "700" },
  tileLink: { color: colors.primary, fontWeight: "700", marginTop: 4 },

  block: { borderRadius: 16 },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontWeight: "800" },
  link: { color: colors.primary, fontWeight: "700" },

  tabsRow: { flexDirection: "row", gap: 14, marginTop: 8, marginBottom: 8 },
  tabBtn: { paddingVertical: 6 },
  tabTxt: { color: colors.textMuted, fontWeight: "700" },
  tabActive: { color: colors.primary },

  inline: { flexDirection: "row", alignItems: "center" },
  roundIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  muted: { color: colors.textMuted },
  big: { color: colors.text, fontSize: 18, fontWeight: "800" },
  title: { color: colors.text, fontSize: 14, fontWeight: "400" },

  badgeSuccess: { color: colors.badgeSuccessText, backgroundColor: colors.badgeSuccessBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontWeight: "700" },

  quickRow: { flexDirection: "row", gap: spacing(1), marginTop: spacing(1), marginBottom: spacing(1) },
  qpill: { flex: 1, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 6 },
  qpillTxt: { color: colors.text, fontWeight: "700", fontSize: 12 },

  /* Daily Activity */
  activityRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing(1), paddingHorizontal: 2 },
  activityItem: { alignItems: "center", width: "32%" },
  activityIconWrap: { position: "absolute" },
  activityValue: { color: colors.text, fontWeight: "800", marginTop: 6 },
  activityLabel: { color: colors.textMuted, marginTop: 2 },

  /* Recs */
  recCard: { width: 180, borderRadius: 16, marginRight: 12, backgroundColor: colors.card, overflow: "hidden" },
  recImageWrap: { width: "100%", height: 104, backgroundColor: colors.surface },
  recImage: { width: "100%", height: "100%" },
  newBadge: { position: "absolute", right: 8, top: 8, backgroundColor: colors.newBadgeBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeTxt: { color: colors.newBadgeText, fontSize: 10, fontWeight: "700" },
  recTitle: { color: colors.text, fontWeight: "800", marginTop: 8, marginHorizontal: 10 },
  recMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 10, marginTop: 6, marginBottom: 12 },
  recMetaTxt: { color: colors.textMuted, marginRight: 10 },

  insightsRow: { flexDirection: "row", marginTop: 12, alignItems: "center" },

  progress: { height: 6, backgroundColor: colors.ringTrack, borderRadius: 999, overflow: "hidden", marginTop: 8 },
  progressBar: { height: "100%", backgroundColor: colors.primary, borderRadius: 999 },

  /* Macro dialog */
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
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
  macroCards: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1)},
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
  topActions: { alignItems: "flex-end", marginTop: spacing(1) },

  editBtnTxt: {
    paddingTop: 7,
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  tileSubSm: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  },
});
