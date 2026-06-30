import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useUser } from "@/context/UserContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, authHeaders } from "@/lib/query-client";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface InspectionItem {
  inspectionId: string;
  inspectionNo: string;
  status: string;
  createdAt: string;
  makeName: string | null;
  modelName: string | null;
  carYear: number | null;
}

type DisplayStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

function mapStatus(status: string): DisplayStatus {
  switch (status) {
    case "draft":
    case "rfq_sent":
    case "waiting_quotes":
      return "pending";
    case "quotes_received":
    case "quote_accepted":
    case "payment_initiated":
    case "payment_captured":
      return "processing";
    case "in_fulfillment":
      return "shipped";
    case "completed":
      return "delivered";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, isLoggedIn } = useUser();
  const navigation = useNavigation<NavProp>();

  const { data, isLoading } = useQuery<{ inspections: InspectionItem[] }>({
    queryKey: ["/api/laqit-inspections/customer", user?.customerId],
    queryFn: async () => {
      const res = await fetch(
        new URL(`/api/laqit-inspections/customer/${user?.customerId}`, getApiUrl()).href,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error("Failed to load inspections");
      return res.json();
    },
    enabled: isLoggedIn && !!user?.customerId,
  });

  const inspections = data?.inspections ?? [];

  const getStatusConfig = (status: DisplayStatus) => {
    switch (status) {
      case "pending":
        return { label: "قيد الانتظار", color: theme.warning, icon: "clock" as const };
      case "processing":
        return { label: "قيد المعالجة", color: theme.primary, icon: "loader" as const };
      case "shipped":
        return { label: "قيد التنفيذ", color: theme.accent, icon: "truck" as const };
      case "delivered":
        return { label: "مكتمل", color: theme.success, icon: "check-circle" as const };
      case "cancelled":
        return { label: "ملغى", color: theme.error, icon: "x-circle" as const };
    }
  };

  const renderEmptyState = () => (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="package" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}>
        لا توجد طلبات بعد
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
        ابدأ بفحص سيارتك واطلب قطع الغيار التي تحتاجها
      </ThemedText>
    </Animated.View>
  );

  const renderUnauthenticated = () => (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="user" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}>
        تسجيل الدخول مطلوب
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
        سجل الدخول لعرض طلباتك السابقة
      </ThemedText>
      <Pressable
        onPress={() => (navigation as any).navigate("Main", { screen: "AccountTab" })}
        style={[styles.loginButton, { backgroundColor: theme.primary }]}
      >
        <ThemedText style={[styles.loginButtonText, { color: "#FFFFFF", fontFamily: "Cairo_700Bold" }]}>
          تسجيل الدخول
        </ThemedText>
      </Pressable>
    </Animated.View>
  );

  const renderOrderItem = ({ item }: { item: InspectionItem }) => {
    const displayStatus = mapStatus(item.status);
    const statusConfig = getStatusConfig(displayStatus);
    const carLabel = [item.makeName, item.modelName, item.carYear].filter(Boolean).join(" ") || "غير محدد";

    return (
      <Pressable
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        onPress={() => navigation.navigate("InspectionDetail", { inspectionId: item.inspectionId })}
      >
        <View style={[styles.orderCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <ThemedText style={[styles.orderNumber, { fontFamily: "Cairo_700Bold" }]}>
                {item.inspectionNo}
              </ThemedText>
              <ThemedText style={[styles.orderDate, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                {formatDate(item.createdAt)}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + "20" }]}>
              <Feather name={statusConfig.icon} size={14} color={statusConfig.color} />
              <ThemedText style={[styles.statusText, { color: statusConfig.color, fontFamily: "Cairo_600SemiBold" }]}>
                {statusConfig.label}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.orderDivider, { backgroundColor: theme.border }]} />
          <View style={styles.orderFooter}>
            <View style={styles.orderDetail}>
              <Feather name="car" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.orderDetailText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                {carLabel}
              </ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={inspections}
      keyExtractor={(item) => item.inspectionId}
      renderItem={renderOrderItem}
      ListEmptyComponent={isLoggedIn ? renderEmptyState : renderUnauthenticated}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  orderCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  orderHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderInfo: {
    gap: 2,
  },
  orderNumber: {
    fontSize: 16,
    textAlign: "right",
  },
  orderDate: {
    fontSize: 13,
    textAlign: "right",
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 12,
  },
  orderDivider: {
    height: 1,
  },
  orderFooter: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderDetail: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
  },
  orderDetailText: {
    fontSize: 13,
  },
  orderTotal: {
    fontSize: 16,
  },
  loginButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  loginButtonText: {
    fontSize: 15,
  },
});
