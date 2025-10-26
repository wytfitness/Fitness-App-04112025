// app/workout/review.js
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../lib/theme";

function parsePlan(p) {
  try { return JSON.parse(decodeURIComponent(p || "")) || []; } catch { return []; }
}

export default function Review() {
  const router = useRouter();
  const { name, plan: planParam } = useLocalSearchParams();
  const [title, setTitle] = useState(name || "Untitled Workout");
  const [plan, setPlan] = useState(parsePlan(planParam));

  const metrics = useMemo(() => {
    const exercises = plan.length;
    const sets = plan.reduce((s, p) => s + (Number(p.sets) || 0), 0);
    const estMin = Math.max(15, sets * 3); // rough estimate
    return { exercises, sets, estMin };
  }, [plan]);

  const start = () => {
    router.push({
      pathname: "/workout/active",
      params: { name: title, plan: encodeURIComponent(JSON.stringify(plan)) },
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.h1}>Ready to Start</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={s.label}>Workout Name</Text>
        <TextInput
          style={s.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Untitled Workout"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[s.label, { marginTop: spacing(2) }]}>Exercises ({plan.length})</Text>
        {plan.map((p, i) => (
          <View key={p.id} style={s.rowCard}>
            <Text style={s.rowIndex}>{i + 1}.</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{p.name}</Text>
              <Text style={s.rowSub}>{p.sets} × {p.reps}{p.weight_kg ? ` @ ${p.weight_kg}kg` : ""}</Text>
            </View>
          </View>
        ))}

        <View style={s.metricsRow}>
          <Metric label="Exercises" value={String(metrics.exercises)} />
          <Metric label="Total Sets" value={String(metrics.sets)} />
          <Metric label="Est. Min"   value={`~${metrics.estMin}`} />
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity onPress={start} style={s.cta}>
          <Ionicons name="play" size={18} color={colors.onPrimary} />
          <Text style={s.ctaTxt}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2) },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing(1) },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  h1: { color: colors.text, fontSize: 20, fontWeight: "800" },

  label: { color: colors.textMuted, fontWeight: "700", marginTop: spacing(1) },
  input: {
    marginTop: 6, backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, color: colors.text,
  },

  rowCard: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  rowIndex: { color: colors.textMuted, fontWeight: "800", width: 22 },
  rowTitle: { color: colors.text, fontWeight: "800" },
  rowSub: { color: colors.textMuted, marginTop: 2 },

  metricsRow: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2) },
  metric: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, alignItems: "center" },
  metricValue: { color: colors.text, fontWeight: "800", fontSize: 16 },
  metricLabel: { color: colors.textMuted, marginTop: 2 },

  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing(2), paddingTop: 10, paddingBottom: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: -2 }, elevation: 10,
  },
  cta: { height: 52, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  ctaTxt: { color: colors.onPrimary, fontWeight: "800" },
});
