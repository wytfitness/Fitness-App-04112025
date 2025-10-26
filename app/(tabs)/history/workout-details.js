import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { colors, spacing } from "../../../lib/theme";
import Card from "../../../components/Card";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";

const nf = new Intl.NumberFormat();

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

function mins(start, end) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (s && e && e > s) return Math.max(1, Math.round((e - s) / 60000));
  return 0;
}

export default function WorkoutDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null); // {date, duration, calories, title}
  const [sets, setSets] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) get this workout from the list so we have times + calories
        const list = await api.workouts(200);
        const w = (list.workouts ?? []).find((x) => String(x.id) === String(id));
        // 2) get sets
        const det = await api.workoutDetail(id);
        if (!alive) return;

        const when = w?.ended_at ?? w?.started_at;
        setSummary({
          title: w?.notes || "Workout",
          date: when ? new Date(when).toLocaleString() : "—",
          durationMin: mins(w?.started_at, w?.ended_at),
          calories: Math.round(Number(w?.calories_burned ?? 0)),
        });
        setSets(det.sets ?? []);
      } catch (e) {
        setSummary({ title: "Workout", date: "—", durationMin: 0, calories: 0 });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const renderSet = ({ item }) => (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing(1), padding: spacing(1) }}>
      <View style={s.iconBox}><Text style={{ color: colors.text }}>🏋️</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.exTitle}>{item.exercise || "Exercise"}</Text>
        <Text style={s.exSub}>
          Set {item.set_index ?? "—"}
          {item.reps != null ? ` • ${item.reps} reps` : ""}
          {item.weight_kg != null ? ` • ${Number(item.weight_kg).toFixed(1)} kg` : ""}
          {item.duration_sec != null ? ` • ${Math.round(item.duration_sec)}s` : ""}
        </Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={s.wrap} edges={["top"]}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.hTitle}>Workout Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing(2) }} />
      ) : (
        <>
          <Text style={s.section}>Workout Summary</Text>
          <Card style={{ gap: 10 }}>
            <Row label="Title" value={summary?.title ?? "Workout"} />
            <Row label="Date" value={summary?.date ?? "—"} />
            <Row label="Duration" value={`${summary?.durationMin ?? 0} min`} />
            <Row label="Calories Burned" value={`${nf.format(summary?.calories ?? 0)} kcal`} />
          </Card>

          <Text style={s.section}>Exercises</Text>
          {sets.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No sets logged.</Text>
          ) : (
            <FlatList
              data={sets}
              keyExtractor={(x, i) => `${x.id || "set"}-${i}`}
              renderItem={renderSet}
              ItemSeparatorComponent={() => <View style={{ height: spacing(1) }} />}
              contentContainerStyle={{ paddingBottom: spacing(2) }}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2), paddingBottom: spacing(2) },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(1.5) },
  back: { color: colors.text, fontSize: 24 },
  hTitle: { color: colors.text, fontWeight: "700", fontSize: 18 },

  section: { color: colors.text, fontWeight: "800", marginTop: spacing(1), marginBottom: spacing(1) },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.textMuted, fontWeight: "600" },
  value: { color: colors.text, fontWeight: "700" },

  iconBox: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  exTitle: { color: colors.text, fontWeight: "700" },
  exSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
