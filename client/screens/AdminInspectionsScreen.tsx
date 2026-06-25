import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, authHeaders } from "@/lib/query-client";
import { formatDualDate } from "@/utils/dateFormat";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface InspectionRow {
  inspectionId: string;
  inspectionNo: string;
  status: string;
  carModelId: string;
  carYear: number | null;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  customerName: string | null;
  customerMobile: string;
}

interface AdminInspectionsResponse {
  inspections: InspectionRow[];
  hasMore: boolean;
  page: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  draft: { label: "إنشاء الطلب", color: "#6B7280", icon: "edit-2" },
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

const STATUS_FILTER_OPTIONS: { key: string | null; label: string }[] = [
  { key: null, label: "الكل" },
  { key: "draft", label: "مسودة" },
  { key: "rfq_sent", label: "أُرسل" },
  { key: "waiting_quotes", label: "بانتظار العروض" },
  { key: "quotes_received", label: "وصلت عروض" },
  { key: "quote_accepted", label: "تم قبول عرض" },
  { key: "payment_pending", label: "بانتظار الدفع" },
  { key: "paid", label: "مدفوع" },
  { key: "cancelled", label: "ملغي" },
];

function InspectionCard({
  item,
  index,
  onPress,
}: {
  item: InspectionRow;
  index: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const statusCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.draft;

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index * 30, 300))}>
      <Pressable
        testID={`card-admin-inspection-${item.inspectionId}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + "20" }]}>
            <Feather name={statusCfg.icon} size={12} color={statusCfg.color} />
            <ThemedText style={[styles.statusText, { color: statusCfg.color, fontFamily: "Cairo_600SemiBold" }]}>
              {statusCfg.label}
            </ThemedText>
          </View>
          <ThemedText style={[styles.inspNo, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
            {item.inspectionNo}
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.cardBottom}>
          <View style={styles.customerInfo}>
            <Feather name="user" size={13} color={theme.textSecondary} />
            <ThemedText style={[styles.customerName, { fontFamily: "Cairo_600SemiBold" }]} numberOfLines={1}>
              {item.customerName ?? "بدون اسم"}
            </ThemedText>
            <ThemedText style={[styles.customerMobile, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {item.customerMobile}
            </ThemedText>
          </View>
          <View style={styles.dateRow}>
            <ThemedText style={[styles.dateText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {formatDualDate(item.createdAt).combined}
            </ThemedText>
            <Feather name="chevron-left" size={15} color={theme.textSecondary} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function buildPath(page: number, search: string, statusFilter: string | null): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (search.trim()) params.set("search", search.trim());
  if (statusFilter) params.set("status", statusFilter);
  return `/api/admin/laqit-inspections?${params.toString()}`;
}

export default function AdminInspectionsScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<InspectionRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryPath = buildPath(page, debouncedSearch, statusFilter);

  const { data, isLoading, isFetching } = useQuery<AdminInspectionsResponse>({
    queryKey: ["/api/admin/laqit-inspections", debouncedSearch, statusFilter, page],
    queryFn: async () => {
      const url = new URL(queryPath, getApiUrl()).toString();
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<AdminInspectionsResponse>;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setAllItems(data.inspections);
    } else {
      setAllItems((prev) => [...prev, ...data.inspections]);
    }
    setHasMore(data.hasMore);
  }, [data]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setAllItems([]);
    }, [])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
      setAllItems([]);
    }, 400);
  };

  const handleStatusFilter = (key: string | null) => {
    setStatusFilter(key);
    setPage(1);
    setAllItems([]);
  };

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((p) => p + 1);
    }
  };

  const handleCardPress = (inspectionId: string) => {
    navigation.navigate("InspectionDetail", { inspectionId });
  };

  return (
    <FlatList
      style={[styles.list, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={allItems}
      keyExtractor={(item) => item.inspectionId}
      renderItem={({ item, index }) => (
        <InspectionCard
          item={item}
          index={index}
          onPress={() => handleCardPress(item.inspectionId)}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        <View style={styles.headerArea}>
          <View
            style={[
              styles.searchRow,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <Feather name="search" size={15} color={theme.textSecondary} />
            <TextInput
              testID="input-admin-inspection-search"
              style={[styles.searchInput, { color: theme.text, fontFamily: "Cairo_400Regular" }]}
              placeholder="رقم الطلب أو اسم العميل أو جواله"
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              textAlign="right"
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => handleSearch("")} hitSlop={8}>
                <Feather name="x" size={14} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            horizontal
            data={STATUS_FILTER_OPTIONS}
            keyExtractor={(f) => f.key ?? "all"}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item: f }) => {
              const active = statusFilter === f.key;
              return (
                <Pressable
                  onPress={() => handleStatusFilter(f.key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? theme.primary + "18" : theme.backgroundDefault,
                      borderColor: active ? theme.primary + "60" : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.filterChipText,
                      {
                        color: active ? theme.primary : theme.textSecondary,
                        fontFamily: active ? "Cairo_600SemiBold" : "Cairo_400Regular",
                      },
                    ]}
                  >
                    {f.label}
                  </ThemedText>
                </Pressable>
              );
            }}
          />

          {isLoading && page === 1 ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing["3xl"] }} />
          ) : null}
        </View>
      }
      ListFooterComponent={
        isFetching && page > 1 ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: Spacing.lg }} />
        ) : null
      }
      ListEmptyComponent={
        !isLoading ? (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="clipboard" size={40} color={theme.textSecondary} />
            </View>
            <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}>
              لا توجد طلبات
            </ThemedText>
            <ThemedText style={[styles.emptyHint, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {debouncedSearch || statusFilter ? "لا توجد نتائج تطابق البحث" : "لم يُسجَّل أي طلب بعد"}
            </ThemedText>
          </Animated.View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  headerArea: { marginBottom: Spacing.md, gap: Spacing.sm },
  searchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 6 },
  filterRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12 },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: 11 },
  inspNo: { fontSize: 14 },
  divider: { height: 1 },
  cardBottom: { gap: Spacing.xs },
  customerInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  customerName: { fontSize: 13 },
  customerMobile: { fontSize: 12 },
  dateRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: { fontSize: 12 },
  emptyState: {
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 17, textAlign: "center" },
  emptyHint: { fontSize: 13, textAlign: "center", lineHeight: 22 },
});
