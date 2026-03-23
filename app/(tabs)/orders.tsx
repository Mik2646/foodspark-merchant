import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";

type StatusFilter = "all" | "pending" | "confirmed" | "preparing" | "ready" | "delivering" | "delivered" | "cancelled";

const STATUS_TABS: { key: StatusFilter; label: string; color: string }[] = [
  { key: "all",       label: "ทั้งหมด",    color: "#666666" },
  { key: "pending",   label: "รอยืนยัน",   color: "#D97706" },
  { key: "preparing", label: "กำลังทำ",    color: "#2563EB" },
  { key: "ready",     label: "รอไรเดอร์",  color: "#7C3AED" },
  { key: "delivering",label: "กำลังส่ง",   color: "#8B5CF6" },
  { key: "delivered", label: "ส่งแล้ว",    color: "#16A34A" },
  { key: "cancelled", label: "ยกเลิก",     color: "#DC2626" },
];

const NEXT_STATUS: Record<string, { label: string; value: "confirmed" | "preparing" | "ready" | "delivering" | "delivered" | "cancelled" }[]> = {
  pending:   [{ label: "ยืนยัน & เริ่มทำ", value: "preparing" }, { label: "ยกเลิก", value: "cancelled" }],
  preparing: [{ label: "อาหารพร้อมแล้ว 🍱", value: "ready" }],
  ready:     [],
  delivering:[{ label: "ส่งแล้ว", value: "delivered" }],
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [refreshing, setRefreshing] = useState(false);
  const utils = trpc.useUtils();

  const { data: orders = [], isLoading } = trpc.merchant.listOrders.useQuery({ status: filter as any, limit: 100 }, {
    refetchInterval: 30000,
  });
  const updateStatus = trpc.merchant.updateOrderStatus.useMutation({
    onSuccess: () => utils.merchant.listOrders.invalidate(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await utils.merchant.listOrders.invalidate();
    setRefreshing(false);
  }, [utils]);

  const handleAction = (orderId: string, status: "confirmed" | "preparing" | "ready" | "delivering" | "delivered" | "cancelled", label: string) => {
    Alert.alert(label, `ยืนยันการเปลี่ยนสถานะ?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ยืนยัน", onPress: () => updateStatus.mutate({ orderId, status }) },
    ]);
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: "#D97706", confirmed: "#0284C7", preparing: "#2563EB",
    ready: "#7C3AED", delivering: "#8B5CF6", delivered: "#16A34A", cancelled: "#DC2626",
  };
  const STATUS_LABEL: Record<string, string> = {
    pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", preparing: "กำลังทำ",
    ready: "รอไรเดอร์", delivering: "กำลังส่ง", delivered: "ส่งแล้ว", cancelled: "ยกเลิก",
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ออเดอร์</Text>
      </View>

      {/* Filter Tabs */}
      <FlatList
        horizontal
        data={STATUS_TABS}
        keyExtractor={(t) => t.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        renderItem={({ item: tab }) => (
          <TouchableOpacity
            style={[styles.tab, filter === tab.key && { backgroundColor: tab.color }]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>ไม่มีออเดอร์</Text>
            </View>
          )
        }
        renderItem={({ item: order }) => {
          const actions = NEXT_STATUS[order.status] ?? [];
          const col = STATUS_COLOR[order.status] ?? "#999";
          return (
            <View style={styles.card}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardOrderId}>#{order.id.slice(-8).toUpperCase()}</Text>
                <View style={[styles.statusPill, { backgroundColor: col + "18" }]}>
                  <View style={[styles.statusDot, { backgroundColor: col }]} />
                  <Text style={[styles.statusPillText, { color: col }]}>
                    {STATUS_LABEL[order.status]}
                  </Text>
                </View>
              </View>

              {/* Address */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 }}>
                <Ionicons name="location-outline" size={13} color="#8A8A8A" />
                <Text style={styles.address} numberOfLines={1}>{order.deliveryAddress}</Text>
              </View>

              {/* Items */}
              <View style={styles.itemsList}>
                {order.items?.map((item, i) => (
                  <Text key={i} style={styles.itemRow}>
                    {item.quantity}× {item.name}
                    {item.price > 0 ? ` — ฿${(item.price * item.quantity).toLocaleString()}` : ""}
                  </Text>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.total}>รวม ฿{order.totalAmount.toLocaleString()}</Text>
                <Text style={styles.time}>
                  {new Date(order.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>

              {/* Action Buttons */}
              {actions.length > 0 && (
                <View style={styles.actions}>
                  {actions.map((action) => (
                    <TouchableOpacity
                      key={action.value}
                      style={[
                        styles.actionBtn,
                        action.value === "cancelled" ? styles.actionBtnCancel : styles.actionBtnPrimary,
                      ]}
                      onPress={() => handleAction(order.id, action.value, action.label)}
                      activeOpacity={0.85}
                    >
                      <Text style={[
                        styles.actionBtnText,
                        action.value === "cancelled" && styles.actionBtnTextCancel,
                      ]}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8F8" },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: "bold", color: "#1A1A1A" },
  tabs: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  tabText: { fontSize: 13, fontWeight: "600", color: "#666666" },
  tabTextActive: { color: "#FFFFFF" },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: "#AAAAAA" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardOrderId: { fontSize: 15, fontWeight: "bold", color: "#1A1A1A" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: "700" },
  address: { fontSize: 13, color: "#8A8A8A", flex: 1 },
  itemsList: { gap: 3, marginBottom: 10 },
  itemRow: { fontSize: 13, color: "#555555" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#F5F5F5", paddingTop: 10, marginBottom: 12 },
  total: { fontSize: 15, fontWeight: "bold", color: "#1A1A1A" },
  time: { fontSize: 12, color: "#AAAAAA" },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 11, borderRadius: 100, alignItems: "center" },
  actionBtnPrimary: { backgroundColor: "#FF6B00" },
  actionBtnCancel: { backgroundColor: "#FFF0F0", borderWidth: 1, borderColor: "#FFC4C4" },
  actionBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  actionBtnTextCancel: { color: "#DC2626" },
});
