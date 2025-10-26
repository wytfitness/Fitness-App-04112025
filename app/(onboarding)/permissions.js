import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import Button from "../../components/Button";
import Card from "../../components/Card";
import HeaderBar from "../../components/HeaderBar";

const Bullet = ({ title, desc }) => (
  <Card style={{ marginBottom: spacing(1.25), padding: 12 }}>
    <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 2 }}>{title}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{desc}</Text>
  </Card>
);

export default function Permissions() {
  const router = useRouter();

  return (
    <View style={s.wrap}>
      <HeaderBar title="Permissions" />
      <Text style={s.h1}>Allow access to your health data</Text>
      <Text style={s.p}>We use your activity and metrics to keep your dashboard accurate.</Text>

      <Bullet title="Activity" desc="Track steps, workouts, and calories burned." />
      <Bullet title="Weight" desc="Read weight to show trends and progress." />
      <Bullet title="Nutrition" desc="Enhance food logs and daily insights." />

      <View style={{ flexDirection: "row", gap: spacing(1.25), marginTop: spacing(2) }}>
        <Button title="Don’t Allow" variant="ghost" onPress={() => router.push("/(onboarding)/goals")} />
        <Button title="Allow" onPress={() => router.push("/(onboarding)/goals")} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: spacing(2), backgroundColor: colors.bg },
  h1: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 6, marginTop: spacing(1) },
  p: { color: colors.textMuted, marginBottom: spacing(2) },
});
