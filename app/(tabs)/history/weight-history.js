import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../../lib/theme";
import Card from "../../../components/Card";
import { api } from "../../../lib/api";

const nf = new Intl.NumberFormat();
const kgToLbs = (kg) => Number((Number(kg) * 2.20462262).toFixed(1));

export default function WeightHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const j = await api.weights(90);
        setWeights(j.weights ?? []);
      } catch (e) {
        console.warn("weight history:", e?.message || e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = weights?.[0];
  const nowLbs = current ? kgToLbs(current.weight_kg) : null;

  const delta30 = useMemo(() => {
    if (!weights?.length) return null;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const past = [...weights].reverse().find((w) => new Date(w.recorded_at) <= cutoff);
    if (!past || !current) return null;
    const diff = nowLbs - kgToLbs(past.weight_kg);
    const pct = past.weight_kg ? (diff / kgToLbs(past.weight_kg)) * 100 : 0;
    return { diff, pct };
  }, [weights, nowLbs, current]);

  return (
    <SafeAreaView style={s.wrap} edges={["top"]}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>‹</Text></TouchableOpacity>
        <Text style={s.hTitle}>Weight History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing(2) }} />
      ) : (
        <>
          {/* Summary + simple chart placeholder */}
          <Card style={{ padding: spacing(1.25), gap: spacing(1) }}>
            <Text style={s.label}>Current Weight</Text>
            <Text style={s.current}>{nowLbs != null ? `${nowLbs} lbs` : "—"}</Text>
            <Text style={s.delta}>
              Last 30 Days{" "}
              <Text style={{ color: (delta30?.diff ?? 0) <= 0 ? "#16a34a" : "#dc2626" }}>
                {delta30 ? `${delta30.diff.toFixed(1)} lbs (${delta30.pct.toFixed(1)}%)` : "—"}
              </Text>
            </Text>

            {/* lightweight fake chart */}
            <View style={s.chartBox}>
              <View style={[s.dot, { left: "5%" }]} />
              <View style={[s.dot, { left: "22%", top: 36 }]} />
              <View style={[s.dot, { left: "38%", top: 18 }]} />
              <View style={[s.dot, { left: "55%", top: 46 }]} />
              <View style={[s.dot, { left: "72%", top: 10 }]} />
              <View style={[s.dot, { left: "90%", top: 28 }]} />
              <Text style={s.axisText}>Jan</Text>
              <Text style={[s.axisText, { left: "23%" }]}>Feb</Text>
              <Text style={[s.axisText, { left: "40%" }]}>Mar</Text>
              <Text style={[s.axisText, { left: "57%" }]}>Apr</Text>
              <Text style={[s.axisText, { left: "75%" }]}>May</Text>
            </View>
          </Card>

          <Text style={s.section}>Weight Log</Text>

          <FlatList
            data={(weights ?? []).map((w) => ({
              id: w.id,
              date: new Date(w.recorded_at ?? w.created_at ?? w.inserted_at).toLocaleDateString(),
              value: kgToLbs(w.weight_kg),
            }))}
            keyExtractor={(x) => String(x.id)}
            ItemSeparatorComponent={() => <View style={{ height: spacing(1) }} />}
            renderItem={({ item }) => (
              <Card style={s.row}>
                <Text style={s.rowLeft}>{item.value} lbs</Text>
                <Text style={s.rowRight}>{item.date}</Text>
              </Card>
            )}
            contentContainerStyle={{ paddingBottom: spacing(2) }}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2), paddingBottom: spacing(2) },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(1.25) },
  back: { color: colors.text, fontSize: 22 },
  hTitle: { color: colors.text, fontWeight: "700" },

  label: { color: colors.textMuted, fontWeight: "600" },
  current: { color: colors.text, fontSize: 26, fontWeight: "900" },
  delta: { color: colors.textMuted },

  chartBox: {
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing(1),
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  dot: {
    position: "absolute",
    top: 30,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  axisText: {
    position: "absolute",
    bottom: 6,
    left: 8,
    color: colors.textMuted,
    fontSize: 10,
  },

  section: { color: colors.text, fontWeight: "800", marginTop: spacing(1.25), marginBottom: spacing(1) },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing(1),
  },
  rowLeft: { color: colors.text, fontWeight: "700" },
  rowRight: { color: colors.textMuted, fontSize: 12 },
});
