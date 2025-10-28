// app/settings/index.js  — visual redesign only
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from "react-native";
import { colors, spacing } from "../../lib/theme";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../stores/auth";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getGoals } from "../../lib/goals";

const nf = new Intl.NumberFormat();

export default function Settings() {
  const router = useRouter();
  const user = useAuth((s) => s.user) || {
    email: "ethan.carter@example.com",
    name: "Ethan Carter",
    gender: "—",
  };
  const signOut = useAuth((s) => s.signOut);

  const [metric, setMetric] = useState(true);
  const [notify, setNotify] = useState(true);
  const [goals, setGoals] = useState(null);

  const loadGoals = useCallback(async () => {
    try {
      const g = await getGoals();
      setGoals(g);
    } catch (e) {
      console.warn("Settings: getGoals failed", e?.message || e);
    }
  }, []);

  useEffect(() => { loadGoals(); }, [loadGoals]);
  useFocusEffect(useCallback(() => { loadGoals(); }, [loadGoals]));

  const kcal = goals?.calories ?? 2000;
  const macros = `${goals?.carbs_pct ?? 40}c / ${goals?.protein_pct ?? 30}p / ${goals?.fat_pct ?? 30}f`;
  const weightVal = goals?.weight ?? 75;
  const waterCups = goals?.water_cups ?? 12;
  const waterL = (waterCups * 0.25).toFixed(1);

  // purely visual progress for the Settings preview (doesn't touch API logic)
  const progress = useMemo(() => ({
    calories: Math.min(kcal / 3000, 1),   // relative to a common 3000 target for visualization
    macros: 0.75,                         // neutral visual fill
    weight: Math.min(weightVal / 100, 1), // relative to 100kg for visualization
    water: Math.min(waterCups / 12, 1),   // 12 glasses default
  }), [kcal, weightVal, waterCups]);

  function onLogout() {
    // identical behavior as before
    // (uses signOut + router.replace)
    import("react-native").then(({ Alert }) => {
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
    });
  }

  return (
    <SafeAreaView style={s.wrap} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(4) }}>
        {/* HEADER • Avatar + Name */}
        <View style={{ alignItems: "center", marginBottom: spacing(2), marginTop: spacing(6)}}>
          <InitialsAvatar name={user?.name} />
          <Text style={s.name}>{user?.name || "—"}</Text>
          <Text style={s.tiny}>Member</Text>
        </View>

        {/* ACCOUNT */}
        <Text style={s.section}>Account</Text>
        <Card style={s.accountCard}>
          <InputLikeRow label="Name" value={user?.name || "—"} />
          <InputLikeRow label="Email" value={user?.email || "—"} />
          <InputLikeRow label="Gender" value={user?.gender || "—"} />
        </Card>

        {/* GOALS */}
       <Text style={s.section}>Your Goals</Text>
        <View style={s.goalsOuter}>
          <Card style={s.goalsCard}>
            <GoalRow
              label="Calories"
              value={`${nf.format(kcal)} kcal`}
              pct={progress.calories}
            />

            <GoalRow
              label="Macros"
              value={macros}
              pct={progress.macros}
            />

            <GoalRow
              label="Weight"
              value={`${weightVal} kg`}
              pct={progress.weight}
            />

            <GoalRow
              label="Water"
              value={`${waterL} L`}
              pct={progress.water}
            />

            <View style={s.editWrap}>
              <Button
                title="Edit Goals"
                onPress={() => router.push("/settings/edit-goals")}
                style={s.editBtn}
                textStyle={s.editBtnText}
              />
            </View>
          </Card>
        </View>


        {/* PREFERENCES */}
        <Text style={s.section}>Preferences</Text>
        <Card>
          <View style={s.toggleRow}>
            <Text style={s.label}>Enable Notifications</Text>
            <Switch value={notify} onValueChange={setNotify} />
          </View>

          <Text style={[s.label, { marginTop: spacing(1) }]}>Units</Text>
          <View style={s.segmentWrap}>
            <SegmentButton label="Metric" active={metric} onPress={() => setMetric(true)} />
            <SegmentButton label="Imperial" active={!metric} onPress={() => setMetric(false)} />
          </View>
        </Card>

        {/* IMPORT / INTEGRATIONS */}
        <Text style={s.section}>Import Data</Text>
        <Card style={{ paddingVertical: 6 }}>
          <LinkRow label="Connect with Google Fit" onPress={() => {}} />
        </Card>

        {/* LOG OUT */}
        <View style={s.logoutWrap}>
          <Button title="Log Out" onPress={onLogout} style={s.logoutBtn} textStyle={s.logoutText} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- tiny UI helpers (visual only) ---------- */

