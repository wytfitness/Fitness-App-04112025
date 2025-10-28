// app/workout/recommended.js
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Card from "../../components/Card";
import { colors, spacing } from "../../lib/theme";

/* ---- Recommended workout catalog ---- */
const RECOMMENDED_PLANS = {
  yoga: {
    name: "Morning Yoga",
    durationMin: 30,
    kcal: 180,
    plan: [
      { id: "cat_cow",          name: "Cat–Cow",              sets: 2, reps: 10, weight_kg: null, group: "Mobility" },
      { id: "downward_dog",     name: "Downward Dog (hold)",  sets: 2, reps: 30, weight_kg: null, group: "Mobility" },
      { id: "child_pose",       name: "Child’s Pose (hold)",  sets: 2, reps: 30, weight_kg: null, group: "Mobility" },
      { id: "sun_salutation_a", name: "Sun Salutation A",     sets: 2, reps: 10, weight_kg: null, group: "Flow" },
      { id: "seated_forward",   name: "Seated Forward Fold",  sets: 2, reps: 30, weight_kg: null, group: "Stretch" },
    ],
  },
  hiit: {
    name: "HIIT Cardio",
    durationMin: 20,
    kcal: 280,
    plan: [
      { id: "jumping_jacks", name: "Jumping Jacks", sets: 4, reps: 30, weight_kg: null, group: "Cardio" },
      { id: "mountain_climbers", name: "Mountain Climbers", sets: 4, reps: 30, weight_kg: null, group: "Cardio" },
      { id: "burpees", name: "Burpees", sets: 4, reps: 12, weight_kg: null, group: "Cardio" },
      { id: "plank", name: "Plank (hold)", sets: 4, reps: 30, weight_kg: null, group: "Core" },
    ],
  },
};

const RECS = [
  { id: "yoga", title: RECOMMENDED_PLANS.yoga.name, durationMin: RECOMMENDED_PLANS.yoga.durationMin, kcal: RECOMMENDED_PLANS.yoga.kcal, badge: "New" },
  { id: "hiit", title: RECOMMENDED_PLANS.hiit.name, durationMin: RECOMMENDED_PLANS.hiit.durationMin, kcal: RECOMMENDED_PLANS.hiit.kcal },
];

const WORKOUT_IMAGES = {
  yoga: require("../../assets/workouts/yoga.jpeg"),
  // hiit: require("../../assets/workouts/hiit.jpg"),
};
const DEFAULT_WORKOUT_IMG = require("../../assets/workouts/default.jpg");

export default function RecommendedWorkouts() {
  const router = useRouter();

  const imgFor = (rec) => (WORKOUT_IMAGES[rec.id] || DEFAULT_WORKOUT_IMG);

  const startRecommended = (key) => {
    const cfg = RECOMMENDED_PLANS[key];
    if (!cfg) return;
    router.push({
      pathname: "/workout/review",
      params: { name: cfg.name, plan: encodeURIComponent(JSON.stringify(cfg.plan)) },
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Recommended Workouts</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing(3) }}>
        {RECS.map((r) => (
          <TouchableOpacity
            key={r.id}
            activeOpacity={0.9}
            onPress={() => startRecommended(r.id)}
            style={{ marginBottom: spacing(1) }}
          >
            <Card style={s.card}>
              <View style={s.imageWrap}>
                <Image source={imgFor(r)} style={s.image} />
                {r.badge ? (
                  <View style={s.badge}><Text style={s.badgeTxt}>{r.badge}</Text></View>
                ) : null}
              </View>

              <View style={s.meta}>
                <Text style={s.cardTitle} numberOfLines={1}>{r.title}</Text>
                <View style={s.row}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={s.metaTxt}>{r.durationMin} min</Text>
                  <Ionicons name="flame-outline" size={14} color={colors.textMuted} />
                  <Text style={s.metaTxt}>{r.kcal} kcal</Text>
                </View>
                <View style={s.startRow}>
                  <Text style={s.startHint}>Tap to start</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2) },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: spacing(1), marginBottom: spacing(1) },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontWeight: "800", fontSize: 18 },

  card: { overflow: "hidden", padding: 0 },
  imageWrap: { width: "100%", height: 140, backgroundColor: colors.surface },
  image: { width: "100%", height: "100%" },
  badge: { position: "absolute", right: 8, top: 8, backgroundColor: colors.newBadgeBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { color: colors.newBadgeText, fontSize: 10, fontWeight: "700" },

  meta: { padding: 12 },
  cardTitle: { color: colors.text, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  metaTxt: { color: colors.textMuted, marginRight: 10 },

  startRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  startHint: { color: colors.textMuted, fontWeight: "700" },
});
