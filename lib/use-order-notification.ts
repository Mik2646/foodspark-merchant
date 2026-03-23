import { useEffect, useRef } from "react";
import { AppState, Platform, Vibration } from "react-native";

/**
 * Detects when the pending order count increases (new order arrived)
 * and triggers a visual + haptic notification.
 */
export function useOrderNotification(pendingCount: number | undefined) {
  const prevCount = useRef<number | undefined>(undefined);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      appState.current = state;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (pendingCount === undefined) return;

    // Skip on first load
    if (prevCount.current === undefined) {
      prevCount.current = pendingCount;
      return;
    }

    if (pendingCount > prevCount.current) {
      const newCount = pendingCount - prevCount.current;
      // Vibrate
      if (Platform.OS !== "web") {
        Vibration.vibrate([0, 200, 100, 200]);
      }
      // Browser notification on web
      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification("ออเดอร์ใหม่!", {
            body: `มีออเดอร์ใหม่ ${newCount} รายการ รอการยืนยัน`,
            icon: "/favicon.ico",
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    }

    prevCount.current = pendingCount;
  }, [pendingCount]);
}
