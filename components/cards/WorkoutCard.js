import { View, Text, StyleSheet, Image } from "react-native";
import Card from "../Card";
import Button from "../Button";
import { colors, spacing } from "../../lib/theme";

export default function WorkoutCard({
  imageSrc,
  title = "Full Body Strength",
  meta = "45 min · 3 sets",
  onStart,
}) {
  return (
    <Card style={s.card}>
      {imageSrc ? <Image source={imageSrc} style={s.image} resizeMode="cover" /> : null}
      <View style={{ padding: spacing(1.25) }}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.meta}>{meta}</Text>
        <View style={{ marginTop: spacing(1) }}>
          <Button title="Start Workout" onPress={onStart} style={{ height: 44, alignSelf: "flex-start", paddingHorizontal: 18 }} />
        </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { overflow: "hidden", padding: 0 },
  image: { width: "100%", height: 140 },
  title: { color: colors.text, fontWeight: "800", fontSize: 18 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
});
