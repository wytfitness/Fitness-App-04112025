// components/charts/MacroRings.js
import Svg, { Circle } from "react-native-svg";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { colors, spacing } from "../../lib/theme";

function Ring({ size, stroke, pct, color }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, pct)) / 100 * c;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size/2} cy={size/2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size/2}
        cy={size/2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export default function MacroRings({
  kcal = 0, protein = 0, carbs = 0, fats = 0,
  remaining = 0,
  proteinPct = 0, carbsPct = 0, fatsPct = 0,
  editable = false,
  onChangeKcal = () => {}, onChangeProtein = () => {}, onChangeCarbs = () => {}, onChangeFats = () => {},
  showRemaining = false,
}) {
  return (
    <View style={s.wrap}>
      {/* Rings */}
      <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center" }}>
        <View style={s.abs}><Ring size={160} stroke={12} pct={Math.min(100, kcal ? 80 : 0)}  color={colors.orange} /></View>
        <View style={s.abs}><Ring size={132} stroke={11} pct={proteinPct} color={colors.info}    /></View>
        <View style={s.abs}><Ring size={108} stroke={10} pct={carbsPct}   color={colors.success} /></View>
        <View style={s.abs}><Ring size={86}  stroke={9}  pct={fatsPct}    color={colors.purple}  /></View>

        <View style={s.center}>
          <Text style={s.kcal}>{kcal}</Text>
          <Text style={s.kcalUnit}>kcal</Text>
        </View>
      </View>

      {/* 2×2 equal-width grid (no gap API; use margins) */}
      <View style={s.pillGrid}>
        <InputPill containerStyle={s.pillCell} editable={editable} dotColor={colors.orange} label="Cal"     value={String(kcal)}    onChangeText={onChangeKcal}     suffix=""  />
        <InputPill containerStyle={s.pillCell} editable={editable} dotColor={colors.info}   label="Protein" value={String(protein)} onChangeText={onChangeProtein} suffix="g" />
        <InputPill containerStyle={s.pillCell} editable={editable} dotColor={colors.success} label="Carbs"  value={String(carbs)}   onChangeText={onChangeCarbs}   suffix="g" />
        <InputPill containerStyle={s.pillCell} editable={editable} dotColor={colors.purple} label="Fats"    value={String(fats)}    onChangeText={onChangeFats}    suffix="g" />
      </View>

      {showRemaining ? <Text style={s.remaining}>{remaining} kcal remaining</Text> : null}
    </View>
  );
}

function InputPill({ containerStyle, editable, dotColor, label, value, onChangeText, suffix }) {
  return (
    <View style={[s.pill, containerStyle]}>
      <View style={[s.dot, { backgroundColor: dotColor }]} />
      <Text style={s.pillLabel} numberOfLines={1}>{label}</Text>
      {editable ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          inputMode="numeric"
          style={s.pillInput}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
      ) : (
        <Text style={s.pillValue}>{value}</Text>
      )}
      {suffix ? <Text style={s.pillSuffix}>{suffix}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center" },
  abs: { position: "absolute" },
  center: { position: "absolute", alignItems: "center" },
  kcal: { fontSize: 28, fontWeight: "800", color: colors.text },
  kcalUnit: { color: colors.textMuted },
  remaining: { marginTop: 6, color: colors.textMuted },

  // grid wrapper
  pillGrid: {
    width: "100%",
    paddingHorizontal: spacing(1),
    marginTop: spacing(1),
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  // each cell gets the same width
  pillCell: {
    width: "48%",
    marginBottom: spacing(1),
  },

  pill: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  dot: { width: 8, height: 8, borderRadius: 8, marginRight: 6 },
  pillLabel: { color: colors.textMuted, fontSize: 12, marginRight: 4, flexShrink: 1 },
  pillValue: { color: colors.text, fontWeight: "700" },
  pillInput: {
    minWidth: 40,
    paddingVertical: 2,
    paddingHorizontal: 4,
    color: colors.text,
    fontWeight: "700",
    textAlign: "center",
  },
  pillSuffix: { color: colors.textMuted, marginLeft: 4 },
});
