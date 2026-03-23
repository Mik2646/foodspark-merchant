import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { data = [], isLoading } = trpc.merchant.analytics.useQuery();

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.orders, 0);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>วิเคราะห์ยอดขาย</Text>
        <Text style={styles.subtitle}>7 วันล่าสุด</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Summary Cards */}
        <View style={styles.cards}>
          <View style={[styles.card, { backgroundColor: "#FFF8F0" }]}>
            <Ionicons name="cash-outline" size={22} color="#FF6B00" />
            <Text style={styles.cardValue}>฿{totalRevenue.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>รายได้รวม</Text>
          </View>
          <View style={[styles.card, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="receipt-outline" size={22} color="#16A34A" />
            <Text style={[styles.cardValue, { color: "#16A34A" }]}>{totalOrders}</Text>
            <Text style={styles.cardLabel}>ออเดอร์รวม</Text>
          </View>
          <View style={[styles.card, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="trending-up-outline" size={22} color="#3B82F6" />
            <Text style={[styles.cardValue, { color: "#3B82F6" }]}>
              ฿{totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0}
            </Text>
            <Text style={styles.cardLabel}>เฉลี่ย/ออเดอร์</Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>รายได้รายวัน</Text>
          {isLoading ? (
            <Text style={styles.loading}>กำลังโหลด...</Text>
          ) : (
            <View style={styles.chart}>
              {data.map((day, i) => {
                const barPct = maxRevenue > 0 ? day.revenue / maxRevenue : 0;
                const barH = Math.max(barPct * 140, day.revenue > 0 ? 4 : 2);
                const label = new Date(day.date).toLocaleDateString("th-TH", { weekday: "short" });
                const isToday = i === data.length - 1;
                return (
                  <View key={day.date} style={styles.barCol}>
                    <Text style={styles.barValue}>
                      {day.revenue > 0 ? `฿${(day.revenue / 1000).toFixed(1)}k` : ""}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          { height: barH, backgroundColor: isToday ? "#FF6B00" : "#FFCC00" },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, isToday && { color: "#FF6B00", fontWeight: "700" }]}>
                      {label}
                    </Text>
                    <Text style={styles.barOrders}>{day.orders} ออเดอร์</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Daily breakdown list */}
        <View style={styles.listSection}>
          <Text style={styles.chartTitle}>รายละเอียดรายวัน</Text>
          {data.slice().reverse().map((day, i) => {
            const dateStr = new Date(day.date).toLocaleDateString("th-TH", {
              weekday: "long", day: "numeric", month: "short",
            });
            const isToday = i === 0;
            return (
              <View key={day.date} style={[styles.dayRow, isToday && styles.dayRowToday]}>
                <View style={styles.dayLeft}>
                  {isToday && <View style={styles.todayDot} />}
                  <Text style={[styles.dayDate, isToday && { color: "#FF6B00" }]}>{dateStr}</Text>
                </View>
                <View style={styles.dayRight}>
                  <Text style={styles.dayOrders}>{day.orders} ออเดอร์</Text>
                  <Text style={styles.dayRevenue}>฿{day.revenue.toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#F0E8E0",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#1A1A1A" },
  subtitle: { fontSize: 13, color: "#8A8A8A", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  cards: { flexDirection: "row", gap: 10 },
  card: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: "#F0E8E0",
  },
  cardValue: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A" },
  cardLabel: { fontSize: 11, color: "#8A8A8A", textAlign: "center" },
  chartSection: {
    backgroundColor: "#FAFAFA", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#F0E8E0",
  },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 16 },
  loading: { color: "#8A8A8A", fontSize: 14, textAlign: "center", paddingVertical: 20 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 200 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontSize: 9, color: "#8A8A8A", height: 14, textAlign: "center" },
  barTrack: { flex: 1, width: "80%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 10, color: "#555", fontWeight: "500" },
  barOrders: { fontSize: 9, color: "#AAAAAA" },
  listSection: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#F0E8E0",
  },
  dayRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F8F8F8",
  },
  dayRowToday: { backgroundColor: "#FFF8F0", borderRadius: 10, paddingHorizontal: 10, marginHorizontal: -10 },
  dayLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF6B00" },
  dayDate: { fontSize: 14, color: "#1A1A1A" },
  dayRight: { alignItems: "flex-end", gap: 2 },
  dayOrders: { fontSize: 12, color: "#8A8A8A" },
  dayRevenue: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
});
