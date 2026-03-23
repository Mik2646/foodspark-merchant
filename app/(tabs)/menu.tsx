import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, RefreshControl, Switch, Image, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { trpc } from "@/lib/trpc";
import { API_BASE_URL, SESSION_TOKEN_KEY } from "@/constants/config";
import * as SecureStore from "expo-secure-store";

type FoodItem = {
  id: string; name: string; price: number;
  description?: string | null; imageUrl: string;
  category: string; isPopular: boolean;
};

type FormState = {
  name: string; price: string; description: string;
  imageUrl: string; category: string; isPopular: boolean;
};

const EMPTY_FORM: FormState = {
  name: "", price: "", description: "", imageUrl: "", category: "ยอดนิยม", isPopular: false,
};

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof window !== "undefined" ? localStorage.getItem(SESSION_TOKEN_KEY) : null;
    }
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch { return null; }
}

async function uploadImage(uri: string, mimeType: string): Promise<string> {
  // Convert URI to base64
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ base64, mimeType }),
      });
      if (!res.ok) reject(new Error("Upload failed"));
      const data = await res.json();
      resolve(data.url);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const utils = trpc.useUtils();

  const { data: items = [], isLoading } = trpc.merchant.listMenuItems.useQuery();
  const createItem = trpc.merchant.createMenuItem.useMutation({
    onSuccess: () => { utils.merchant.listMenuItems.invalidate(); closeModal(); },
    onError: (e) => Alert.alert("ผิดพลาด", e.message),
  });
  const updateItem = trpc.merchant.updateMenuItem.useMutation({
    onSuccess: () => { utils.merchant.listMenuItems.invalidate(); closeModal(); },
    onError: (e) => Alert.alert("ผิดพลาด", e.message),
  });
  const deleteItem = trpc.merchant.deleteMenuItem.useMutation({
    onSuccess: () => utils.merchant.listMenuItems.invalidate(),
    onError: (e) => Alert.alert("ผิดพลาด", e.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await utils.merchant.listMenuItems.invalidate();
    setRefreshing(false);
  }, [utils]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (item: FoodItem) => {
    setEditing(item);
    setForm({
      name: item.name, price: String(item.price),
      description: item.description ?? "", imageUrl: item.imageUrl,
      category: item.category, isPopular: item.isPopular,
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("ไม่ได้รับอนุญาต", "กรุณาอนุญาตให้เข้าถึงคลังภาพ");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const url = await uploadImage(asset.uri, asset.mimeType ?? "image/jpeg");
      setForm(f => ({ ...f, imageUrl: url }));
    } catch {
      Alert.alert("อัพโหลดไม่สำเร็จ", "กรุณาลองอีกครั้งหรือใส่ URL แทน");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) return Alert.alert("กรุณากรอกชื่อเมนู");
    const price = parseInt(form.price);
    if (isNaN(price) || price < 1) return Alert.alert("กรุณากรอกราคา");
    if (!form.imageUrl.trim()) return Alert.alert("กรุณาเลือกหรือใส่ URL รูปภาพ");

    if (editing) {
      updateItem.mutate({ id: editing.id, name: form.name.trim(), price, description: form.description || undefined, imageUrl: form.imageUrl.trim(), category: form.category, isPopular: form.isPopular });
    } else {
      createItem.mutate({ name: form.name.trim(), price, description: form.description || undefined, imageUrl: form.imageUrl.trim(), category: form.category, isPopular: form.isPopular });
    }
  };

  const handleDelete = (item: FoodItem) => {
    Alert.alert("ลบเมนู", `ต้องการลบ "${item.name}" หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => deleteItem.mutate(item.id) },
    ]);
  };

  const isBusy = createItem.isPending || updateItem.isPending || uploading;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>จัดการเมนู</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>เพิ่มเมนู</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="restaurant-outline" size={52} color="#CCCCCC" />
              <Text style={styles.emptyText}>ยังไม่มีเมนู</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate}>
                <Text style={styles.emptyAddText}>เพิ่มเมนูแรก</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.menuCard}>
            <View style={styles.menuCardBody}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.menuImage} />
              ) : (
                <View style={[styles.menuImage, styles.menuImagePlaceholder]}>
                  <Ionicons name="image-outline" size={24} color="#CCCCCC" />
                </View>
              )}
              <View style={styles.menuInfo}>
                {item.isPopular && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="flame" size={11} color="#FF6B00" />
                    <Text style={styles.popularBadgeText}>ยอดนิยม</Text>
                  </View>
                )}
                <Text style={styles.menuName}>{item.name}</Text>
                <Text style={styles.menuDesc} numberOfLines={2}>{item.description || item.category}</Text>
                <Text style={styles.menuPrice}>฿{item.price.toLocaleString()}</Text>
              </View>
              <View style={styles.menuActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)} activeOpacity={0.8}>
                  <Text style={styles.editBtnText}>แก้ไข</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.8}>
                  <Text style={styles.deleteBtnText}>ลบ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.modalClose}>ปิด</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={[null]}
              keyExtractor={() => "form"}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
              renderItem={() => (
                <View>
                  {/* Image Picker */}
                  <Text style={fieldStyles.label}>รูปภาพ *</Text>
                  <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8} disabled={uploading}>
                    {form.imageUrl ? (
                      <Image source={{ uri: form.imageUrl }} style={styles.imagePreview} />
                    ) : (
                      <View style={styles.imagePickerEmpty}>
                        <Ionicons name="camera-outline" size={32} color="#AAAAAA" />
                        <Text style={styles.imagePickerText}>{uploading ? "กำลังอัพโหลด..." : "แตะเพื่อเลือกรูป"}</Text>
                      </View>
                    )}
                    {form.imageUrl && (
                      <View style={styles.imagePickerOverlay}>
                        <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.imagePickerOverlayText}>{uploading ? "กำลังอัพโหลด..." : "เปลี่ยนรูป"}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TextInput
                    style={[fieldStyles.input, { marginBottom: 14 }]}
                    value={form.imageUrl}
                    onChangeText={(v) => setForm(f => ({ ...f, imageUrl: v }))}
                    placeholder="หรือวาง URL รูปภาพ..."
                    placeholderTextColor="#AAAAAA"
                  />

                  <FieldInput label="ชื่อเมนู *" value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} placeholder="เช่น ข้าวมันไก่ต้ม" />
                  <FieldInput label="ราคา (บาท) *" value={form.price} onChangeText={(v) => setForm(f => ({ ...f, price: v }))} placeholder="60" keyboardType="number-pad" />
                  <FieldInput label="คำอธิบาย" value={form.description} onChangeText={(v) => setForm(f => ({ ...f, description: v }))} placeholder="รายละเอียดเมนู..." />
                  <FieldInput label="หมวดหมู่" value={form.category} onChangeText={(v) => setForm(f => ({ ...f, category: v }))} placeholder="ยอดนิยม" />
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>เมนูยอดนิยม</Text>
                    <Switch
                      value={form.isPopular}
                      onValueChange={(v) => setForm(f => ({ ...f, isPopular: v }))}
                      trackColor={{ false: "#E0E0E0", true: "#FFD0A8" }}
                      thumbColor={form.isPopular ? "#FF6B00" : "#FFFFFF"}
                    />
                  </View>
                </View>
              )}
            />

            <TouchableOpacity
              style={[styles.saveBtn, isBusy && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>{isBusy ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "เพิ่มเมนู"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FieldInput({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput style={fieldStyles.input} placeholderTextColor="#AAAAAA" {...props} />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#555555", marginBottom: 6 },
  input: {
    backgroundColor: "#FFF8F0", borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, color: "#1A1A1A",
    borderWidth: 1.5, borderColor: "#F0E8E0",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8F8" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: "bold", color: "#1A1A1A" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#FF6B00", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: "#AAAAAA" },
  emptyAddBtn: { backgroundColor: "#FF6B00", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  emptyAddText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  menuCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 5, elevation: 2,
  },
  menuCardBody: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  menuImage: { width: 72, height: 72, borderRadius: 10 },
  menuImagePlaceholder: { backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" },
  menuInfo: { flex: 1, gap: 3 },
  popularBadge: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start", backgroundColor: "#FFF3E8", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  popularBadgeText: { fontSize: 11, fontWeight: "600", color: "#FF6B00" },
  menuName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  menuDesc: { fontSize: 12, color: "#8A8A8A", lineHeight: 16 },
  menuPrice: { fontSize: 15, fontWeight: "bold", color: "#FF6B00", marginTop: 2 },
  menuActions: { gap: 8 },
  editBtn: { backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  editBtnText: { fontSize: 13, fontWeight: "600", color: "#2563EB" },
  deleteBtn: { backgroundColor: "#FEF2F2", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#DC2626" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F0E8E0" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A" },
  modalClose: { fontSize: 15, color: "#FF6B00", fontWeight: "600" },
  modalBody: { padding: 20 },
  imagePicker: {
    width: "100%", height: 160, borderRadius: 12, marginBottom: 10,
    overflow: "hidden", backgroundColor: "#F5F5F5",
    borderWidth: 1.5, borderColor: "#F0E8E0", borderStyle: "dashed",
  },
  imagePickerEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  imagePickerText: { fontSize: 13, color: "#AAAAAA" },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePickerOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  imagePickerOverlayText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  switchLabel: { fontSize: 13, fontWeight: "600", color: "#555555" },
  saveBtn: {
    backgroundColor: "#FF6B00", borderRadius: 100, marginHorizontal: 20,
    paddingVertical: 15, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
