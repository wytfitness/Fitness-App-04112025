// app/(tabs)/progress.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "../../lib/theme";
import Svg, { Path, Rect, Circle, Text as SvgText, G } from "react-native-svg";
import { api } from "../../lib/api";

/* ---------- utils ---------- */
const nf = new Intl.NumberFormat();
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
function dayKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function rangeDates(days = 7) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return [start, end];
}
function daysList(start, end) {
  const a = [];
  const d = new Date(start);
  while (d <= end) {
    a.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return a;
}

/* ---------- constants ---------- */
const RANGE_OPTS = ["7D", "30D"];
const METRIC_OPTS = ["Net kcal", "Meals kcal", "Exercise kcal", "Weight (kg)"];

/* ---------- UI bits ---------- */
function RangeTabs({ value, onChange }) {
  return (
    <View style={p.rangeWrap}>
      {["7 Days", "30 Days"].map((label) => {
        const mapped = label.startsWith("7") ? "7D" : "30D";
        const active = mapped === value;

        if (active) {
          return (
            <View key={label} style={[p.rangeTab, p.rangeTabActiveShell]}>
              <LinearGradient
                colors={colors.progress.tabGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={p.rangeTabGrad}
              >
                <TouchableOpacity activeOpacity={0.9} onPress={() => onChange(mapped)}>
                  <Text style={p.rangeTxtActive}>{label}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={label}
            onPress={() => onChange(mapped)}
            activeOpacity={0.9}
            style={[p.rangeTab, p.rangeTabInactive]}
          >
            <Text style={p.rangeTxt}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MetricList({ value, onChange, options }) {
  return (
    <View style={p.metricWrap}>
      {options.map((m, i) => {
        const active = m === value;

        return (
          <TouchableOpacity
            key={m}
            onPress={() => onChange(m)}
            activeOpacity={0.92}
            style={[
              p.metricItemBase,
              i === 0 && { marginTop: 0 },
              active ? p.metricItemActive : p.metricItemInactive,
            ]}
          >
            <View style={p.metricLeft}>
              {/* icon bubble */}
              {active ? (
                <LinearGradient
                  colors={["#E8FFF7", "#DFFAF4"]}  // light mint bubble
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={p.iconBubbleGrad}
                >
                  <Ionicons
                    name={
                      m.includes("Net")
                        ? "pulse-outline"
                        : m.includes("Meals")
                        ? "restaurant-outline"
                        : m.includes("Exercise")
                        ? "fitness-outline"
                        : "body-outline"
                    }
                    size={16}
                    color={colors.progress.line}
                  />
                </LinearGradient>
              ) : (
                <View style={p.iconBubbleMuted}>
                  <Ionicons
                    name={
                      m.includes("Net")
                        ? "pulse-outline"
                        : m.includes("Meals")
                        ? "restaurant-outline"
                        : m.includes("Exercise")
                        ? "fitness-outline"
                        : "body-outline"
                    }
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
              )}

              <Text style={[p.metricTxt, active && p.metricTxtActive]}>{m}</Text>
            </View>

            {/* status dot on the right for active row */}
            {active ? <View style={p.activeDot} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function LineOrBarChart({ data = [], kind = "line", height = 180, maxY, labelY = "" }) {
  const width = 16 * data.length + 28;
  const padL = 28,
    padR = 10,
    padT = 12,
    padB = 26;

  const ys = data.map((d) => Number(d.y || 0));
  const minY = 0;
  const yMax = maxY != null ? maxY : Math.ceil(Math.max(10, ...ys) * 1.1);

  const chartW = Math.max(40, width - padL - padR);
  const chartH = height - padT - padB;
  const xStep = chartW / Math.max(1, data.length - 1);

  const getX = (i) => padL + i * xStep;
  const getY = (y) => padT + chartH - (chartH * (y - minY)) / (yMax - minY || 1);

  let dPath = "";
  data.forEach((p, i) => {
    const cx = getX(i),
      cy = getY(p.y || 0);
    dPath += i === 0 ? `M${cx},${cy}` : ` L${cx},${cy}`;
  });

  // light dotted grid
  const gridYs = [0.25, 0.5, 0.75].map((r) => padT + chartH - chartH * r);

  return (
    <Svg width={width} height={height}>
      {labelY ? (
        <SvgText x={6} y={12} fill={colors.textMuted} fontSize="10" fontWeight="600">
          {labelY}
        </SvgText>
      ) : null}

      {gridYs.map((gy, i) => (
        <Path
          key={`g${i}`}
          d={`M${padL},${gy} L${padL + chartW},${gy}`}
          stroke={colors.progress.grid}
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ))}
      <Path
        d={`M${padL},${padT + chartH} L${padL + chartW},${padT + chartH}`}
        stroke={colors.border}
        strokeWidth={1}
      />

      {data.map((p, i) => {
        const cx = getX(i),
          by = padT + chartH;
        const show = data.length <= 10 || i % Math.ceil(data.length / 7) === 0;
        return (
          <G key={`t${i}`}>
            <Path d={`M${cx},${by} L${cx},${by + 4}`} stroke={colors.border} />
            {show ? (
              <SvgText x={cx} y={by + 16} textAnchor="middle" fill={colors.textMuted} fontSize="10">
                {p.x
                  .toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  .replace(",", "")}
              </SvgText>
            ) : null}
          </G>
        );
      })}

      {kind === "bar" ? (
        data.map((p, i) => {
          const cx = getX(i),
            by = getY(0),
            ty = getY(p.y || 0);
          const bw = Math.max(6, Math.min(14, (chartW / Math.max(1, data.length - 1)) * 0.6));
          return (
            <Rect
              key={`b${i}`}
              x={cx - bw / 2}
              y={Math.min(by, ty)}
              width={bw}
              height={Math.abs(by - ty)}
              rx={3}
              fill={colors.progress.line}
            />
          );
        })
      ) : (
        <G>
          <Path d={dPath} stroke={colors.progress.line} strokeWidth={2.5} fill="none" />
          {data.map((p, i) => (
            <Circle key={`d${i}`} cx={getX(i)} cy={getY(p.y || 0)} r={3} fill={colors.progress.line} />
          ))}
        </G>
      )}
    </Svg>
  );
}

function ChartHeader({ title = "Net Calories", rangeLabel = "7D" }) {
  return (
    <View style={p.chartHeader}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={p.miniBubble}>
          <Ionicons name="pulse-outline" size={14} color={colors.progress.lineDeep} />
        </View>
        <Text style={p.chartTitle}>{title}</Text>
      </View>
      <View style={p.rangeChip}>
        <Text style={p.rangeChipTxt}>{rangeLabel}</Text>
      </View>
    </View>
  );
}

/* ---------- screen ---------- */
export default function ProgressTab() {
  const [range, setRange] = useState("7D");
  const [metric, setMetric] = useState("Net kcal");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [mealsKcal, setMealsKcal] = useState({});
  const [exerciseKcal, setExerciseKcal] = useState({});
  const [weightsKg, setWeightsKg] = useState({});

  const days = useMemo(() => {
    const n = range === "7D" ? 7 : 30;
    const [start, end] = rangeDates(n);
    return daysList(start, end);
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const n = range === "7D" ? 7 : 30;
      const [start, end] = rangeDates(n);

      // Meals intake (sum per day)
      let intake = {};
      try {
        const startISO = new Date(start).toISOString();
        const endISO = new Date(end).toISOString();
        const r = await api.mealsRange?.(startISO, endISO);
        const meals = r?.meals ?? [];
        for (const m of meals) {
          const key = dayKey(new Date(m.eaten_at));
          const items = m.meal_items ?? [];
          for (const it of items) {
            intake[key] = (intake[key] || 0) + Number(it.calories || 0);
          }
        }
      } catch {}

      // Exercise kcal (sum per day)
      let exercise = {};
      try {
        const wRes = await api.workouts?.(200);
        const arr = wRes?.workouts ?? [];
        for (const w of arr) {
          const iso = w.ended_at ?? w.started_at ?? w.recorded_at ?? w.date;
          if (!iso) continue;
          const d = new Date(iso);
          if (d < start || d > end) continue;
          const key = dayKey(d);
          exercise[key] = (exercise[key] || 0) + Number(w.calories_burned ?? w.calories ?? 0);
        }
      } catch {}

      // Weights (latest per day)
      let weights = {};
      try {
        const wr = await api.weights?.(200);
        const arr = wr?.weights ?? [];
        for (const w of arr) {
          const iso = w.recorded_at ?? w.created_at ?? w.inserted_at;
          if (!iso) continue;
          const d = new Date(iso);
          if (d < start || d > end) continue;
          const key = dayKey(d);
          const val = Number(w.weight_kg);
          if (!Number.isFinite(val)) continue;
          if (!weights[key] || new Date(iso) > new Date(weights[key]._ts)) {
            weights[key] = { value: val, _ts: iso };
          }
        }
        Object.keys(weights).forEach((k) => (weights[k] = weights[k].value));
      } catch {}

      setMealsKcal(intake);
      setExerciseKcal(exercise);
      setWeightsKg(weights);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  // series
  const mealsSeries = days.map((d) => ({ x: d, y: mealsKcal[dayKey(d)] || 0 }));
  const exSeries = days.map((d) => ({ x: d, y: exerciseKcal[dayKey(d)] || 0 }));
  const netSeries = days.map((_, i) => ({
    x: days[i],
    y: (mealsSeries[i]?.y || 0) - (exSeries[i]?.y || 0),
  }));
  const weightSeries = days
    .map((d) => ({ x: d, y: weightsKg[dayKey(d)] ?? null }))
    .map((p, i, arr) => (p.y == null && i > 0 ? { x: p.x, y: arr[i - 1].y } : p))
    .map((p) => ({ x: p.x, y: p.y == null ? 0 : p.y }));

  const currentSeries =
    metric === "Net kcal"
      ? netSeries
      : metric === "Meals kcal"
      ? mealsSeries
      : metric === "Exercise kcal"
      ? exSeries
      : weightSeries;

  const vals = currentSeries.map((p) => Number(p.y || 0));
  const total = vals.reduce((s, v) => s + v, 0);
  const avg = vals.length ? total / vals.length : 0;
  const max = vals.length ? Math.max(...vals) : 0;
  const min = vals.length ? Math.min(...vals) : 0;

  const avgText = metric.includes("Weight") ? `${avg.toFixed(1)} kg` : nf.format(Math.round(avg));
  const maxText = metric.includes("Weight") ? `${max.toFixed(1)} kg` : nf.format(Math.round(max));
  const minText = metric.includes("Weight") ? `${min.toFixed(1)} kg` : nf.format(Math.round(min));

  return (
    <SafeAreaView style={p.screen} edges={["top"]}>
      {/* soft page gradient */}
      <LinearGradient colors={["#F8F7FF", "#F3F7FF"]} start={{ x:0, y: 0 }} end={{ x: 0, y: 1 }} style={p.bgGrad} />

      <ScrollView contentContainerStyle={{ paddingBottom: spacing(3) }} showsVerticalScrollIndicator={false}>
        {/* Heading */}
        <View style={p.header}>
          <Text style={p.title}>Progress Tracker</Text>
          <Text style={p.subtitle}>Track your health metrics over time</Text>
        </View>

        {/* Tabs */}
        <RangeTabs value={range} onChange={setRange} />

        {/* Metric list */}
        <MetricList value={metric} onChange={setMetric} options={METRIC_OPTS} />

       
        {/* Chart Card */}
        <View style={p.chartCard}>
          <LinearGradient
            colors={["#FFFFFF", "#FBFEFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={p.cardGrad}
            pointerEvents="none"
          />
          <ChartHeader
            title={
              metric === "Net kcal"
                ? "Net Calories"
                : metric === "Meals kcal"
                ? "Meals Kcal"
                : metric === "Exercise kcal"
                ? "Exercise Kcal"
                : "Weight (kg)"
            }
            rangeLabel={range}
          />
          {err ? (
            <Text style={{ color: colors.danger, padding: spacing(1) }}>{err}</Text>
          ) : loading ? (
            <ActivityIndicator style={{ marginVertical: spacing(2) }} />
          ) : (
            <View style={{ alignItems: "center" }}>
              <LineOrBarChart data={currentSeries} kind="line" labelY="" />
            </View>
          )}
        </View>


        {/* Stats */}
        {/* Stats */}
        <View style={p.statsOuter}>
          <LinearGradient
            colors={["rgba(247,245,255,0)", "rgba(247,225,255,0.6)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={p.statsBgGrad}
            pointerEvents="none"
          />
          <View style={p.statsRow}>
            <View style={p.statBox}>
              <Text style={p.statLbl}>Average</Text>
              <Text style={p.statVal}>{avgText}</Text>

              <View style={p.statExtraRow}>
                <View style={p.statPill}>
                  <Ionicons
                    name="trending-up-outline"
                    size={12}
                    color={colors.progress.lineDeep}
                  />
                  <Text style={p.statPillTxt}>+5.2%</Text>
                </View>
              </View>
            </View>

            <View style={p.statBox}>
              <Text style={p.statLbl}>Max</Text>
              <Text style={p.statVal}>{maxText}</Text>
              <Text style={p.statSub}>Peak value</Text>
            </View>

            <View style={p.statBox}>
              <Text style={p.statLbl}>Min</Text>
              <Text style={p.statVal}>{minText}</Text>
              <Text style={p.statSub}>Lowest</Text>
            </View>
          </View>
        </View>

        {/* Info card */}
        <View style={p.infoCard}>
        <LinearGradient
          colors={["#FFFFFF", "#FCF7FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={p.cardGrad}
          pointerEvents="none"
        />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={p.iconBubble}>
            <Ionicons name="pulse-outline" size={16} color={colors.progress.lineDeep} />
          </View>
          <Text style={[p.infoTitle, { marginLeft: 8 }]}>
            {metric === "Net kcal" ? "Net Calories" : metric === "Meals kcal" ? "Meals Kcal" : metric === "Exercise kcal" ? "Exercise Kcal" : "Weight"}
          </Text>
        </View>
        <Text style={p.infoDesc}>
          {metric === "Net kcal"
            ? "Intake − Exercise. Positive means surplus; negative means deficit. Track your daily balance to meet your fitness goals."
            : metric === "Meals kcal"
            ? "Sum of all logged meals for each day. Helps you spot overeating or under-fueling trends."
            : metric === "Exercise kcal"
            ? "Calories burned from workouts. Higher means more total output."
            : "Your body weight trend. Slow, steady change is healthier than sharp jumps."}
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- styles ---------- */
const p = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2),
  },
  bgGrad: { position: "absolute", inset: 0 },

  header: { marginTop: spacing(2), marginBottom: spacing(2) },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: { fontSize: 13, fontWeight: "400", color: colors.textMuted },

  /* ---------- Range tabs (gradient active, white inactive) ---------- */
  rangeWrap: {
    flexDirection: "row",
    borderRadius: 22,
    backgroundColor: colors.progress.tabsBg,
    padding: 8,
    marginBottom: spacing(2),
    shadowColor: "rgba(12,21,46,0.15)",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  rangeTab: {
    flex: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeTabActiveShell: {
    overflow: "hidden",
    shadowColor: colors.progress.line,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  rangeTabGrad: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeTabInactive: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    shadowColor: "rgba(12,21,46,0.06)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  rangeTxt: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  rangeTxtActive: { color: "#FFFFFF", fontWeight: "700" },

  /* ---------- Metric list (glassy cards + icon bubbles) ---------- */
  metricWrap: {
    borderRadius: 16,
    overflow: "visible",
    marginBottom: spacing(2),
  },

  metricItemBase: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: spacing(1.25),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricItemActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6ECF5",
    shadowColor: "rgba(12,21,46,0.12)",
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  metricItemInactive: {
    backgroundColor: "#F7F9FE",
    borderWidth: 1,
    borderColor: "#E9EEF7",
    shadowColor: "rgba(12,21,46,0.06)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  metricLeft: { flexDirection: "row", alignItems: "center" },

  iconBubbleGrad: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconBubbleMuted: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#EEF4FF",
  },

  metricTxt: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
  metricTxtActive: { color: colors.text },

  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2DD4BF", // bright mint dot
    marginRight: 4,
  },

  /* ---------- Cards (chart + info) ---------- */
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 0,
    padding: spacing(1.5),
    // stronger, softer shadow like the mock
    shadowColor: "rgba(12,21,46,0.16)",
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
    marginTop: spacing(1),
  },
  cardGrad: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 20,
  },
  infoCard: {
    marginTop: spacing(2),
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 0,
    padding: spacing(1.5),
    shadowColor: "rgba(12,21,46,0.16)",
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
    marginBottom: spacing(3),
  },

  /* --- Chart header / chip (unchanged except radii) --- */
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1),
  },
  miniBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.progress.chipBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  chartTitle: { color: colors.text, fontWeight: "700", fontSize: 14 },
  rangeChip: {
    backgroundColor: colors.progress.chipBg,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rangeChipTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.progress.lineDeep,
  },

  /* --- Stats trio --- */
    statsRow: {
      flexDirection: "row",
      gap: spacing(1),
    },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 0,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1),
    shadowColor: "rgba(12,21,46,0.14)",
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    minHeight: 90,
  },
  statLbl: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  statVal: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  statSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  // pill under Average
  statExtraRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.progress.chipBg,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statPillTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.progress.lineDeep,
  },

  /* ---------- Info text ---------- */
  infoTitle: { color: colors.text, fontWeight: "700", fontSize: 14 },
  infoDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },

    statsOuter: {
    marginTop: spacing(2),
    position: "relative",
  },
  statsBgGrad: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 24,
  },
});
