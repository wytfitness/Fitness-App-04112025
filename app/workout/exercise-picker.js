// app/workout/exercise-picker.js
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radius } from "../../lib/theme";
import { api } from "../../lib/api";

const FALLBACK = [
  { id: "back_squat", name: "Back Squat", muscles: "Quads • Glutes", equipment: "Barbell", group: "Legs" },
  { id: "bench_press", name: "Bench Press", muscles: "Chest • Triceps", equipment: "Barbell", group: "Chest" },
  { id: "lat_pulldown", name: "Lat Pulldown", muscles: "Lats • Biceps", equipment: "Cable", group: "Back" },
  { id: "oh_press", name: "Overhead Press", muscles: "Shoulders • Triceps", equipment: "Barbell", group: "Shoulders" },
  { id: "db_row", name: "Dumbbell Row", muscles: "Back • Biceps", equipment: "Dumbbell", group: "Back" },
  { id: "push_up", name: "Push-up", muscles: "Chest • Triceps", equipment: "Bodyweight", group: "Chest" },
];

const dotJoin = (x) => (Array.isArray(x) ? x.filter(Boolean).join(" • ") : (x || ""));

function parseSeed(seed) {
  try {
    const arr = JSON.parse(decodeURIComponent(seed || "")) || [];
    // normalize existing seed items to ensure sets/reps present
    return arr.map((e, i) => ({
      id: String(e.id ?? e.name ?? `ex_${i}`),
      name: e.name || `Exercise ${i + 1}`,
      group: e.group || "",
      sets: Number(e.sets ?? 3),
      reps: Number(e.reps ?? 10),
      weight_kg: e.weight_kg ?? null,
    }));
  } catch {
    return [];
  }
}

