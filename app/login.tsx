import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("กรุณากรอกข้อมูล", "กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      router.replace("/(tabs)");
    } else {
      Alert.alert("เข้าสู่ระบบไม่สำเร็จ", result.error ?? "เกิดข้อผิดพลาด");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoBox}>
            <Ionicons name="restaurant" size={36} color="#FF6B00" />
          </View>
          <Text style={styles.appName}>FoodSpark</Text>
          <Text style={styles.appSub}>ระบบจัดการร้านค้า</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>เข้าสู่ระบบร้านค้า</Text>

          <View style={styles.field}>
            <Text style={styles.label}>อีเมล</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="อีเมลของร้านค้า"
              placeholderTextColor="#AAAAAA"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, styles.passInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="รหัสผ่าน"
                placeholderTextColor="#AAAAAA"
                secureTextEntry={!showPass}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Text style={styles.eyeText}>{showPass ? "ซ่อน" : "แสดง"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>สำหรับเจ้าของร้านค้าที่ได้รับสิทธิ์จาก FoodSpark เท่านั้น</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, paddingHorizontal: 24 },
  logoArea: { alignItems: "center", marginBottom: 40 },
  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "#FFF3E8", alignItems: "center", justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#FF6B00", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  appName: { fontSize: 28, fontWeight: "bold", color: "#FF6B00", letterSpacing: -0.5 },
  appSub: { fontSize: 14, color: "#8A8A8A", marginTop: 4 },
  form: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    borderWidth: 1, borderColor: "#F0E8E0",
  },
  formTitle: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A", marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#555555", marginBottom: 8 },
  input: {
    backgroundColor: "#FFF8F0", borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, color: "#1A1A1A",
    borderWidth: 1.5, borderColor: "#F0E8E0",
  },
  passRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  passInput: { flex: 1 },
  eyeBtn: { paddingHorizontal: 8, paddingVertical: 14 },
  eyeText: { fontSize: 13, color: "#FF6B00", fontWeight: "600" },
  loginBtn: {
    backgroundColor: "#FF6B00", borderRadius: 100, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
    shadowColor: "#FF6B00", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  hint: { fontSize: 12, color: "#AAAAAA", textAlign: "center", marginTop: 24, lineHeight: 18 },
});
