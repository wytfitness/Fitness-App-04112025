// app/workout/exercise-picker.js
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../lib/theme";
import { api } from "../../lib/api"; // live API

// Fallback seed (shown only if API isn't available/empty)
const FALLBACK = [
  { id: "back_squat",   name: "Back Squat",      muscles: "Quads • Glutes",           equipment: "Barbell",          group: "Legs" },
  { id: "bench_press",  name: "Bench Press",     muscles: "Chest • Triceps",          equipment: "Barbell",          group: "Chest" },
  { id: "lat_pulldown", name: "Lat Pulldown",    muscles: "Lats • Biceps",            equipment: "Cable",            group: "Back" },
  { id: "oh_press",     name: "Overhead Press",  muscles: "Shoulders • Triceps",      equipment: "Barbell",          group: "Shoulders" },
  { id: "db_row",       name: "Dumbbell Row",    muscles: "Back • Biceps",            equipment: "Dumbbell",         group: "Back" },
  { id: "push_up",      name: "Push-up",         muscles: "Chest • Triceps",          equipment: "Bodyweight",       group: "Chest" },
];

// Join arrays like ['Quads','Glutes'] -> "Quads • Glutes"
const dotJoin = (x) =>
  Array.isArray(x) ? x.filter(Boolean).join(" • ") : (x || "");

export default function ExercisePicker() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);       // live list from API
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({}); // id -> { id, name, sets, reps, weight_kg, group }
  const debTimer = useRef(null);

  // Load from API (with debounce on search)
  useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        let rows = [];
        if (typeof api?.searchExercises === "function") {
          // server supports q & limit; you can extend to pass filters too
          const res = await api.searchExercises(q, 200);
          // normalize shape
          rows = (res?.items ?? res ?? []).map((r) => ({
            id: String(r.id ?? r.slug ?? r.name),
            name: r.name,
            muscles: dotJoin(r.muscles),
            equipment: dotJoin(r.equipment),
            group: r.category || r.group || "",
          }));
        }
        // Fallback if nothing came back
        setItems(rows.length ? rows : FALLBACK);
      } catch (e) {
        console.warn("exercise search failed:", e?.message || e);
        setItems(FALLBACK);
      } finally {
        setLoading(false);
      }
    }, q ? 250 : 0); // small debounce when typing
    return () => clearTimeout(debTimer.current);
  }, [q]);

  const toggle = (e) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[e.id]) delete next[e.id];
      else next[e.id] = { id: e.id, name: e.name, group: e.group, sets: 3, reps: 10, weight_kg: null };
      return next;
    });
  };

  const goReview = () => {
    const plan = Object.values(selected);
    if (!plan.length) return;
    router.push({ pathname: "/workout/review", params: { plan: encodeURIComponent(JSON.stringify(plan)) } });
  };

  const clear = () => setSelected({});

  const renderItem = ({ item }) => {
    const picked = !!selected[item.id];
    return (
      <View style={s.rowCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>{item.name}</Text>
          <Text style={s.rowSub}>{item.muscles || item.group}</Text>
        </View>
        <TouchableOpacity onPress={() => toggle(item)} style={[s.addBtn, picked && s.added]}>
          <Text style={[s.addTxt, picked && { color: colors.onPrimary }]}>{picked ? "Added" : "Add"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const cnt = useMemo(() => Object.keys(selected).length, [selected]);

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.h1}>Add Exercises</Text>
      </View>

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
        <View style={{ paddingTop: 24, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      {/* Sticky footer */}
      <View style={s.footer}>
        <TouchableOpacity onPress={clear}>
          <Text style={s.clear}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={cnt === 0}
          onPress={goReview}
          style={[s.cta, cnt === 0 && { opacity: 0.5 }]}
        >
          <Text style={s.ctaTxt}>Selected {cnt} • Start Workout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2) },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing(1) },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  h1: { color: colors.text, fontSize: 20, fontWeight: "800" },

  searchWrap: {
    marginTop: spacing(1),
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, height: 40,
    borderWidth: 1, borderColor: colors.border,
  },
  search: { flex: 1, color: colors.text, paddingVertical: 0 },

  rowCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  rowTitle: { color: colors.text, fontWeight: "800" },
  rowSub: { color: colors.textMuted, marginTop: 2 },

  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  added: { backgroundColor: colors.primary, borderColor: colors.primary },
  addTxt: { color: colors.text, fontWeight: "700" },

  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing(2), paddingTop: 10, paddingBottom: 20,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: -2 }, elevation: 10,
    flexDirection: "row", alignItems: "center", gap: spacing(1),
  },
  clear: { color: colors.textMuted, fontWeight: "700" },
  cta: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", paddingVertical: 12 },
  ctaTxt: { color: colors.onPrimary, fontWeight: "800" },
});
