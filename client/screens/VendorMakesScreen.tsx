import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  SectionList,
  FlatList,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface Vendor {
  vendorId: string;
  vendorName: string;
  vendorNameEn: string | null;
  phone: string | null;
  status: string | null;
  district: string | null;
  cityNameAr: string | null;
}

interface MakeItem {
  makeId: string;
  makeName: string;
  nameAr: string | null;
  selected: boolean;
}

interface VendorsResponse {
  vendors: Vendor[];
}

interface MakesResponse {
  makes: MakeItem[];
}

interface VendorSection {
  title: string;
  data: Vendor[];
}

export default function VendorMakesScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [pendingMakeIds, setPendingMakeIds] = useState<string[]>([]);

  const { data: vendorsData, isLoading: vendorsLoading } = useQuery<VendorsResponse>({
    queryKey: ["/api/vendors/all"],
  });

  const { data: makesData, isLoading: makesLoading } = useQuery<MakesResponse>({
    queryKey: ["/api/vendors", selectedVendor?.vendorId, "car-makes"],
    enabled: !!selectedVendor,
  });

  // Sync checkboxes whenever the makes data changes (or vendor changes)
  useEffect(() => {
    if (makesData?.makes) {
      setPendingMakeIds(makesData.makes.filter((m) => m.selected).map((m) => m.makeId));
    } else {
      setPendingMakeIds([]);
    }
  }, [makesData]);

  // Reset pending state immediately when switching vendors (before new data arrives)
  const openVendor = (vendor: Vendor) => {
    setPendingMakeIds([]);
    setSelectedVendor(vendor);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ vendorId, makeIds }: { vendorId: string; makeIds: string[] }) => {
      const res = await apiRequest("PUT", `/api/vendors/${vendorId}/car-makes`, { makeIds });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/public"] });
      setSelectedVendor(null);
      Alert.alert("", `تم الحفظ — ${data.modelsCount} موديل مرتبط`);
    },
    onError: () => {
      Alert.alert("خطأ", "حدث خطأ أثناء الحفظ، يرجى المحاولة مجدداً");
    },
  });

  const toggleMake = (makeId: string) => {
    setPendingMakeIds((prev) =>
      prev.includes(makeId) ? prev.filter((id) => id !== makeId) : [...prev, makeId]
    );
  };

  const handleSave = () => {
    if (!selectedVendor || makesLoading || saveMutation.isPending) return;
    saveMutation.mutate({ vendorId: selectedVendor.vendorId, makeIds: pendingMakeIds });
  };

  // Group vendors by city
  const sections: VendorSection[] = useMemo(() => {
    const vendors = vendorsData?.vendors ?? [];
    const cityMap = new Map<string, Vendor[]>();
    for (const v of vendors) {
      const key = v.cityNameAr ?? "غير محدد";
      if (!cityMap.has(key)) cityMap.set(key, []);
      cityMap.get(key)!.push(v);
    }
    return Array.from(cityMap.entries()).map(([title, data]) => ({ title, data }));
  }, [vendorsData]);

  const renderVendorRow = ({ item }: { item: Vendor }) => (
    <Pressable
      testID={`vendor-row-${item.vendorId}`}
      onPress={() => openVendor(item)}
      style={({ pressed }) => [
        styles.vendorRow,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.vendorIcon, { backgroundColor: theme.primary + "15" }]}>
        <Feather name="tool" size={18} color={theme.primary} />
      </View>
      <View style={styles.vendorInfo}>
        <ThemedText style={[styles.vendorName, { fontFamily: "Cairo_700Bold" }]}>
          {item.vendorName}
        </ThemedText>
        {item.district ? (
          <ThemedText
            style={[
              styles.vendorDistrict,
              { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
            ]}
          >
            {item.district}
          </ThemedText>
        ) : item.phone ? (
          <ThemedText
            style={[
              styles.vendorDistrict,
              { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
            ]}
          >
            {item.phone}
          </ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-left" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  const renderSectionHeader = ({ section }: { section: VendorSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.backgroundRoot }]}>
      <ThemedText
        style={[
          styles.sectionHeaderText,
          { color: theme.primary, fontFamily: "Cairo_700Bold" },
        ]}
      >
        {section.title}
      </ThemedText>
    </View>
  );

  const renderMakeRow = ({ item }: { item: MakeItem }) => {
    const isSelected = pendingMakeIds.includes(item.makeId);
    return (
      <Pressable
        testID={`make-row-${item.makeId}`}
        onPress={() => toggleMake(item.makeId)}
        style={({ pressed }) => [
          styles.makeRow,
          {
            backgroundColor: isSelected ? theme.primary + "12" : theme.backgroundDefault,
            borderColor: isSelected ? theme.primary : (theme.border ?? "#E5E7EB"),
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? theme.primary : theme.textSecondary,
              backgroundColor: isSelected ? theme.primary : "transparent",
            },
          ]}
        >
          {isSelected ? <Feather name="check" size={12} color="#fff" /> : null}
        </View>
        <ThemedText style={[styles.makeName, { fontFamily: "Cairo_700Bold" }]}>
          {item.nameAr ?? item.makeName}
        </ThemedText>
        <ThemedText
          style={[
            styles.makeNameEn,
            { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
          ]}
        >
          {item.makeName}
        </ThemedText>
      </Pressable>
    );
  };

  if (vendorsLoading) {
    return (
      <View style={[styles.centered, { paddingTop: headerHeight }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const canSave = !makesLoading && !saveMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.vendorId}
        renderItem={renderVendorRow}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText
              style={[
                styles.emptyText,
                { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
              ]}
            >
              لا يوجد موردون
            </ThemedText>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={!!selectedVendor}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedVendor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.border ?? "#E5E7EB" },
              ]}
            >
              <Pressable
                onPress={() => setSelectedVendor(null)}
                style={styles.closeBtn}
                testID="button-close-makes-modal"
              >
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
              <View style={styles.modalTitleBlock}>
                <ThemedText style={[styles.modalTitle, { fontFamily: "Cairo_700Bold" }]}>
                  ماركات السيارات
                </ThemedText>
                <ThemedText
                  style={[
                    styles.modalSubtitle,
                    { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
                  ]}
                  numberOfLines={1}
                >
                  {selectedVendor?.vendorName}
                </ThemedText>
              </View>
            </View>

            {makesLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <FlatList
                data={makesData?.makes ?? []}
                keyExtractor={(item) => item.makeId}
                renderItem={renderMakeRow}
                contentContainerStyle={{
                  paddingHorizontal: Spacing.lg,
                  paddingTop: Spacing.md,
                  paddingBottom: Spacing.xl,
                  gap: Spacing.sm,
                }}
                showsVerticalScrollIndicator={false}
              />
            )}

            <View
              style={[
                styles.saveBar,
                {
                  borderTopColor: theme.border ?? "#E5E7EB",
                  paddingBottom: insets.bottom + Spacing.md,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.selectedCount,
                  { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
                ]}
              >
                {makesLoading
                  ? "جارٍ التحميل..."
                  : pendingMakeIds.length > 0
                  ? `${pendingMakeIds.length} ماركة محددة`
                  : "لم يتم تحديد أي ماركة"}
              </ThemedText>
              <Pressable
                testID="button-save-makes"
                onPress={handleSave}
                disabled={!canSave}
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed || !canSave ? 0.5 : 1,
                  },
                ]}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={[styles.saveBtnText, { fontFamily: "Cairo_700Bold" }]}>
                    حفظ
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 13,
    textAlign: "right",
    letterSpacing: 0.3,
  },
  sectionSeparator: {
    height: Spacing.md,
  },
  itemSeparator: {
    height: Spacing.sm,
  },
  vendorRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  vendorIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  vendorInfo: {
    flex: 1,
    gap: 2,
  },
  vendorName: {
    fontSize: 14,
    textAlign: "right",
  },
  vendorDistrict: {
    fontSize: 12,
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "85%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalTitleBlock: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: 16,
    textAlign: "right",
  },
  modalSubtitle: {
    fontSize: 12,
    textAlign: "right",
  },
  makeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  makeName: {
    flex: 1,
    fontSize: 14,
    textAlign: "right",
  },
  makeNameEn: {
    fontSize: 12,
  },
  saveBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  selectedCount: {
    fontSize: 13,
  },
  saveBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 90,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
  },
});
