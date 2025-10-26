import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Card from "../Card";
import Button from "../Button";
import { colors, spacing } from "../../lib/theme";

export default function MealList({
  title = "Breakfast",
  items = [
    { id: "1", name: "Oatmeal", amount: "1 cup", kcal: 200 },
    { id: "2", name: "Milk", amount: "1 cup", kcal: 150 },
  ],
  onAdd,
  onItemPress,
  onSort,
}) {
  return (
    <Card style={{ padding: spacing(1) }}>
      {/* header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {onSort ? (
            <TouchableOpacity onPress={onSort}>
              <Text style={s.icon}>⟲</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity>
            <Text style={s.icon}>⎘</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* rows */}
      <View style={{ gap: 8 }}>
        {items.map((it) => (
          <TouchableOpacity key={it.id} onPress={() => onItemPress?.(it)}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{it.name}</Text>
                <Text style={s.sub}>{it.amount}</Text>
              </View>
              <View style={s.kcalChip}>
                <Text style={s.kcalTxt}>{it.kcal} kcal</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* footer button */}
      <View style={{ marginTop: spacing(1) }}>
        <Button title="＋  Add Food" onPress={onAdd} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing(1) },
  headerTitle: { color: colors.text, fontWeight: "800" },
  icon: { color: colors.textMuted, fontSize: 16, paddingHorizontal: 4 },

  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.card, borderRadius: 12,
    padding: spacing(1), borderWidth: 1, borderColor: colors.border,
  },
  name: { color: colors.text, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  kcalChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  kcalTxt: { color: colors.textMuted, fontWeight: "600", fontSize: 12 },
});
