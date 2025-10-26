// app/(models)/workout-summary.js
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useMemo, useState } from "react";
import { api } from "../../lib/api";

function toHMS(totalSec = 0) {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return { hh, mm, ss };
}

export default function WorkoutSummary() {
  const router = useRouter();
  const {
    calories: caloriesParam = "0",
    startedAt,
    durationSec,
    sets: setsJSON,
  } = useLocalSearchParams();

  const [saving, setSaving] = useState(false);

  const calories = Number(caloriesParam) || 0;
  const duration = Number(durationSec) || 0;
  const started_at_iso = startedAt
    ? new Date(Number(startedAt)).toISOString()
    : new Date().toISOString();

  // Parse sets from params (array of { exercise, reps?, weight_kg? })
  const sets = useMemo(() => {
    try {
      return setsJSON ? JSON.parse(String(setsJSON)) : [];
    } catch {
      return [];
    }
  }, [setsJSON]);

  // Group sets by exercise for display like “3 sets · 10 reps”
  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of sets) {
      const key = s.exercise || "Exercise";
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([name, arr]) => {
      const setsCount = arr.length;
      const avgReps =
        arr.filter(x => typeof x.reps === "number").reduce((a, b) => a + b.reps, 0) /
        Math.max(1, arr.filter(x => typeof x.reps === "number").length);
      return {
        id: name,
        name,
        sets: setsCount,
        reps: Number.isFinite(avgReps) ? Math.round(avgReps) : "-",
      };
    });
  }, [sets]);

  const { hh, mm, ss } = toHMS(duration);

  const onSave = async () => {
    setSaving(true);
    try {
      await api.addWorkout({
        notes: "", // optional: wire a notes field here if you add one to UI
        started_at: started_at_iso,
        ended_at: new Date().toISOString(),
        duration_sec: duration,
        calories_burned: calories,
        sets, // JSONB column supports this structure
      });
      router.replace("/(tabs)/history");
    } catch (e) {
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.overlay} edges={["bottom"]}>
      <View style={s.sheet}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.x}>✕</Text>
          </TouchableOpacity>
          <Text style={s.hTitle}>Workout Summary</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing(2) }}
        >
          <Text style={s.section}>Total Time</Text>
          <View style={s.grid3}>
            <Card>
              <Text style={s.timeBig}>{hh}</Text>
              <Text style={s.timeSmall}>Hours</Text>
            </Card>
            <Card>
              <Text style={s.timeBig}>{mm}</Text>
              <Text style={s.timeSmall}>Minutes</Text>
            </Card>
            <Card>
              <Text style={s.timeBig}>{ss}</Text>
              <Text style={s.timeSmall}>Seconds</Text>
            </Card>
          </View>

          <Text style={s.section}>Calories Burned</Text>
          <Card style={{ alignItems: "center", paddingVertical: spacing(1.5) }}>
            <Text style={s.calories}>{Math.round(calories)}</Text>
            <Text style={s.kcal}>kcal</Text>
          </Card>

          <Text style={s.section}>Exercises</Text>
          <View style={{ gap: spacing(1) }}>
            {grouped.length === 0 ? (
              <Card style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={s.exSub}>No sets recorded</Text>
              </Card>
            ) : (
              grouped.map((ex) => (
                <Card key={ex.id} style={{ paddingVertical: 12 }}>
                  <Text style={s.exTitle}>{ex.name}</Text>
                  <Text style={s.exSub}>
                    {ex.sets} {ex.sets === 1 ? "set" : "sets"} · {ex.reps} reps
                  </Text>
                </Card>
              ))
            )}
          </View>
        </ScrollView>

        <View style={s.footerRow}>
          <Button
            title="Discard"
            onPress={() => router.back()}
            style={[s.btn, { backgroundColor: colors.surface }]}
          />
          <Button
            title={saving ? "Saving…" : "Save"}
            onPress={onSave}
            style={s.btn}
            disabled={saving}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    maxHeight: "92%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1),
  },
  x: { color: colors.textMuted, fontSize: 18 },
  hTitle: { color: colors.text, fontWeight: "700" },
  section: { color: colors.text, fontWeight: "800", marginTop: spacing(1.25), marginBottom: spacing(1) },
  grid3: { flexDirection: "row", gap: spacing(1) },
  timeBig: { color: colors.text, fontWeight: "800", fontSize: 22, textAlign: "center" },
  timeSmall: { color: colors.textMuted, textAlign: "center", marginTop: 2 },
  calories: { color: colors.text, fontWeight: "900", fontSize: 36, letterSpacing: 1 },
  kcal: { color: colors.textMuted, marginTop: 4 },
  exTitle: { color: colors.text, fontWeight: "700" },
  exSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  footerRow: { flexDirection: "row", gap: spacing(1), paddingVertical: spacing(1.25) },
  btn: { flex: 1, height: 48, borderRadius: 999 },
});
