// app/settings/index.js
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, Text, StyleSheet, Image, Switch, TouchableOpacity, Alert } from "react-native";
import { colors, spacing } from "../../lib/theme";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../stores/auth";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getGoals } from "../../lib/goals";

const nf = new Intl.NumberFormat();

export default function Settings() {
  const router = useRouter();
  const user = useAuth((s) => s.user) || { email: "ethan.carter@example.com", name: "Ethan Carter" };
  const signOut = useAuth((s) => s.signOut);

  const [metric, setMetric] = useState(true);
  const [notify, setNotify] = useState(true);
  const [goals, setGoals] = useState(null);

  const loadGoals = useCallback(async () => {
    try {
      const g = await getGoals(); // { calories, carbs_pct, protein_pct, fat_pct, weight, water_cups, workout_days }
      setGoals(g);
    } catch (e) {
      console.warn("Settings: getGoals failed", e?.message || e);
    }
  }, []);

  useEffect(() => { loadGoals(); }, [loadGoals]);
  useFocusEffect(useCallback(() => { loadGoals(); }, [loadGoals])); // refresh after Edit Goals

  const kcal = goals?.calories ?? 2000;
  const macros = `${goals?.carbs_pct ?? 40}c / ${goals?.protein_pct ?? 30}p / ${goals?.fat_pct ?? 30}f`;
  const weightVal = goals?.weight ?? 75;
  const waterL = ((goals?.water_cups ?? 12) * 0.25).toFixed(1);

  const onLogout = () => {
    Alert.alert("Log out?", "You’ll need to log in again next time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.wrap} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(4) }}>
        <View style={s.headerRow}>
          <Text style={s.hTitle}>Settings</Text>
        </View>

        <View style={{ alignItems: "center", marginBottom: spacing(2) }}>
          <Image
            source={require("../../assets/splash.png")}
            style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: colors.border }}
          />
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.tiny}>Premium Member • Joined 2 years ago</Text>
        </View>

        <Text style={s.section}>Account</Text>
        <Card>
          <Text style={s.label}>Email</Text>
          <View style={s.inputLike}><Text style={s.inputText}>{user.email}</Text></View>
        </Card>

        <Text style={s.section}>Goals</Text>
        <Card style={{ gap: 10 }}>
          <Row label="Calories" value={`${nf.format(kcal)} kcal`} />
          <Row label="Macros" value={macros} />
          <Row label="Weight" value={`${weightVal} kg`} />
          <Row label="Water" value={`${waterL} L`} />
          <View style={{ marginTop: spacing(1) }}>
            <Button title="Edit Goals" onPress={() => router.push("/settings/edit-goals")} />
          </View>
        </Card>

        <Text style={s.section}>Preferences</Text>
        <Card>
          <Text style={s.label}>Units</Text>
          <View style={s.segmentWrap}>
            <TouchableOpacity onPress={() => setMetric(true)} style={[s.segmentBtn, metric && s.segmentActive]}>
              <Text style={[s.segmentTxt, metric && s.segmentTxtActive]}>Metric</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMetric(false)} style={[s.segmentBtn, !metric && s.segmentActive]}>
              <Text style={[s.segmentTxt, !metric && s.segmentTxtActive]}>Imperial</Text>
            </TouchableOpacity>
          </View>

          <View style={s.toggleRow}>
            <Text style={s.label}>Enable Notifications</Text>
            <Switch value={notify} onValueChange={setNotify} />
          </View>
        </Card>

        <Text style={s.section}>Integrations & Data</Text>
        <Card style={{ paddingVertical: 4 }}>
          <LinkRow label="Connect to Google Fit" onPress={() => {}} />
          <LinkRow label="Export Data" onPress={() => {}} />
        </Card>

        <View style={{ marginTop: spacing(3) }}>
          <Button title="Log out" onPress={onLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}
function LinkRow({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[s.row, { paddingVertical: 12 }]}>
        <Text style={s.label}>{label}</Text>
        <Text style={{ color: colors.textMuted }}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2), paddingBottom: spacing(2) },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(1) },
  hTitle: { color: colors.text, fontWeight: "700", fontSize: 20 },
  name: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 8 },
  tiny: { color: colors.textMuted, marginTop: 4 },
  section: { color: colors.text, fontWeight: "800", marginTop: spacing(2), marginBottom: spacing(1) },
  label: { color: colors.textMuted, fontWeight: "600" },
  value: { color: colors.text, fontWeight: "700" },
  inputLike: { marginTop: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, height: 44, justifyContent: "center" },
  inputText: { color: colors.text },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 },
  segmentWrap: { backgroundColor: colors.surface, borderRadius: 999, flexDirection: "row", padding: 4, gap: 6, marginTop: 8, marginBottom: 12 },
  segmentBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999 },
  segmentActive: { backgroundColor: colors.card },
  segmentTxt: { color: colors.textMuted, fontWeight: "600" },
  segmentTxtActive: { color: colors.text },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
});
