// app/workout/active.js
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../lib/theme";
import { api } from "../../lib/api"; // guarded (optional)

/* ---------------- helpers ---------------- */
function parsePlan(p) {
  try {
    return JSON.parse(decodeURIComponent(p || "")) || [];
  } catch {
    return [];
  }
}
const pad = (n) => (n < 10 ? `0${n}` : String(n));

const WEIGHT_OPTIONS = [
  10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100,
];
const REP_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

/* ----------- Select (centered dialog) ----------- */
function Select({
  value,
  onChange,
  options,
  placeholder = "",
  format = (x) => String(x),
  title = "Select",
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const label = value == null ? placeholder : format(value);

  return (
    <>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[s.inputBtn, disabled && s.inputDisabled]}
      >
        <Text
          style={[s.inputBtnTxt, value == null && { color: colors.textMuted }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.dialog} onPress={() => {}}>
            <View style={s.dialogHeader}>
              <Text style={s.dialogTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(x, i) => String(x) + "_" + i}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    style={s.optionRow}
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <Text style={s.optionTxt}>{format(item)}</Text>
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.success}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: "100%" }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* ---------------- screen ---------------- */
export default function Active() {
  const router = useRouter();
  const { name, plan: planParam } = useLocalSearchParams();
  const plan = useMemo(() => parsePlan(planParam), [planParam]);

  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [latestWeightKg, setLatestWeightKg] = useState(null);

  // Expand the plan into concrete set rows
  const [setsState, setSetsState] = useState(() => {
    const rows = [];
    plan.forEach((p) => {
      const total = Number(p.sets) || 0;
      for (let i = 1; i <= total; i++) {
        rows.push({
          key: `${p.id}_${i}`,
          exercise: p.name,
          index: i,
          reps: p.reps ?? null,
          weight_kg: p.weight_kg ?? null,
          done: false,
        });
      }
    });
    return rows;
  });

  // simple timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(elapsed / 60),
    ss = elapsed % 60;

  // start a session
  useEffect(() => {
    (async () => {
      try {
        const res =
          (await api.startWorkout?.(name)) ??
          Promise.resolve({ id: `local_${Date.now()}` });
        setSessionId(res.id || res);
      } catch {
        setSessionId(`local_${Date.now()}`);
      }
    })();
  }, [name]);

  // try to get the latest weight (for kcal estimate)
  useEffect(() => {
    (async () => {
      try {
        const w = await api.latestWeight?.();
        const kg = Number(w?.weight_kg ?? w?.value_kg);
        if (Number.isFinite(kg)) setLatestWeightKg(kg);
      } catch {
        // ignore
      }
    })();
  }, []);

  const updateSet = (key, patch) => {
    setSetsState((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const logSet = async (row) => {
    if (!sessionId) return; // guard
    updateSet(row.key, { done: true });
    try {
      if (api.logSet) {
        await api.logSet({
          session_id: sessionId,
          exercise: row.exercise,
          set_index: row.index,
          reps: row.reps != null ? Number(row.reps) : null,
          weight_kg: row.weight_kg != null ? Number(row.weight_kg) : null,
        });
      }
    } catch {}
  };

  const addExercise = () => {
    router.push({
      pathname: "/workout/exercise-picker",
      params: {
        sessionId: String(sessionId || ""),
        mode: "append",
        seed: encodeURIComponent(JSON.stringify(plan)),
        backTo: "active",
        name: name || "Untitled Workout",
      },
    });
  };

  function estimateWorkoutKcal({
    elapsedSec,
    weightKg = 70,
    intensity = "moderate",
  }) {
    const MET = intensity === "vigorous" ? 6.0 : 3.5;
    const minutes = (elapsedSec || 0) / 60;
    return (MET * 3.5 * weightKg) / 200 * minutes; // kcal
  }

  const finish = async () => {
    const done = setsState.filter((s) => s.done);
    const volume = done.reduce(
      (v, s) => v + Number(s.weight_kg || 0) * Number(s.reps || 0),
      0
    );

    const weightKg = latestWeightKg ?? 70;
    const kcal = Math.round(
      estimateWorkoutKcal({ elapsedSec: elapsed, weightKg, intensity: "moderate" })
    );

    try {
      if (sessionId && api.finishWorkout) {
        await api.finishWorkout({
          session_id: sessionId,
          notes: name || null,
          calories_burned: kcal,
        });
      }
    } catch {}

    router.replace({
      pathname: "/workout/complete",
      params: {
        name: name || "Untitled Workout",
        duration: String(elapsed),
        sets: String(done.length),
        volume: String(Math.round(volume)),
        kcal: String(kcal),
      },
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.titleTop}>{name || "Untitled Workout"}</Text>
        </View>
        <Text style={s.timer}>
          {pad(mm)}:{pad(ss)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {plan.map((p) => {
          const total = Number(p.sets) || 0;
          return (
            <View key={p.id} style={s.block}>
              <View style={s.blockHead}>
                <Text style={s.blockTitle}>{p.name}</Text>
                <Text style={s.blockMeta}>{total} sets</Text>
              </View>

              {Array.from({ length: total }, (_, i) => {
                const k = `${p.id}_${i + 1}`;
                const row = setsState.find((r) => r.key === k);
                return (
                  <View key={k} style={s.setRow}>
                    <Text style={s.setLabel}>Set {i + 1}</Text>

                    <Select
                      title="Select Weight"
                      value={row?.weight_kg}
                      onChange={(v) => updateSet(k, { weight_kg: v })}
                      options={WEIGHT_OPTIONS}
                      placeholder="kg"
                      format={(v) => `${v} kg`}
                      disabled={row?.done}
                    />

                    <Select
                      title="Select Reps"
                      value={row?.reps}
                      onChange={(v) => updateSet(k, { reps: v })}
                      options={REP_OPTIONS}
                      placeholder="reps"
                      format={(v) => `${v}`}
                      disabled={row?.done}
                    />

                    <TouchableOpacity
                      onPress={() => logSet(row)}
                      disabled={row?.done}
                      style={[s.chkBtn, row?.done && s.chkDone]}
                    >
                      <Ionicons
                        name={row?.done ? "checkmark" : "checkmark-outline"}
                        size={18}
                        color={row?.done ? colors.success : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom actions */}
      <View style={s.footer}>
        <View style={s.footerRow}>
          <TouchableOpacity
            onPress={addExercise}
            style={s.addBtn}
            disabled={!sessionId}
          >
            <Ionicons name="add" size={18} color={colors.text} />
            <Text style={s.addTxt}>Add Exercise</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={finish} style={s.finishBtn}>
            <Text style={s.finishTxt}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  titleTop: { color: colors.text, fontSize: 22, fontWeight: "800" },
  timer: { color: colors.textMuted, fontWeight: "800" },

  block: {
    marginHorizontal: spacing(2),
    marginTop: spacing(1.25),
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  blockTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  blockMeta: { color: colors.textMuted, fontWeight: "700" },

  setRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  setLabel: { color: colors.textMuted, width: 46, fontWeight: "700" },

  // Select trigger
  inputBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputBtnTxt: { color: colors.text, fontWeight: "700" },
  inputDisabled: { opacity: 0.6 },

  chkBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chkDone: { backgroundColor: "#EAF7F0", borderColor: "#EAF7F0" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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
  footerRow: { flexDirection: "row", gap: 10 },
  addBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  addTxt: { color: colors.text, fontWeight: "800", fontSize: 14 },

  finishBtn: {
    flex: 1,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  finishTxt: { color: colors.onPrimary, fontWeight: "800", fontSize: 16 },

  /* Dialog styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing(1),
  },
  dialog: {
    width: "86%",
    maxWidth: 420,
    maxHeight: "70%",
    backgroundColor: colors.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dialogTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  optionRow: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionTxt: { color: colors.text, fontSize: 16, fontWeight: "600" },
});
