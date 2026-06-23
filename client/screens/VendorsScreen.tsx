import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface VendorItem {
  vendorId: string;
  vendorName: string;
  cities: string[];
}

interface ApiResponse {
  vendors: VendorItem[];
}

function VendorCard({ vendor, index }: { vendor: VendorItem; index: number }) {
  const { theme } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 50)}>
      <View
        style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
        testID={`card-vendor-${vendor.vendorId}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconWrapper}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primary + "18" }]}>
              <Feather name="tool" size={20} color={theme.primary} />
            </View>
          </View>
          <ThemedText style={[styles.vendorName, { fontFamily: "Cairo_700Bold" }]}>
            {vendor.vendorName}
          </ThemedText>
        </View>

        {vendor.cities.length > 0 ? (
          <View style={styles.citiesRow}>
            <Feather name="map-pin" size={13} color={theme.textSecondary} style={styles.cityIcon} />
            <ThemedText
              style={[styles.citiesText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}
              numberOfLines={2}
            >
              {vendor.cities.join("  ·  ")}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function EmptyState() {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyState}>
      <Feather name="tool" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}>
        لا يوجد تجار مسجلون
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
        لم يتم إضافة تجار قطع الغيار بعد
      </ThemedText>
    </View>
  );
}

export default function VendorsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["/api/vendors/public"],
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="wifi-off" size={40} color={theme.textSecondary} />
        <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold", marginTop: Spacing.md }]}>
          تعذر تحميل البيانات
        </ThemedText>
      </View>
    );
  }

  const vendorList = data?.vendors ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={vendorList}
        keyExtractor={(item) => item.vendorId}
        renderItem={({ item, index }) => <VendorCard vendor={item} index={index} />}
        ListEmptyComponent={<EmptyState />}
        ListHeaderComponent={
          vendorList.length > 0 ? (
            <ThemedText style={[styles.headerLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {vendorList.length} تاجر مسجل في المنصة
            </ThemedText>
          ) : null
        }
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  list: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  headerLabel: {
    fontSize: 13,
    textAlign: "right",
    marginBottom: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconWrapper: {
    alignItems: "flex-end",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  vendorName: {
    flex: 1,
    fontSize: 16,
    textAlign: "right",
  },
  citiesRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  cityIcon: {
    marginTop: 2,
    marginLeft: Spacing.xs,
  },
  citiesText: {
    flex: 1,
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
