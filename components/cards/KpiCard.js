// components/cards/KpiCard.js
import { View, Text, StyleSheet } from "react-native";
import Card from "../Card";
import { colors, spacing } from "../../lib/theme";

export default function KpiCard({
  title = "Steps",
  value = "8,234",
  goal = "10,000",
  progress = 0.82,     // 0..1
  badge = "82%",
  icon = "👟",
  accent = colors.info,
  style,
}) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <Card style={[s.card, style]}>
      <View style={s.row}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Text style={s.icon}>{icon}</Text>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
        </View>
        <View style={s.badgeWrap}><Text style={[s.badge, { color: accent }]}>{badge}</Text></View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 6 }}>
        <Text style={s.value}>{value}</Text>
      </View>

      <View style={s.progress}><View style={[s.bar, { width: `${pct * 100}%`, backgroundColor: accent }]} /></View>
      <Text style={s.goal}>Goal {goal}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { paddingVertical: spacing(1.25), minWidth: 0, minHeight: 124 }, // equal height
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  icon: { fontSize: 16 },
  value: { color: colors.text, fontSize: 22, fontWeight: "800" },
  badgeWrap: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  badge: { fontSize: 12, fontWeight: "700" },
  progress: { marginTop: 8, height: 6, backgroundColor: colors.surface, borderRadius: 999, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 999 },
  goal: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
});
