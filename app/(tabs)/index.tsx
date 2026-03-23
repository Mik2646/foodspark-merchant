import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

function StatCard({ iconName, label, value, color, sub }: {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={iconName} size={22} color={color} />
      </View>
      <View style={styles.statBody}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {sub && <Text style={styles.statSub}>{sub}</Text>}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const utils = trpc.useUtils();

  const { data: stats, isLoading: statsLoading } = trpc.merchant.dashboardStats.useQuery(undefined, { refetchInterval: 30000 });
  const { data: restaurant } = trpc.merchant.getMyRestaurant.useQuery();
  const { data: recentOrders = [] } = trpc.merchant.listOrders.useQuery({ limit: 5 }, { refetchInterval: 30000 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      utils.merchant.dashboardStats.invalidate(),
      utils.merchant.listOrders.invalidate(),
      utils.merchant.getMyRestaurant.invalidate(),
    ]);
    setRefreshing(false);
  }, [utils]);

  const STATUS_LABEL: Record<string, string> = {
    pending: "รอยืนยัน", preparing: "กำลังทำ",
    delivering: "กำลังส่ง", delivered: "ส่งแล้ว", cancelled: "ยกเลิก",
  };
  const STATUS_COLOR: Record<string, string> = {
    pending: "#D97706", preparing: "#2563EB",
    delivering: "#7C3AED", delivered: "#16A34A", cancelled: "#DC2626",
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>สวัสดี, {user?.name ?? "เจ้าของร้าน"}</Text>
          {restaurant && <Text style={styles.restaurantName}>{restaurant.name}</Text>}
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color="#FF6B00" />
          <Text style={styles.logoutText}>ออก</Text>
        </TouchableOpacity>
      </View>

      {/* Open/Closed toggle */}
      {restaurant && (
        <OpenToggle restaurantId={restaurant.id} isOpen={restaurant.isOpen} onToggle={onRefresh} />
      )}

      {/* Stats */}
      {statsLoading ? (
        <ActivityIndicator color="#FF6B00" style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard iconName="bag-outline" label="ออเดอร์วันนี้" value={stats?.todayOrders ?? 0} color="#2563EB" />
          <StatCard iconName="cash-outline" label="รายได้วันนี้" value={`฿${(stats?.todayRevenue ?? 0).toLocaleString()}`} color="#16A34A" />
          <StatCard iconName="time-outline" label="รอยืนยัน" value={stats?.pendingOrders ?? 0} color="#D97706"
            sub={stats?.pendingOrders ? "ต้องการการดำเนินการ" : undefined} />
          <StatCard iconName="bicycle-outline" label="กำลังดำเนินการ" value={stats?.activeOrders ?? 0} color="#7C3AED" />
        </View>
      )}

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ออเดอร์ล่าสุด</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/orders")}>
            <Text style={styles.seeAll}>ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={36} color="#CCCCCC" />
            <Text style={styles.emptyText}>ยังไม่มีออเดอร์</Text>
          </View>
        ) : (
          recentOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderRow}
              onPress={() => router.push("/(tabs)/orders")}
              activeOpacity={0.8}
            >
              <View style={styles.orderLeft}>
                <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                <Text style={styles.orderItems} numberOfLines={1}>
                  {order.items?.length ?? 0} รายการ · ฿{order.totalAmount.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[order.status] ?? "#999") + "18" }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] ?? "#999" }]}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function OpenToggle({ restaurantId, isOpen, onToggle }: { restaurantId: string; isOpen: boolean; onToggle: () => void }) {
  const updateMutation = trpc.merchant.updateRestaurant.useMutation({ onSuccess: onToggle });
  return (
    <TouchableOpacity
      style={[styles.openToggle, { backgroundColor: isOpen ? "#ECFDF5" : "#FEF2F2" }]}
      onPress={() => updateMutation.mutate({ id: restaurantId, isOpen: !isOpen })}
      activeOpacity={0.85}
    >
      <Ionicons
        name={isOpen ? "checkmark-circle" : "close-circle"}
        size={20}
        color={isOpen ? "#16A34A" : "#DC2626"}
      />
      <Text style={[styles.openText, { color: isOpen ? "#16A34A" : "#DC2626" }]}>
        {isOpen ? "ร้านเปิดอยู่ — แตะเพื่อปิด" : "ร้านปิดอยู่ — แตะเพื่อเปิด"}
      </Text>
      {updateMutation.isPending && <ActivityIndicator size="small" color="#FF6B00" style={{ marginLeft: 8 }} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8F8" },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  greeting: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  restaurantName: { fontSize: 13, color: "#FF6B00", fontWeight: "600", marginTop: 2 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#FFF0E8", borderWidth: 1, borderColor: "#FFD4B0",
  },
  logoutText: { fontSize: 13, color: "#FF6B00", fontWeight: "600" },
  openToggle: {
    flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14,
    marginBottom: 20, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  openText: { fontSize: 14, fontWeight: "600", flex: 1 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: "45%",
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statBody: { flex: 1 },
  statLabel: { fontSize: 12, color: "#8A8A8A", fontWeight: "500" },
  statValue: { fontSize: 22, fontWeight: "bold", marginTop: 2 },
  statSub: { fontSize: 11, color: "#AAAAAA", marginTop: 2 },
  section: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A" },
  seeAll: { fontSize: 13, color: "#FF6B00", fontWeight: "600" },
  empty: { paddingVertical: 20, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, color: "#AAAAAA" },
  orderRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F5F5F5",
  },
  orderLeft: { flex: 1 },
  orderId: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  orderItems: { fontSize: 12, color: "#8A8A8A", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "700" },
});