export default function ReadyToStart() {
  const router = useRouter();
  const { name: nameParam, seed, backTo } = useLocalSearchParams();

  const [workoutName, setWorkoutName] = useState(() => (nameParam ? String(nameParam) : "My Workout"));
  const [plan, setPlan] = useState(() => {
    const initial = parseSeed(seed);
    return initial.length ? initial : [{ id: "back_squat", name: "Back Squat", sets: 3, reps: 10, weight_kg: null, group: "Legs" }];
  });

  // ---- Add modal state (search + list) ----
  const [openAdd, setOpenAdd] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const debTimer = useRef(null);

  // search when modal open / query typed
  useEffect(() => {
    if (!openAdd) return;
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        let rows = [];
        if (typeof api?.searchExercises === "function") {
          const res = await api.searchExercises(q, 150);
          rows = (res?.items ?? res ?? []).map((r) => ({
            id: String(r.id ?? r.slug ?? r.name),
            name: r.name,
            muscles: dotJoin(r.muscles),
            equipment: dotJoin(r.equipment),
            group: r.category || r.group || "",
          }));
        }
        setItems(rows.length ? rows : FALLBACK);
      } catch (e) {
        console.warn("exercise search failed:", e?.message || e);
        setItems(FALLBACK);
      } finally {
        setLoading(false);
      }
    }, q ? 250 : 0);
    return () => clearTimeout(debTimer.current);
  }, [q, openAdd]);

  // ---- derived stats ----
  const totalExercises = plan.length;
  const totalSets = useMemo(() => plan.reduce((s, e) => s + (Number(e.sets) || 0), 0), [plan]);
  const estMinutes = useMemo(() => Math.max(5, Math.round(totalSets * 4.5)), [totalSets]); // ~4–5 min per set

  // ---- actions ----
  const addExercise = (row) => {
    setPlan((prev) => {
      if (prev.find((e) => e.id === row.id)) return prev;
      return [...prev, { id: row.id, name: row.name, group: row.group, sets: 3, reps: 10, weight_kg: null }];
    });
  };
  const removeExercise = (id) => setPlan((prev) => prev.filter((e) => e.id !== id));

  const startWorkout = () => {
    const encoded = encodeURIComponent(JSON.stringify(plan));
    router.push({
      pathname: "/workout/active",
      params: { name: workoutName, plan: encoded, from: "review" },
    });
  };

  const goBack = () => {
    if (backTo) router.back();
    else router.back();
  };

  // ---- renderers ----
  const renderExercise = ({ item, index }) => (
    <View style={s.exerciseCard}>
      <View style={s.numberChip}><Text style={s.numberChipTxt}>{index + 1}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.exerciseName}>{item.name}</Text>
        <Text style={s.exerciseMeta}>{item.sets} × {item.reps}</Text>
      </View>
      <TouchableOpacity onPress={() => removeExercise(item.id)} style={s.rowIconBtn}>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </View>
  );

  const renderAddItem = ({ item }) => {
    const exists = plan.some((e) => e.id === item.id);
    return (
      <View style={s.addRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.addTitle}>{item.name}</Text>
          <Text style={s.addSub}>{item.muscles || item.group}</Text>
        </View>
        <TouchableOpacity
          disabled={exists}
          onPress={() => addExercise(item)}
          style={[s.addBtn, exists && { opacity: 0.5 }]}
        >
          <Text style={s.addBtnTxt}>{exists ? "Added" : "Add"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      {/* Top bar */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.h1}>Ready to Start</Text>
      </View>

      <FlatList
        data={plan}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderExercise}
        ListHeaderComponent={
          <View>
            {/* Workout name card */}
            <View style={s.nameCard}>
              <Text style={s.nameLabel}>Workout Name</Text>
              <View style={s.nameInputWrap}>
                <TextInput
                  value={workoutName}
                  onChangeText={setWorkoutName}
                  placeholder="Enter workout name"
                  placeholderTextColor={colors.textMuted}
                  style={s.nameInput}
                />
                <Ionicons name="pencil" size={16} color={colors.textMuted} />
              </View>
            </View>

            {/* Section header */}
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Exercises ({totalExercises})</Text>
              <TouchableOpacity onPress={() => setOpenAdd(true)} style={s.linkRow}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={s.linkText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Text style={{ color: colors.textMuted, fontWeight: "700" }}>
              No exercises yet. Tap <Text style={{ color: colors.primary }}>Add</Text> to include one.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View>
            {/* Stats tiles */}
            <View style={s.tilesRow}>
              <View style={s.tile}>
                <View style={s.tileIcon}>
                  <Ionicons name="barbell" size={16} color={colors.progress.lineDeep} />
                </View>
                <Text style={s.tileValue}>{totalExercises}</Text>
                <Text style={s.tileLabel}>Exercises</Text>
              </View>

              <View style={s.tile}>
                <View style={s.tileIcon}>
                  <Ionicons name="analytics-outline" size={16} color={colors.progress.lineDeep} />
                </View>
                <Text style={s.tileValue}>{totalSets}</Text>
                <Text style={s.tileLabel}>Total Sets</Text>
              </View>

              <View style={s.tile}>
                <View style={s.tileIcon}>
                  <Ionicons name="time-outline" size={16} color={colors.progress.lineDeep} />
                </View>
                <Text style={s.tileValue}>~{estMinutes}</Text>
                <Text style={s.tileLabel}>Est. Min</Text>
              </View>
            </View>

            {/* Quick tip */}
            <View style={s.tipCard}>
              <View style={s.tipIcon}>
                <Ionicons name="bulb" size={18} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tipTitle}>Quick Tip</Text>
                <Text style={s.tipText}>
                  Remember to warm up for 5–10 minutes before starting your workout.
                </Text>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing(2), paddingBottom: 140, paddingTop: spacing(1) }}
      />

      {/* Sticky Start button */}
      <View style={s.footer}>
        <TouchableOpacity style={s.ctaWrap} onPress={startWorkout} activeOpacity={0.95}>
          <LinearGradient
            colors={colors.progress.tabGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.cta}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={s.ctaTxt}>Start Workout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Add Modal */}
      <Modal visible={openAdd} transparent animationType="fade" onRequestClose={() => setOpenAdd(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setOpenAdd(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setOpenAdd(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                placeholder="Search exercises..."
                placeholderTextColor={colors.textMuted}
                style={s.search}
                value={q}
                onChangeText={setQ}
                returnKeyType="search"
              />
            </View>

            {loading ? (
              <View style={{ paddingTop: 16, alignItems: "center" }}>
                <ActivityIndicator />
              </View>
            ) : null}

            <FlatList
              data={items}
              keyExtractor={(it) => String(it.id)}
              renderItem={renderAddItem}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              contentContainerStyle={{ paddingBottom: 16, paddingTop: 8 }}
              style={{ maxHeight: "70%" }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  /* Top */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    marginBottom: 6,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  h1: { color: colors.text, fontSize: 18, fontWeight: "800" },

  /* Workout name card */
  nameCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  nameLabel: { color: colors.textMuted, fontWeight: "700", marginBottom: 8 },
  nameInputWrap: {
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nameInput: { flex: 1, color: colors.text, paddingVertical: 0, fontWeight: "700" },

  /* Section head */
  sectionHead: {
    paddingHorizontal: spacing(0),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { color: colors.text, fontWeight: "800" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { color: colors.primary, fontWeight: "800" },

  /* Exercise row card */
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  numberChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.progress.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  numberChipTxt: { color: colors.progress.lineDeep, fontWeight: "800", fontSize: 12 },
  exerciseName: { color: colors.text, fontWeight: "800" },
  exerciseMeta: { color: colors.textMuted, marginTop: 2, fontWeight: "700" },
  rowIconBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    marginRight: 2,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },

  /* Tiles */
  tilesRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  tileIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.progress.iconBubble,
    alignItems: "center", justifyContent: "center",
  },
  tileValue: { color: colors.text, fontWeight: "800" },
  tileLabel: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },

  /* Tip card */
  tipCard: {
    marginTop: 12,
    backgroundColor: colors.infoSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  tipIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  tipTitle: { color: colors.text, fontWeight: "800", marginBottom: 2 },
  tipText: { color: colors.textMuted, fontWeight: "600" },

  /* Footer CTA */
  footer: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing(2),
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  ctaWrap: { borderRadius: radius.md, overflow: "hidden" },
  cta: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },

  /* Add modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing(1),
  },
  modalCard: {
    width: "92%",
    maxWidth: 520,
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    maxHeight: "86%",
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },

  searchWrap: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: { flex: 1, color: colors.text, paddingVertical: 0 },

  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addTitle: { color: colors.text, fontWeight: "800" },
  addSub: { color: colors.textMuted, marginTop: 2 },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  addBtnTxt: { color: colors.text, fontWeight: "700" },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
