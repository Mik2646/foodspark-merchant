import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { useOrderNotification } from "@/lib/use-order-notification";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";

function usePushTokenRegistration() {
  const { isAuthenticated } = useAuth();
  const registerToken = trpc.auth.registerPushToken.useMutation();
  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") return;
        const token = await Notifications.getExpoPushTokenAsync();
        registerToken.mutate({ token: token.data });
      } catch { /* non-critical */ }
    })();
  }, [isAuthenticated]);
}

function TabIcon({ name, color, badge }: { name: React.ComponentProps<typeof Ionicons>["name"]; color: string; badge?: number }) {
  return (
    <View style={styles.tabIcon}>
      <Ionicons name={name} size={22} color={color} />
      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      )}
    </View>
  );
}

function OrdersIcon({ color }: { color: string }) {
  const { isAuthenticated } = useAuth();
  const { data: stats } = trpc.merchant.dashboardStats.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  useOrderNotification(stats?.pendingOrders);
  return <TabIcon name="receipt-outline" color={color} badge={stats?.pendingOrders} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  usePushTokenRegistration();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF6B00",
        tabBarInactiveTintColor: "#8A8A8A",
        tabBarStyle: {
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom, 8),
          backgroundColor: "#FFFFFF",
          borderTopColor: "#F0E8E0",
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ภาพรวม",
          tabBarIcon: ({ color }) => <TabIcon name="grid-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "ออเดอร์",
          tabBarIcon: ({ color }) => <OrdersIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "เมนู",
          tabBarIcon: ({ color }) => <TabIcon name="restaurant-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "สถิติ",
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "ร้านค้า",
          tabBarIcon: ({ color }) => <TabIcon name="storefront-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: { position: "relative", width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", top: -4, right: -10,
    backgroundColor: "#EF4444", borderRadius: 10,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFFFFF",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
});
