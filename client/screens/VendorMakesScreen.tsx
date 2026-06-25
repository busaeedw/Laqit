import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  SectionList,
  FlatList,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  ViewToken,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl, authHeaders } from "@/lib/query-client";

function formatExactDateTime(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function getVendorActionLabel(action: string): { label: string; icon: React.ComponentProps<typeof Feather>["name"]; color: string } {
  switch (action) {
    case "vendor_activated":
      return { label: "تفعيل المورد", icon: "check-circle", color: "#22C55E" };
    case "vendor_deactivated":
      return { label: "تعطيل المورد", icon: "x-circle", color: "#EF4444" };
    case "vendor_created":
      return { label: "إضافة المورد", icon: "plus-circle", color: "#3B82F6" };
    default:
      return { label: action, icon: "activity", color: "#6B7280" };
  }
}

interface AuditEntry {
  auditId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  payload: {
    actorName?: string | null;
    actorMobile?: string | null;
    vendorName?: string | null;
    [key: string]: unknown;
  } | null;
}

interface AuditLogResponse {
  entries: AuditEntry[];
  hasMore: boolean;
  page: number;
}

interface Vendor {
  vendorId: string;
  vendorName: string;
  vendorNameEn: string | null;
  phone: string | null;
  status: string | null;
  district: string | null;
  cityNameAr: string | null;
  whatsappNumber: string | null;
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

  const sectionListRef = useRef<SectionList<Vendor, VendorSection>>(null);
  const chipScrollRef = useRef<ScrollView>(null);
  const chipLayoutRef = useRef<Record<string, { x: number; width: number }>>({});
  const chipBarWidthRef = useRef<number>(0);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [pendingMakeIds, setPendingMakeIds] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"makes" | "history">("makes");

  const { data: vendorsData, isLoading: vendorsLoading } = useQuery<VendorsResponse>({
    queryKey: ["/api/vendors/all"],
  });

  const { data: makesData, isLoading: makesLoading } = useQuery<MakesResponse>({
    queryKey: ["/api/vendors", selectedVendor?.vendorId, "car-makes"],
    enabled: !!selectedVendor,
  });

  const auditQueryUrl = selectedVendor
    ? `/api/admin/audit-log?entityType=vendor&targetId=${selectedVendor.vendorId}`
    : null;

  const { data: auditData, isLoading: auditLoading } = useQuery<AuditLogResponse>({
    queryKey: [auditQueryUrl],
    enabled: !!selectedVendor && activeTab === "history",
    staleTime: 0,
  });

  // Sync checkboxes whenever the makes data changes (or vendor changes)
  useEffect(() => {
    if (makesData?.makes) {
      setPendingMakeIds(makesData.makes.filter((m) => m.selected).map((m) => m.makeId));
    } else {
      setPendingMakeIds([]);
    }
  }, [makesData]);

  // Reset pending state and tab immediately when switching vendors (before new data arrives)
  const openVendor = (vendor: Vendor) => {
    setPendingMakeIds([]);
    setActiveTab("makes");
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

  const statusMutation = useMutation({
    mutationFn: async ({ vendorId, status }: { vendorId: string; status: "active" | "inactive" }) => {
      const res = await apiRequest("PATCH", `/api/vendors/${vendorId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors/public"] });
    },
    onError: () => {
      Alert.alert("خطأ", "حدث خطأ أثناء تغيير حالة المورد، يرجى المحاولة مجدداً");
    },
  });

  const handleToggleStatus = (vendor: Vendor) => {
    const isActive = vendor.status === "active";
    const newStatus: "active" | "inactive" = isActive ? "inactive" : "active";
    const actionLabel = isActive ? "تعطيل" : "تفعيل";
    Alert.alert(
      `${actionLabel} المورد`,
      `هل تريد ${actionLabel} "${vendor.vendorName}"؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: actionLabel,
          style: isActive ? "destructive" : "default",
          onPress: () => statusMutation.mutate({ vendorId: vendor.vendorId, status: newStatus }),
        },
      ]
    );
  };

  const toggleMake = (makeId: string) => {
    setPendingMakeIds((prev) =>
      prev.includes(makeId) ? prev.filter((id) => id !== makeId) : [...prev, makeId]
    );
  };

  const handleSave = () => {
    if (!selectedVendor || makesLoading || saveMutation.isPending) return;
    saveMutation.mutate({ vendorId: selectedVendor.vendorId, makeIds: pendingMakeIds });
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const path = `/api/vendors/export`;
      const url = new URL(path, getApiUrl()).toString();
      const today = new Date().toISOString().slice(0, 10);

      if (Platform.OS === "web") {
        const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `vendors_${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      } else {
        const fileUri = FileSystem.cacheDirectory + `vendors_${today}.csv`;
        const result = await FileSystem.downloadAsync(url, fileUri, {
          headers: authHeaders(),
        });
        if (result.status !== 200) throw new Error(`${result.status}`);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(result.uri, {
            mimeType: "text/csv",
            dialogTitle: "تصدير قائمة التجار",
            UTI: "public.comma-separated-values-text",
          });
        } else {
          Alert.alert("تصدير", `تم حفظ الملف في:\n${result.uri}`);
        }
      }
    } catch {
      Alert.alert("خطأ", "تعذر تصدير البيانات، يرجى المحاولة مجدداً");
    } finally {
      setIsExporting(false);
    }
  };

  // Group vendors by city (after applying status filter)
  const allSections: VendorSection[] = useMemo(() => {
    const allVendors = vendorsData?.vendors ?? [];
    const vendors = selectedStatus === "all"
      ? allVendors
      : allVendors.filter((v) =>
          selectedStatus === "active" ? v.status === "active" : v.status !== "active"
        );
    const cityMap = new Map<string, Vendor[]>();
    for (const v of vendors) {
      const key = v.cityNameAr ?? "غير محدد";
      if (!cityMap.has(key)) cityMap.set(key, []);
      cityMap.get(key)!.push(v);
    }
    return Array.from(cityMap.entries()).map(([title, data]) => ({ title, data }));
  }, [vendorsData, selectedStatus]);

  const cities = useMemo(() => allSections.map((s) => s.title), [allSections]);

  // Highlight the first city chip as soon as data loads (or when status filter changes)
  useEffect(() => {
    setSelectedCity(allSections.length > 0 ? allSections[0].title : null);
  }, [allSections]);

  const sections: VendorSection[] = allSections;

  const scrollToCity = (city: string | null) => {
    setSelectedCity(city);
    if (city === null) {
      sectionListRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true, viewOffset: 0 });
      return;
    }
    const idx = allSections.findIndex((s) => s.title === city);
    if (idx < 0) return;
    sectionListRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true, viewOffset: 0 });
  };

  // Stable viewability config — must not be recreated on each render
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10,
    minimumViewTime: 50,
  }).current;

  // Stable callback — SectionList requires this not to change between renders
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;
      const firstSection = (viewableItems[0] as any).section as VendorSection | undefined;
      if (firstSection?.title) {
        setSelectedCity(firstSection.title);
      }
    }
  ).current;

  // Auto-scroll the chip bar whenever selectedCity changes
  useEffect(() => {
    if (!selectedCity) return;
    const layout = chipLayoutRef.current[selectedCity];
    if (!layout) return;
    const barWidth = chipBarWidthRef.current;
    // Center the chip in the visible area
    const targetX = layout.x - barWidth / 2 + layout.width / 2;
    chipScrollRef.current?.scrollTo({ x: Math.max(0, targetX), animated: true });
  }, [selectedCity]);

  const renderVendorRow = ({ item }: { item: Vendor }) => {
    const isActive = item.status === "active";
    const isPending = statusMutation.isPending && statusMutation.variables?.vendorId === item.vendorId;
    return (
      <Pressable
        testID={`vendor-row-${item.vendorId}`}
        onPress={() => openVendor(item)}
        style={({ pressed }) => [
          styles.vendorRow,
          {
            backgroundColor: theme.backgroundDefault,
            opacity: pressed ? 0.85 : 1,
            borderWidth: 1,
            borderColor: isActive ? "transparent" : (theme.border ?? "#E5E7EB"),
          },
        ]}
      >
        <View
          style={[
            styles.vendorIcon,
            { backgroundColor: isActive ? theme.primary + "15" : (theme.border ?? "#E5E7EB") + "50" },
          ]}
        >
          <Feather name="tool" size={18} color={isActive ? theme.primary : theme.textSecondary} />
        </View>
        <View style={styles.vendorInfo}>
          <ThemedText
            style={[
              styles.vendorName,
              { fontFamily: "Cairo_700Bold", color: isActive ? theme.textPrimary : theme.textSecondary },
            ]}
          >
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
          ) : null}
          {item.phone ? (
            <Pressable
              testID={`button-call-${item.vendorId}`}
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(`tel:${item.phone}`);
              }}
              hitSlop={8}
            >
              <ThemedText
                style={[
                  styles.vendorPhone,
                  { color: theme.primary, fontFamily: "Cairo_400Regular" },
                ]}
              >
                {item.phone}
              </ThemedText>
            </Pressable>
          ) : null}
          {item.whatsappNumber ? (
            <Pressable
              testID={`button-whatsapp-${item.vendorId}`}
              onPress={(e) => {
                e.stopPropagation();
                const num = item.whatsappNumber!.replace(/\D/g, "");
                Linking.openURL(`https://wa.me/${num}`);
              }}
              hitSlop={8}
              style={styles.whatsappRow}
            >
              <Feather name="message-circle" size={13} color="#25D366" />
              <ThemedText
                style={[
                  styles.vendorPhone,
                  { color: "#25D366", fontFamily: "Cairo_400Regular" },
                ]}
              >
                {item.whatsappNumber}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.rowActions}>
          <Pressable
            testID={`button-toggle-status-${item.vendorId}`}
            onPress={(e) => {
              e.stopPropagation();
              handleToggleStatus(item);
            }}
            hitSlop={8}
            disabled={isPending}
            style={({ pressed }) => [
              styles.statusBadge,
              {
                backgroundColor: isActive ? "#E8F5E9" : "#FFF3E0",
                borderColor: isActive ? "#4CAF50" : "#FF9800",
                opacity: pressed || isPending ? 0.6 : 1,
              },
            ]}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={isActive ? "#4CAF50" : "#FF9800"} style={{ width: 40 }} />
            ) : (
              <ThemedText
                style={[
                  styles.statusBadgeText,
                  { color: isActive ? "#388E3C" : "#E65100", fontFamily: "Cairo_700Bold" },
                ]}
              >
                {isActive ? "نشط" : "معطل"}
              </ThemedText>
            )}
          </Pressable>
          <Feather name="chevron-left" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>
    );
  };

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

  const STATUS_CHIPS: { key: "all" | "active" | "inactive"; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "active", label: "نشط" },
    { key: "inactive", label: "معطل" },
  ];

  const totalCount = (vendorsData?.vendors ?? []).length;
  const filteredCount = allSections.reduce((acc, s) => acc + s.data.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Status filter chips — always visible */}
      <View
        style={[
          styles.statusChipBar,
          { paddingTop: headerHeight + Spacing.sm, backgroundColor: theme.backgroundRoot },
        ]}
      >
        {STATUS_CHIPS.map(({ key, label }) => {
          const isSelected = selectedStatus === key;
          return (
            <Pressable
              key={key}
              testID={`chip-status-${key}`}
              onPress={() => setSelectedStatus(key)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                  borderColor: isSelected ? theme.primary : (theme.border ?? "#E5E7EB"),
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? "#fff" : theme.textPrimary,
                    fontFamily: "Cairo_700Bold",
                  },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* City chips — horizontal scrollable, shown only when multiple cities */}
      {cities.length > 1 ? (
        <ScrollView
          ref={chipScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipBar}
          contentContainerStyle={styles.chipBarContent}
          onLayout={(e) => { chipBarWidthRef.current = e.nativeEvent.layout.width; }}
        >
          <Pressable
            testID="chip-city-all"
            onPress={() => scrollToCity(null)}
            style={[
              styles.chip,
              {
                backgroundColor: selectedCity === null ? theme.primary : theme.backgroundDefault,
                borderColor: selectedCity === null ? theme.primary : (theme.border ?? "#E5E7EB"),
              },
            ]}
          >
            <ThemedText
              style={[
                styles.chipText,
                {
                  color: selectedCity === null ? "#fff" : theme.textPrimary,
                  fontFamily: "Cairo_700Bold",
                },
              ]}
            >
              الكل
            </ThemedText>
          </Pressable>
          {cities.map((city) => (
            <Pressable
              key={city}
              testID={`chip-city-${city}`}
              onPress={() => scrollToCity(city)}
              onLayout={(e) => {
                chipLayoutRef.current[city] = {
                  x: e.nativeEvent.layout.x,
                  width: e.nativeEvent.layout.width,
                };
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedCity === city ? theme.primary : theme.backgroundDefault,
                  borderColor: selectedCity === city ? theme.primary : (theme.border ?? "#E5E7EB"),
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  {
                    color: selectedCity === city ? "#fff" : theme.textPrimary,
                    fontFamily: "Cairo_700Bold",
                  },
                ]}
              >
                {city}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.vendorId}
        renderItem={renderVendorRow}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <ThemedText style={[styles.listHeaderCount, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {selectedStatus === "all"
                ? `${totalCount} تاجر مسجل`
                : `${filteredCount} من ${totalCount}`}
            </ThemedText>
            <Pressable
              testID="button-export-vendors-csv"
              onPress={handleExport}
              disabled={isExporting || (vendorsData?.vendors ?? []).length === 0}
              style={({ pressed }) => [
                styles.exportBtn,
                {
                  backgroundColor: theme.primary + "14",
                  borderColor: theme.primary + "40",
                  opacity: pressed || isExporting || (vendorsData?.vendors ?? []).length === 0 ? 0.5 : 1,
                },
              ]}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Feather name="download" size={13} color={theme.primary} />
              )}
              <ThemedText style={[styles.exportBtnText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                تصدير CSV
              </ThemedText>
            </Pressable>
          </View>
        }
        contentContainerStyle={{
          paddingTop: Spacing.md,
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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
                  {selectedVendor?.vendorName}
                </ThemedText>
              </View>
            </View>

            {/* Tab switcher */}
            <View style={[styles.tabBar, { borderBottomColor: theme.border ?? "#E5E7EB" }]}>
              <Pressable
                testID="tab-makes"
                onPress={() => setActiveTab("makes")}
                style={[
                  styles.tabBtn,
                  activeTab === "makes" && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
                ]}
              >
                <ThemedText
                  style={[
                    styles.tabBtnText,
                    {
                      color: activeTab === "makes" ? theme.primary : theme.textSecondary,
                      fontFamily: activeTab === "makes" ? "Cairo_700Bold" : "Cairo_400Regular",
                    },
                  ]}
                >
                  ماركات السيارات
                </ThemedText>
              </Pressable>
              <Pressable
                testID="tab-history"
                onPress={() => setActiveTab("history")}
                style={[
                  styles.tabBtn,
                  activeTab === "history" && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
                ]}
              >
                <ThemedText
                  style={[
                    styles.tabBtnText,
                    {
                      color: activeTab === "history" ? theme.primary : theme.textSecondary,
                      fontFamily: activeTab === "history" ? "Cairo_700Bold" : "Cairo_400Regular",
                    },
                  ]}
                >
                  سجل الحالة
                </ThemedText>
              </Pressable>
            </View>

            {activeTab === "makes" ? (
              makesLoading ? (
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
              )
            ) : auditLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (auditData?.entries ?? []).length === 0 ? (
              <View style={[styles.centered, { paddingVertical: Spacing.xl * 2 }]}>
                <Feather name="clock" size={36} color={theme.textSecondary} />
                <ThemedText
                  style={[
                    styles.emptyText,
                    { color: theme.textSecondary, fontFamily: "Cairo_400Regular", marginTop: Spacing.md },
                  ]}
                >
                  لا يوجد سجل حالة
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={auditData?.entries ?? []}
                keyExtractor={(item) => item.auditId}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: Spacing.lg,
                  paddingTop: Spacing.md,
                  paddingBottom: insets.bottom + Spacing.xl,
                  gap: Spacing.sm,
                }}
                renderItem={({ item }) => {
                  const cfg = getVendorActionLabel(item.action);
                  const actor = item.payload?.actorName ?? item.payload?.actorMobile ?? "النظام";
                  return (
                    <View
                      testID={`history-entry-${item.auditId}`}
                      style={[
                        styles.historyCard,
                        {
                          backgroundColor: theme.backgroundRoot,
                          borderColor: cfg.color + "30",
                        },
                      ]}
                    >
                      <View style={[styles.historyDot, { backgroundColor: cfg.color + "18" }]}>
                        <Feather name={cfg.icon} size={16} color={cfg.color} />
                      </View>
                      <View style={styles.historyInfo}>
                        <ThemedText style={[styles.historyAction, { color: cfg.color, fontFamily: "Cairo_700Bold" }]}>
                          {cfg.label}
                        </ThemedText>
                        <ThemedText style={[styles.historyActor, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                          {`بواسطة ${actor}`}
                        </ThemedText>
                        <ThemedText style={[styles.historyDate, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                          {formatExactDateTime(item.createdAt)}
                        </ThemedText>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {activeTab === "makes" ? (
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
            ) : null}
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
  listHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  listHeaderCount: {
    fontSize: 13,
  },
  exportBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  exportBtnText: {
    fontSize: 13,
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
  vendorPhone: {
    fontSize: 12,
    textAlign: "right",
  },
  whatsappRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  rowActions: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
  },
  statusBadgeText: {
    fontSize: 12,
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
  statusChipBar: {
    flexDirection: "row-reverse",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  chipBar: {
    flexGrow: 0,
  },
  chipBarContent: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  tabBar: {
    flexDirection: "row-reverse",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  tabBtnText: {
    fontSize: 13,
  },
  historyCard: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  historyDot: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  historyInfo: {
    flex: 1,
    gap: 3,
  },
  historyAction: {
    fontSize: 14,
    textAlign: "right",
  },
  historyActor: {
    fontSize: 12,
    textAlign: "right",
  },
  historyDate: {
    fontSize: 12,
    textAlign: "right",
  },
});
