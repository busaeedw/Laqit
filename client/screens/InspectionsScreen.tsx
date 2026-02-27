import React, { useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { useUser } from "@/context/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_LABELS: Record<string, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  draft: { label: "مسودة", color: "#6B7280", icon: "edit-2" },
  rfq_sent: { label: "أُرسل للموردين", color: "#1E74F2", icon: "send" },
  waiting_quotes: { label: "بانتظار العروض", color: "#F59E0B", icon: "clock" },
  quotes_received: { label: "وصلت عروض", color: "#10B981", icon: "inbox" },
  quote_accepted: { label: "تم قبول عرض", color: "#10B981", icon: "check-circle" },
  payment_pending: { label: "بانتظار الدفع", color: "#F59E0B", icon: "credit-card" },
  paid: { label: "تم الدفع", color: "#10B981", icon: "check-circle" },
  vendor_notified: { label: "تم إشعار المورد", color: "#10B981", icon: "bell" },
  ready_for_pickup: { label: "جاهز للاستلام", color: "#10B981", icon: "package" },
  cancelled: { label: "ملغي", color: "#EF4444", icon: "x-circle" },
  closed: { label: "مغلق", color: "#6B7280", icon: "archive" },
};

export default function InspectionsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const { user, isLoggedIn } = useUser();
  const apiUrl = getApiUrl();

  const { data, isLoading, refetch } = useQuery<{ inspections: any[] }>({
    queryKey: ["/api/laqit-inspections/customer", user?.customerId],
    enabled: !!(isLoggedIn && user?.customerId),
  });

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn && user?.customerId) {
        refetch();
      }
    }, [isLoggedIn, user?.customerId])
  );

  const inspectionsList = data?.inspections ?? [];

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const renderItem = ({ item }: { item: any }) => {
    const statusCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.draft;
    return (
      <Pressable
        testID={`card-inspection-${item.inspectionId}`}
        onPress={() => navigation.navigate("InspectionDetail", { inspectionId: item.inspectionId })}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + "20" }]}>
            <Feather name={statusCfg.icon} size={13} color={statusCfg.color} />
            <ThemedText style={[styles.statusText, { color: statusCfg.color, fontFamily: "Cairo_600SemiBold" }]}>
              {statusCfg.label}
            </ThemedText>
          </View>
          <ThemedText style={[styles.inspNo, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
            {item.inspectionNo}
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.cardFooter}>
          <ThemedText style={[styles.dateText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            {formatDate(item.createdAt)}
          </ThemedText>
          <Feather name="chevron-left" size={16} color={theme.textSecondary} />
        </View>
      </Pressable>
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="lock" size={48} color={theme.textSecondary} />
        <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}>
          سجّل دخولك لعرض الطلبات
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.list, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={inspectionsList}
      keyExtractor={(item) => item.inspectionId}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing["3xl"] }} />
        ) : null
      }
      ListEmptyComponent={
        !isLoading ? (
          <Animated.View entering={FadeIn.duration(500)} style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="clipboard" size={48} color={theme.textSecondary} />
            </View>
            <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}>
              لا توجد طلبات بعد
            </ThemedText>
            <ThemedText style={[styles.emptyHint, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              ابدأ بطلب جديد لاستقبال عروض أسعار من الموردين
            </ThemedText>
          </Animated.View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  inspNo: { fontSize: 15 },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: 12 },
  divider: { height: 1 },
  cardFooter: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  dateText: { fontSize: 13 },
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
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptyHint: { fontSize: 13, textAlign: "center", lineHeight: 22 },
});
