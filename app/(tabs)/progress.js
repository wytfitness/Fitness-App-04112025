import { View, Text } from "react-native";
import { colors } from "../../lib/theme";
export default function Progress() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Text style={{ color: "#fff", margin: 16 }}>Progress (coming soon)</Text>
    </View>
  );
}