function InitialsAvatar({ name }) {
  const initials = useMemo(() => {
    const parts = (name || "").trim().split(/\s+/);
    return (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
  }, [name]);
  return (
    <View style={s.avatar}>
      <Text style={{ color: colors.text, fontWeight: "800" }}>{initials}</Text>
    </View>
  );
}

function InputLikeRow({ label, value }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputLike}><Text style={s.inputText}>{value}</Text></View>
    </View>
  );
}

function GoalRow({ label, value, pct = 0, tint }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={s.row}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.value}>{value}</Text>
      </View>
      <ProgressBar percent={pct} tint={tint} />
    </View>
  );
}

function ProgressBar({ percent = 0 }) {
  return (
    <View style={s.track}>
      <View
        style={[
          s.fill,
          {
            width: `${Math.max(0, Math.min(1, percent)) * 100}%`,
          },
        ]}
      />
    </View>
  );
}

function SegmentButton({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.segmentBtn, active && s.segmentActive]}>
      <Text style={[s.segmentTxt, active && s.segmentTxtActive]}>{label}</Text>
    </TouchableOpacity>
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

/* ---------- styles ---------- */

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(2),
  },

  // profile header
  name: {
    color: colors.text,
    fontSize: 20,          // was 22 → smaller
    fontWeight: "800",
    marginTop: 8,
  },

  tiny: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 13,          // subtle subtext
  },

  // section titles ("Account", "Preferences", etc.)
  section: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,          // was 18 → smaller
    marginTop: spacing(6),
    marginBottom: spacing(1),
  },

  // labels in rows ("Email", "Gender", etc.)
  label: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 15,          // was 16 → smaller
  },

  // values in rows ("ethan.carter@...", etc.)
  value: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,          // was 16 → smaller
  },

  // input-like box for account info
 inputLike: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
  },
  inputText: {
    color: colors.text,
    fontSize: 15,          // was 16
  },

  // avatar circle
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // row layouts
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // unit toggle segment (Metric / Imperial)
  segmentWrap: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    flexDirection: "row",
    padding: 4,
    gap: 6,
    marginTop: 8,
  },

  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 999,
  },

  segmentActive: {
    backgroundColor: colors.card,
  },

  segmentTxt: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 14,          // was 15
  },

  segmentTxtActive: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,          // was 15
  },

  // progress bars in "Your Goals"
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E6F7F5",   // very light aqua (from your successSoft family)
    overflow: "hidden",
  },

  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#5CC9C2",   // minty aqua blue, friendly and health-like
  },

  // goals card shell
  goalsOuter: {
    alignSelf: "center",
    width: "90%",
  },

  goalsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    borderWidth: 0,
    shadowColor: "rgba(0,0,0,0.08)",
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: spacing(0.75),
  },

  // "Edit Goals" under the card
  editWrap: {
    alignItems: "center",
    marginTop: spacing(1),
  },

  editBtn: {
    minWidth: 110,         // was 120
    paddingVertical: 9,    // was 10
    borderRadius: 10,
    backgroundColor: colors.success,
  },

  editBtnText: {
    fontSize: 15,          // was 16
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },

  // logout block
  logoutWrap: {
    marginTop: spacing(6),
    alignItems: "center",
  },

  logoutBtn: {
    width: 150,            // was 160
    borderRadius: 10,
    paddingVertical: 9,    // was 10
    backgroundColor: colors.danger ?? colors.primary,
  },

  logoutText: {
    fontSize: 15,          // was 16
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },

  accountCard: {
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 16,

    // kill the outer border
    borderWidth: 0,
    borderColor: "transparent",

    // keep soft depth so it doesn't look stuck to bg
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
  },
});
