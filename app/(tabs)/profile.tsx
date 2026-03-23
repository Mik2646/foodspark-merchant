import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Switch, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const utils = trpc.useUtils();

  const { data: restaurant, isLoading } = trpc.merchant.getMyRestaurant.useQuery();

  const [form, setForm] = useState({
    name: "", deliveryFee: "", minOrder: "", deliveryTime: "",
    isPromo: false, promoText: "",
  });

  const updateMutation = trpc.merchant.updateRestaurant.useMutation({
    onSuccess: () => {
      utils.merchant.getMyRestaurant.invalidate();
      setEditing(false);
      Alert.alert("บันทึกแล้ว", "อัพเดตข้อมูลร้านค้าเรียบร้อย");
    },
    onError: (e) => Alert.alert("ผิดพลาด", e.message),
  });

  const startEdit = () => {
    if (!restaurant) return;
    setForm({
      name: restaurant.name,
      deliveryFee: String(restaurant.deliveryFee),
      minOrder: String(restaurant.minOrder),
      deliveryTime: restaurant.deliveryTime,
      isPromo: restaurant.isPromo,
      promoText: restaurant.promoText ?? "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    if (!restaurant) return;
    const deliveryFee = parseInt(form.deliveryFee);
    const minOrder = parseInt(form.minOrder);
    if (isNaN(deliveryFee) || isNaN(minOrder)) {
      return Alert.alert("กรุณากรอกตัวเลขให้ถูกต้อง");
    }
    updateMutation.mutate({
      id: restaurant.id,
      name: form.name.trim(),
      deliveryFee,
      minOrder,
      deliveryTime: form.deliveryTime.trim(),
      isPromo: form.isPromo,
      promoText: form.promoText.trim() || undefined,
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await utils.merchant.getMyRestaurant.invalidate();
    setRefreshing(false);
  }, [utils]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
    >
      {/* User Info */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name ?? "M")[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name ?? "เจ้าของร้าน"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role === "admin" ? "Admin" : "Merchant"}</Text>
          </View>
        </View>
      </View>

      {/* Restaurant Card */}
      {!isLoading && !restaurant && (
        <View style={styles.noRestCard}>
          <Ionicons name="storefront-outline" size={48} color="#CCCCCC" />
          <Text style={styles.noRestTitle}>ยังไม่มีร้านค้า</Text>
          <Text style={styles.noRestSub}>ติดต่อ Admin เพื่อเชื่อมร้านค้ากับบัญชีของคุณ</Text>
        </View>
      )}

      {restaurant && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ข้อมูลร้านค้า</Text>
            {!editing && (
              <TouchableOpacity style={styles.editBtnHeader} onPress={startEdit}>
                <Text style={styles.editBtnHeaderText}>แก้ไข</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={styles.editForm}>
              <FieldInput label="ชื่อร้าน" value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} />
              <FieldInput label="ค่าส่ง (บาท)" value={form.deliveryFee} onChangeText={(v) => setForm(f => ({ ...f, deliveryFee: v }))} keyboardType="number-pad" />
              <FieldInput label="สั่งขั้นต่ำ (บาท)" value={form.minOrder} onChangeText={(v) => setForm(f => ({ ...f, minOrder: v }))} keyboardType="number-pad" />
              <FieldInput label="เวลาจัดส่ง (เช่น 20-30)" value={form.deliveryTime} onChangeText={(v) => setForm(f => ({ ...f, deliveryTime: v }))} />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>โปรโมชัน</Text>
                <Switch
                  value={form.isPromo}
                  onValueChange={(v) => setForm(f => ({ ...f, isPromo: v }))}
                  trackColor={{ false: "#E0E0E0", true: "#FFD0A8" }}
                  thumbColor={form.isPromo ? "#FF6B00" : "#FFFFFF"}
                />
              </View>
              {form.isPromo && (
                <FieldInput label="ข้อความโปรโมชัน" value={form.promoText} onChangeText={(v) => setForm(f => ({ ...f, promoText: v }))} placeholder="เช่น ส่งฟรี, ลด 20%" />
              )}
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, updateMutation.isPending && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={updateMutation.isPending}
                >
                  <Text style={styles.saveBtnText}>{updateMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoList}>
              <InfoRow label="ชื่อร้าน" value={restaurant.name} />
              <InfoRow label="ค่าส่ง" value={`฿${restaurant.deliveryFee}`} />
              <InfoRow label="สั่งขั้นต่ำ" value={`฿${restaurant.minOrder}`} />
              <InfoRow label="เวลาจัดส่ง" value={`${restaurant.deliveryTime} นาที`} />
              <InfoRow label="หมวดหมู่" value={restaurant.category} />
              <InfoRow label="คะแนน" value={`${restaurant.rating} ⭐ (${restaurant.reviewCount} รีวิว)`} />
              <InfoRow label="โปรโมชัน" value={restaurant.isPromo ? (restaurant.promoText ?? "มี") : "ไม่มี"} />
            </View>
          )}
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => Alert.alert("ออกจากระบบ", "ต้องการออกจากระบบ?", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ออก", style: "destructive", onPress: logout },
      ])}>
        <Text style={styles.logoutText}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

function FieldInput({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#555555", marginBottom: 6 }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: "#FFF8F0", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1A1A1A", borderWidth: 1.5, borderColor: "#F0E8E0" }}
        placeholderTextColor="#AAAAAA"
        {...props}
      />
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  label: { fontSize: 14, color: "#8A8A8A" },
  value: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", maxWidth: "60%", textAlign: "right" },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8F8" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  userCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "bold", color: "#FFFFFF" },
  userName: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A" },
  userEmail: { fontSize: 13, color: "#8A8A8A", marginTop: 2 },
  roleBadge: { marginTop: 6, alignSelf: "flex-start", backgroundColor: "#FFF3E8", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: "700", color: "#FF6B00" },
  noRestCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 32, alignItems: "center", gap: 8, marginBottom: 16 },
  noRestTitle: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A" },
  noRestSub: { fontSize: 13, color: "#8A8A8A", textAlign: "center", lineHeight: 20 },
  section: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A" },
  editBtnHeader: { backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnHeaderText: { fontSize: 13, fontWeight: "600", color: "#2563EB" },
  infoList: {},
  editForm: {},
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  switchLabel: { fontSize: 13, fontWeight: "600", color: "#555555" },
  editActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F5F5F5", borderRadius: 100, paddingVertical: 13, alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#555555" },
  saveBtn: { flex: 1, backgroundColor: "#FF6B00", borderRadius: 100, paddingVertical: 13, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: "bold", color: "#FFFFFF" },
  logoutBtn: {
    backgroundColor: "#FEF2F2", borderRadius: 14, padding: 16, alignItems: "center",
    borderWidth: 1, borderColor: "#FFC4C4",
  },
  logoutText: { fontSize: 15, fontWeight: "bold", color: "#DC2626" },
});
