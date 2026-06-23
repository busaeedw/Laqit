import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Linking,
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
  vendorNameEn: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  cities: string[];
  makes: string[];
}

interface ApiResponse {
  vendors: VendorItem[];
}

function VendorCard({ vendor, index }: { vendor: VendorItem; index: number }) {
  const { theme } = useTheme();

  const initials = vendor.vendorName.slice(0, 2);

  const openPhone = () => {
    if (!vendor.phone) return;
    Linking.openURL(`tel:${vendor.phone}`).catch(() => {});
  };

  const openWebsite = () => {
    if (!vendor.website) return;
    const url = vendor.website.startsWith("http")
      ? vendor.website
      : `https://${vendor.website}`;
    Linking.openURL(url).catch(() => {});
  };

  const openEmail = () => {
    if (!vendor.email) return;
    Linking.openURL(`mailto:${vendor.email}`).catch(() => {});
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <View
        style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
        testID={`card-vendor-${vendor.vendorId}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitles}>
            <ThemedText style={[styles.vendorName, { fontFamily: "Cairo_700Bold" }]}>
              {vendor.vendorName}
            </ThemedText>
            {vendor.vendorNameEn ? (
              <ThemedText style={[styles.vendorNameEn, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                {vendor.vendorNameEn}
              </ThemedText>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: theme.primary + "18" }]}>
            <ThemedText style={[styles.badgeText, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
              {initials}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {vendor.makes.length > 0 ? (
          <View style={styles.makesContainer}>
            {vendor.makes.map((make) => (
              <View key={make} style={[styles.makeChip, { backgroundColor: theme.primary + "14", borderColor: theme.primary + "30" }]}>
                <ThemedText style={[styles.makeChipText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                  {make}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        {vendor.cities.length > 0 ? (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={14} color={theme.textSecondary} style={styles.infoIcon} />
            <ThemedText style={[styles.infoText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {vendor.cities.join("  ·  ")}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          {vendor.phone ? (
            <Pressable
              onPress={openPhone}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.primary + "15", opacity: pressed ? 0.7 : 1 },
              ]}
              testID={`button-call-vendor-${vendor.vendorId}`}
            >
              <Feather name="phone" size={14} color={theme.primary} />
              <ThemedText style={[styles.actionText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                {vendor.phone}
              </ThemedText>
            </Pressable>
          ) : null}
          {vendor.website ? (
            <Pressable
              onPress={openWebsite}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.primary + "15", opacity: pressed ? 0.7 : 1 },
              ]}
              testID={`button-website-vendor-${vendor.vendorId}`}
            >
              <Feather name="globe" size={14} color={theme.primary} />
              <ThemedText style={[styles.actionText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]} numberOfLines={1}>
                الموقع الإلكتروني
              </ThemedText>
            </Pressable>
          ) : null}
          {vendor.email ? (
            <Pressable
              onPress={openEmail}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.primary + "15", opacity: pressed ? 0.7 : 1 },
              ]}
              testID={`button-email-vendor-${vendor.vendorId}`}
            >
              <Feather name="mail" size={14} color={theme.primary} />
              <ThemedText style={[styles.actionText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]} numberOfLines={1}>
                {vendor.email}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  cardTitles: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  vendorName: {
    fontSize: 16,
    textAlign: "right",
  },
  vendorNameEn: {
    fontSize: 12,
    textAlign: "right",
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 14,
    textAlign: "center",
  },
  divider: {
    height: 1,
  },
  makesContainer: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  makeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  makeChipText: {
    fontSize: 12,
  },
  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
  },
  infoIcon: {
    marginLeft: Spacing.xs,
  },
  infoText: {
    fontSize: 13,
    textAlign: "right",
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
  },
  actionText: {
    fontSize: 13,
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
