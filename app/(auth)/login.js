import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Link, useRouter } from "expo-router";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { colors, spacing } from "../../lib/theme";
import { useAuth } from "../../stores/auth";

export default function Login() {
  const { signIn, error: authError } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null); // <-- no <string | null>

  const onLogin = async () => {
    setLocalError(null);
    if (!email || !password) {
      setLocalError("Email and password required");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setLocalError(error.message ?? String(error));
        return;
      }
      // Jump to tabs immediately on success
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const errorMsg = localError || authError;

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding" })}
      style={s.wrap}
    >
      <View style={{ flex: 1 }} />

      <Text style={s.title}>Welcome back</Text>
      <Text style={s.sub}>Log in to continue your progress</Text>

      <Input
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={{ alignSelf: "flex-end", marginBottom: spacing(2) }}>
        <Text style={{ color: colors.primary }}>Forgot password?</Text>
      </TouchableOpacity>

      <Button
        title={loading ? "Signing in…" : "Login"}
        onPress={onLogin}
        disabled={loading || !email || !password}
      />

      {loading ? <ActivityIndicator style={{ marginTop: spacing(1) }} /> : null}
      {errorMsg ? (
        <Text style={{ color: colors.danger, marginTop: spacing(1) }}>
          {String(errorMsg)}
        </Text>
      ) : null}

      <View style={{ flex: 1 }} />
      <Text style={s.footer}>
        New here?{" "}
        <Link href="/(auth)/signup" style={{ color: colors.primary }}>
          Create account
        </Link>
      </Text>
      <View style={{ height: spacing(2) }} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: spacing(2), backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", textAlign: "center" },
  sub: { color: colors.textMuted, textAlign: "center", marginBottom: spacing(2) },
  footer: { color: colors.textMuted, textAlign: "center" },
});
