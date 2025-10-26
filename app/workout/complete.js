// app/workout/complete.js
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";

const fmt = (n) => Number.isFinite(+n) ? +n : 0;

export default function Complete() {
  const router = useRouter();
  const { name, duration = "0", sets = "0", volume = "0" } = useLocalSearchParams();
  const mins = Math.floor(fmt(duration) / 60);
  const secs = fmt(duration) % 60;

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <View style={s.hero}>
        <View style={s.check}><Text style={s.checkTxt}>✓</Text></View>
        <Text style={s.h1}>Nice work!</Text>
        <Text style={s.sub}>{name || "Untitled Workout"}</Text>
        <Text style={s.small}>Saved to History</Text>
      </View>

      <View style={s.metricsRow}>
        <Metric label="Duration" value={`${mins}:${secs < 10 ? "0" : ""}${secs}`} />
        <Metric label="Sets" value={String(fmt(sets))} />
        <Metric label="Volume (kg)" value={`${fmt(volume).toFixed(1)}k`.replace(".0k", "k")} />
      </View>

      <View style={{ marginTop: spacing(3), paddingHorizontal: spacing(2) }}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/workout")} style={s.doneBtn}>
          <Text style={s.doneTxt}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricVal}>{value}</Text>
      <Text style={s.metricLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: "center", marginTop: spacing(3) },
  check: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.badgeSuccessBg, alignItems: "center", justifyContent: "center" },
  checkTxt: { color: colors.badgeSuccessText, fontSize: 32, fontWeight: "900" },
  h1: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 12 },
  sub: { color: colors.text, fontWeight: "700", marginTop: 4 },
  small: { color: colors.textMuted, marginTop: 2 },

  metricsRow: { flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2), paddingHorizontal: spacing(2) },
  metric: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  metricVal: { color: colors.text, fontWeight: "800", fontSize: 16 },
  metricLbl: { color: colors.textMuted, marginTop: 2 },

  doneBtn: { height: 52, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  doneTxt: { color: colors.onPrimary, fontWeight: "800", fontSize: 16 },
});
