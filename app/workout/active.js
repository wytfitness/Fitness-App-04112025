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
import { g } from "../../lib/global";
import { api } from "../../lib/api";

/* ---------------- helpers ---------------- */
function parsePlan(p) {
  try {
    return JSON.parse(decodeURIComponent(p || "")) || [];
  } catch {
    return [];
  }
}
const pad = (n) => (n < 10 ? `0${n}` : String(n));

const WEIGHT_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100];
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
                      <Ionicons name="checkmark" size={18} color={colors.success} />
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

  // expand plan -> rows
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

  // timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;

  // start session
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

  // latest weight
  useEffect(() => {
    (async () => {
      try {
        const w = await api.latestWeight?.();
        const kg = Number(w?.weight_kg ?? w?.value_kg);
        if (Number.isFinite(kg)) setLatestWeightKg(kg);
      } catch {}
    })();
  }, []);

  const updateSet = (key, patch) => {
    setSetsState((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const logSet = async (row) => {
    if (!sessionId) return;
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

  function estimateWorkoutKcal({ elapsedSec, weightKg = 70, intensity = "moderate" }) {
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
        plan: encodeURIComponent(JSON.stringify(plan)),
      },
    });
  };

  // progress values
  const totalSets = setsState.length;
  const doneSets = setsState.filter((x) => x.done).length;
  const pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      {/* Top bar */}
      <View style={[s.topBar, g.px2]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={g.h1}>{name || "Morning Workout"}</Text>
        </View>

        <View style={g.chip}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontWeight: "800" }}>
            {pad(mm)}:{pad(ss)}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={[g.px2, s.progressWrap]}>
        <View style={s.progressHead}>
          <Text style={[g.muted, { fontWeight: "700" }]}>Progress</Text>
          <Text style={[g.muted, { fontWeight: "800" }]}>
            {doneSets}/{totalSets} sets
          </Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${pct}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {plan.map((p) => {
          const total = Number(p.sets) || 0;
          const doneForThis = setsState.filter(
            (r) => r.exercise === p.name && r.done
          ).length;

          return (
            <View
              key={p.id}
              style={[
                g.card,
                g.shadowLg,
                { marginHorizontal: spacing(2), marginTop: spacing(1.25) },
              ]}
            >
              {/* dark header */}
              <View style={g.cardHeaderDark}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="barbell" size={16} color={colors.onHeaderDark} />
                  <View>
                    <Text style={{ color: colors.onHeaderDark, fontWeight: "800" }}>
                      {p.name}
                    </Text>
                    <Text
                      style={{
                        color: colors.onHeaderDarkMuted,
                        fontWeight: "700",
                      }}
                    >
                      {total} sets
                    </Text>
                  </View>
                </View>

                <View style={s.headerBadge}>
                  <Text style={s.headerBadgeTxt}>
                    {doneForThis}/{total}
                  </Text>
                </View>
              </View>

              <View style={{ padding: 14 }}>
                {Array.from({ length: total }, (_, i) => {
                  const k = `${p.id}_${i + 1}`;
                  const row = setsState.find((r) => r.key === k);
                  const disabled = row?.done;

                  return (
                    <View key={k} style={s.setRow}>
                      <View style={s.setIndex}>
                        <Text style={s.setIndexTxt}>{i + 1}</Text>
                      </View>

                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={s.smallLabel}>Weight</Text>
                        <Select
                          title="Select Weight"
                          value={row?.weight_kg}
                          onChange={(v) => updateSet(k, { weight_kg: v })}
                          options={WEIGHT_OPTIONS}
                          placeholder="kg"
                          format={(v) => `${v} kg`}
                          disabled={disabled}
                        />
                      </View>

                      <View style={{ width: 92, marginLeft: 8 }}>
                        <Text style={s.smallLabel}>Reps</Text>
                        <Select
                          title="Select Reps"
                          value={row?.reps}
                          onChange={(v) => updateSet(k, { reps: v })}
                          options={REP_OPTIONS}
                          placeholder="reps"
                          format={(v) => `${v}`}
                          disabled={disabled}
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() => logSet(row)}
                        disabled={disabled}
                        style={[s.chkBtn, disabled && s.chkDone]}
                      >
                        <Ionicons
                          name={disabled ? "checkmark" : "checkmark-outline"}
                          size={18}
                          color={disabled ? colors.success : colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom actions */}
      <View style={s.footer}>
        <View style={s.footerRow}>
          <TouchableOpacity onPress={addExercise} style={s.addBtn} disabled={!sessionId}>
            <Ionicons name="add" size={18} color={colors.text} />
            <Text style={s.addTxt}>Add Exercise</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={finish} style={s.finishBtn}>
            <Text style={s.finishTxt}>Finish Workout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */
const s = StyleSheet.create({
  screen: { 
    flex: 1,
    backgroundColor: colors.bg, 
    paddingBottom: spacing(4) // or any value you want
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: spacing(1),
    marginBottom: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Progress */
  progressWrap: { marginTop: 4, marginBottom: 10 },
  progressHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },

  /* Exercise header badge */
  headerBadge: {
    height: 22,
    minWidth: 38,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: colors.overlayOnDark,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeTxt: {
    color: colors.onHeaderDark,
    fontWeight: "800",
    fontSize: 12,
  },

  /* Set row */
  setRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  setIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  setIndexTxt: { color: colors.text, fontWeight: "800", fontSize: 12 },

  smallLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },

  // Select trigger
  inputBtn: {
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputBtnTxt: { color: colors.text, fontWeight: "700" },
  inputDisabled: { opacity: 0.6 },

  // Check button
  chkBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 8,
  },
  chkDone: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },

  // Footer
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
