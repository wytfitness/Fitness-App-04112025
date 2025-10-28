// app/workout/complete.js
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../lib/theme";
import Card from "../../components/Card";
import { api } from "../../lib/api";

const nf = new Intl.NumberFormat();

export default function Complete() {
  const router = useRouter();
  const { name, duration, sets, volume, kcal, plan: planParam } = useLocalSearchParams();

  const plan = useMemo(() => {
    try { return JSON.parse(decodeURIComponent(planParam || "")) || []; }
    catch { return []; }
  }, [planParam]);

  const [savingFav, setSavingFav] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveFavorite = async () => {
    if (savingFav || saved) return;
    setSavingFav(true);
    try {
      await api.saveFavoriteWorkout(String(name || "Workout"), plan);
      setSaved(true);
    } catch (e) {
      console.warn("save favorite:", e?.message || e);
    } finally {
      setSavingFav(false);
    }
  };

  return (
    <SafeAreaView style={s.wrap} edges={["top"]}>
      <View style={{ alignItems: "center", marginTop: spacing(3) }}>
        <View style={s.bigBadge}><Ionicons name="checkmark" size={32} color={colors.success} /></View>
        <Text style={s.h1}>Nice work!</Text>
        <Text style={s.sub}>{name || "Workout"}</Text>
        <Text style={[s.muted, { marginTop: 4 }]}>Saved to History</Text>
      </View>

      <View style={{ marginTop: spacing(2), gap: spacing(1) }}>
        <Card style={s.kpi}><Text style={s.kpiVal}>{fmtTime(Number(duration || 0))}</Text><Text style={s.kpiLbl}>Duration</Text></Card>
        <Card style={s.kpi}><Text style={s.kpiVal}>{nf.format(Number(sets || 0))}</Text><Text style={s.kpiLbl}>Sets</Text></Card>
        <Card style={s.kpi}><Text style={s.kpiVal}>{nf.format(Number(volume || 0))}k</Text><Text style={s.kpiLbl}>Volume (kg)</Text></Card>
      </View>

      <View style={{ marginTop: spacing(2), gap: 10 }}>
        <TouchableOpacity
          onPress={saveFavorite}
          style={[s.primaryGhost, saved && { borderColor: colors.successSoft, backgroundColor: colors.successSoft }]}
          disabled={savingFav}
        >
          <Ionicons name={saved ? "star" : "star-outline"} size={18} color={saved ? colors.success : colors.text} />
          <Text style={[s.primaryGhostTxt, saved && { color: colors.success }]}>
            {saved ? "Saved to Favorites" : (savingFav ? "Saving…" : "Save as Favorite")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(tabs)/workout")} style={s.primary}>
          <Text style={s.primaryTxt}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function fmtTime(sec) {
  const s = Math.max(0, Math.round(Number(sec || 0)));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2) },
  bigBadge: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#EAF7F0", alignItems: "center", justifyContent: "center" },
  h1: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: spacing(1) },
  sub: { color: colors.text, fontWeight: "800", marginTop: 6 },
  muted: { color: colors.textMuted },

  kpi: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  kpiVal: { color: colors.text, fontSize: 20, fontWeight: "900" },
  kpiLbl: { color: colors.textMuted, fontWeight: "700" },

  primary: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.success },
  primaryTxt: { color: colors.onPrimary, fontWeight: "900", fontSize: 16 },

  primaryGhost: {
    height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: "row", gap: 8,
  },
  primaryGhostTxt: { color: colors.text, fontWeight: "800" },
});
