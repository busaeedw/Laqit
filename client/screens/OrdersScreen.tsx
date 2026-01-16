import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: "pending" | "processing" | "shipped" | "delivered";
  total: number;
  itemCount: number;
}

const mockOrders: Order[] = [];

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const getStatusConfig = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return { label: "قيد الانتظار", color: theme.warning, icon: "clock" as const };
      case "processing":
        return { label: "قيد المعالجة", color: theme.primary, icon: "loader" as const };
      case "shipped":
        return { label: "تم الشحن", color: theme.accent, icon: "truck" as const };
      case "delivered":
        return { label: "تم التوصيل", color: theme.success, icon: "check-circle" as const };
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

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusConfig = getStatusConfig(item.status);
    
    return (
      <View style={[styles.orderCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <ThemedText style={[styles.orderNumber, { fontFamily: "Cairo_700Bold" }]}>
              طلب #{item.orderNumber}
            </ThemedText>
            <ThemedText style={[styles.orderDate, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {item.date}
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
            <Feather name="box" size={14} color={theme.textSecondary} />
            <ThemedText style={[styles.orderDetailText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {item.itemCount} قطعة
            </ThemedText>
          </View>
          <ThemedText style={[styles.orderTotal, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
            {item.total} ريال
          </ThemedText>
        </View>
      </View>
    );
  };

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
      data={mockOrders}
      keyExtractor={(item) => item.id}
      renderItem={renderOrderItem}
      ListEmptyComponent={renderEmptyState}
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
});
