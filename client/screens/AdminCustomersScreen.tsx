import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useUser } from "@/context/UserContext";

interface CustomerItem {
  customerId: string;
  fullName: string | null;
  mobileE164: string;
  email: string | null;
  isAdmin: boolean | null;
  createdAt: string;
  cityId: string | null;
}

interface CityItem {
  cityId: string;
  nameAr: string;
  nameEn: string;
}

interface CustomersResponse {
  customers: CustomerItem[];
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
    targetName?: string | null;
    targetMobile?: string | null;
    vendorName?: string | null;
    fullName?: string | null;
    inspectionNo?: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    reason?: string | null;
  } | null;
}

interface AuditLogResponse {
  entries: AuditEntry[];
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

type AuditActionConfig = {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
  getDetail?: (payload: AuditEntry["payload"]) => string | null;
};

function getActionConfig(action: string, payload: AuditEntry["payload"]): AuditActionConfig {
  switch (action) {
    case "admin_granted":
      return {
        label: `منح صلاحيات المشرف  ${payload?.targetName ?? payload?.targetMobile ?? ""}`.trim(),
        icon: "shield",
        color: "#22C55E",
      };
    case "admin_revoked":
      return {
        label: `سحب صلاحيات المشرف  ${payload?.targetName ?? payload?.targetMobile ?? ""}`.trim(),
        icon: "shield-off",
        color: "#EF4444",
      };
    case "vendor_created":
      return {
        label: `إضافة مورد: ${payload?.vendorName ?? ""}`.trim(),
        icon: "plus-circle",
        color: "#3B82F6",
      };
    case "vendor_activated":
      return {
        label: `تفعيل المورد: ${payload?.vendorName ?? ""}`.trim(),
        icon: "check-circle",
        color: "#22C55E",
      };
    case "vendor_deactivated":
      return {
        label: `إيقاف المورد: ${payload?.vendorName ?? ""}`.trim(),
        icon: "x-circle",
        color: "#EF4444",
      };
    case "vendor_user_created":
      return {
        label: `إضافة مستخدم مورد: ${payload?.fullName ?? payload?.vendorName ?? ""}`.trim(),
        icon: "user-plus",
        color: "#8B5CF6",
      };
    case "vendor_user_removed":
      return {
        label: `حذف مستخدم مورد: ${payload?.fullName ?? ""}`.trim(),
        icon: "user-minus",
        color: "#F59E0B",
      };
    case "inspection_status_override":
      return {
        label: `تغيير حالة الطلب ${payload?.inspectionNo ?? ""}`.trim(),
        icon: "edit-2",
        color: "#F97316",
        getDetail: (p) =>
          p?.previousStatus && p?.newStatus
            ? `${p.previousStatus} ← ${p.newStatus}`
            : null,
      };
    default:
      return {
        label: action,
        icon: "activity",
        color: "#6B7280",
      };
  }
}

function AuditEntryRow({ entry, index }: { entry: AuditEntry; index: number }) {
  const { theme } = useTheme();
  const config = getActionConfig(entry.action, entry.payload);
  const actorLabel =
    entry.payload?.actorName ?? entry.payload?.actorMobile ?? "النظام";
  const detail = config.getDetail?.(entry.payload);

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 30)}>
      <View
        style={[
          styles.auditCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: config.color + "30",
          },
        ]}
        testID={`audit-entry-${entry.auditId}`}
      >
        <View
          style={[
            styles.auditDot,
            { backgroundColor: config.color + "20" },
          ]}
        >
          <Feather name={config.icon} size={14} color={config.color} />
        </View>
        <View style={styles.auditInfo}>
          <ThemedText
            style={[styles.auditAction, { fontFamily: "Cairo_600SemiBold" }]}
            numberOfLines={2}
          >
            {config.label}
          </ThemedText>
          {detail ? (
            <ThemedText
              style={[styles.auditMeta, { color: config.color, fontFamily: "Cairo_400Regular" }]}
            >
              {detail}
            </ThemedText>
          ) : null}
          <ThemedText
            style={[styles.auditMeta, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}
          >
            {`بواسطة ${actorLabel}  •  ${formatRelativeTime(entry.createdAt)}`}
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

function CustomerRow({
  item,
  index,
  currentUserId,
  onToggle,
  isPending,
}: {
  item: CustomerItem;
  index: number;
  currentUserId: string | undefined;
  onToggle: (customerId: string, isAdmin: boolean) => void;
  isPending: boolean;
}) {
  const { theme } = useTheme();
  const isCurrentUser = item.customerId === currentUserId;
  const adminStatus = !!item.isAdmin;

  const handleToggle = () => {
    if (isCurrentUser) return;
    const action = adminStatus ? "سحب صلاحيات المشرف من" : "منح صلاحيات المشرف لـ";
    Alert.alert(
      "تأكيد",
      `${action} ${item.fullName ?? item.mobileE164}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          style: adminStatus ? "destructive" : "default",
          onPress: () => onToggle(item.customerId, !adminStatus),
        },
      ]
    );
  };

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 40)}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: adminStatus ? theme.primary + "40" : theme.border,
          },
        ]}
        testID={`card-customer-${item.customerId}`}
      >
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: adminStatus
                  ? theme.primary + "20"
                  : theme.backgroundSecondary ?? theme.border,
              },
            ]}
          >
            <Feather
              name={adminStatus ? "shield" : "user"}
              size={20}
              color={adminStatus ? theme.primary : theme.textSecondary}
            />
          </View>
          <View style={styles.info}>
            <ThemedText
              style={[styles.name, { fontFamily: "Cairo_700Bold" }]}
              numberOfLines={1}
            >
              {item.fullName ?? "بدون اسم"}
            </ThemedText>
            <ThemedText
              style={[
                styles.mobile,
                { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
              ]}
            >
              {item.mobileE164}
            </ThemedText>
            {item.email ? (
              <ThemedText
                style={[
                  styles.email,
                  { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
                ]}
                numberOfLines={1}
              >
                {item.email}
              </ThemedText>
            ) : null}
            {adminStatus ? (
              <View
                style={[
                  styles.adminBadge,
                  { backgroundColor: theme.primary + "18" },
                ]}
              >
                <ThemedText
                  style={[
                    styles.adminBadgeText,
                    { color: theme.primary, fontFamily: "Cairo_600SemiBold" },
                  ]}
                >
                  مشرف
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {isCurrentUser ? (
          <View style={styles.selfTag}>
            <ThemedText
              style={[
                styles.selfTagText,
                { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
              ]}
            >
              أنت
            </ThemedText>
          </View>
        ) : (
          <Switch
            testID={`switch-admin-${item.customerId}`}
            value={adminStatus}
            onValueChange={handleToggle}
            disabled={isPending}
            trackColor={{ false: theme.border, true: theme.primary + "80" }}
            thumbColor={adminStatus ? theme.primary : theme.textSecondary}
          />
        )}
      </View>
    </Animated.View>
  );
}

type DatePreset = "today" | "week" | "month" | null;

function presetToDateRange(preset: DatePreset): { since: string; until: string } | null {
  if (!preset) return null;
  const now = new Date();
  const until = now.toISOString().slice(0, 10);
  if (preset === "today") return { since: until, until };
  if (preset === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { since: d.toISOString().slice(0, 10), until };
  }
  if (preset === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { since: d.toISOString().slice(0, 10), until };
  }
  return null;
}

export default function AdminCustomersScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  // Audit log filters
  const [auditPerson, setAuditPerson] = useState("");
  const [auditDatePreset, setAuditDatePreset] = useState<DatePreset>(null);
  const [auditEntityType, setAuditEntityType] = useState<string | null>(null);

  const auditQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (auditPerson.trim()) params.set("person", auditPerson.trim());
    const range = presetToDateRange(auditDatePreset);
    if (range) {
      params.set("since", range.since);
      params.set("until", range.until);
    }
    if (auditEntityType) params.set("entityType", auditEntityType);
    const qs = params.toString();
    return qs ? `/api/admin/audit-log?${qs}` : "/api/admin/audit-log";
  }, [auditPerson, auditDatePreset, auditEntityType]);

  const hasAuditFilters =
    auditPerson.trim().length > 0 || auditDatePreset !== null || auditEntityType !== null;

  const { data, isLoading, isError, refetch } = useQuery<CustomersResponse>({
    queryKey: ["/api/customers/all"],
    staleTime: 0,
  });

  const { data: citiesData } = useQuery<{ cities: CityItem[] }>({
    queryKey: ["/api/cities"],
    staleTime: 60000,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<AuditLogResponse>({
    queryKey: [auditQueryUrl],
    staleTime: 0,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      customerId,
      isAdmin,
    }: {
      customerId: string;
      isAdmin: boolean;
    }) => {
      const res = await apiRequest("PATCH", `/api/customers/${customerId}/admin`, {
        isAdmin,
      });
      return res.json();
    },
    onMutate: ({ customerId }) => {
      setPendingId(customerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-log"] });
    },
    onError: () => {
      Alert.alert("خطأ", "حدث خطأ أثناء تعديل الصلاحيات، يرجى المحاولة مجدداً");
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  const handleToggle = (customerId: string, isAdmin: boolean) => {
    toggleMutation.mutate({ customerId, isAdmin });
  };

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
        <ThemedText
          style={[
            styles.errorTitle,
            { fontFamily: "Cairo_700Bold", marginTop: Spacing.md },
          ]}
        >
          تعذر تحميل البيانات
        </ThemedText>
        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => [
            styles.retryBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ThemedText style={[styles.retryText, { fontFamily: "Cairo_600SemiBold" }]}>
            إعادة المحاولة
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const customerList = data?.customers ?? [];
  const adminCount = customerList.filter((c) => !!c.isAdmin).length;

  const cityList = citiesData?.cities ?? [];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredList = customerList.filter((c) => {
    if (adminsOnly && !c.isAdmin) return false;
    if (selectedCityId && c.cityId !== selectedCityId) return false;
    if (normalizedQuery.length === 0) return true;
    const nameMatch = (c.fullName ?? "").toLowerCase().includes(normalizedQuery);
    const mobileMatch = c.mobileE164.toLowerCase().includes(normalizedQuery);
    return nameMatch || mobileMatch;
  });

  const auditEntries = auditData?.entries ?? [];

  const DATE_PRESETS: { key: DatePreset; label: string }[] = [
    { key: "today", label: "اليوم" },
    { key: "week", label: "آخر 7 أيام" },
    { key: "month", label: "آخر 30 يوم" },
  ];

  const ENTITY_TYPES: { key: string; label: string }[] = [
    { key: "customer", label: "عملاء" },
    { key: "vendor", label: "موردون" },
    { key: "vendor_user", label: "مستخدمو الموردين" },
    { key: "inspection", label: "طلبات" },
  ];

  const auditFilterBar = (
    <View style={styles.auditFilterBar}>
      {/* Person search */}
      <View
        style={[
          styles.auditSearchRow,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        <Feather name="user" size={14} color={theme.textSecondary} />
        <TextInput
          testID="input-audit-person"
          style={[styles.auditSearchInput, { color: theme.text, fontFamily: "Cairo_400Regular" }]}
          placeholder="بحث بالاسم أو الجوال أو المورد"
          placeholderTextColor={theme.textSecondary}
          value={auditPerson}
          onChangeText={setAuditPerson}
          textAlign="right"
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {auditPerson.length > 0 ? (
          <Pressable onPress={() => setAuditPerson("")} hitSlop={8} testID="button-clear-audit-person">
            <Feather name="x" size={13} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Entity type filter chips */}
      <View style={styles.auditDateRow}>
        {ENTITY_TYPES.map(({ key, label }) => {
          const active = auditEntityType === key;
          return (
            <Pressable
              key={key}
              testID={`button-audit-entity-${key}`}
              onPress={() => setAuditEntityType(active ? null : key)}
              style={[
                styles.auditPresetChip,
                {
                  backgroundColor: active ? theme.primary + "18" : theme.backgroundDefault,
                  borderColor: active ? theme.primary + "60" : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.auditPresetChipText,
                  {
                    color: active ? theme.primary : theme.textSecondary,
                    fontFamily: active ? "Cairo_600SemiBold" : "Cairo_400Regular",
                  },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Date preset chips */}
      <View style={styles.auditDateRow}>
        {DATE_PRESETS.map(({ key, label }) => {
          const active = auditDatePreset === key;
          return (
            <Pressable
              key={key ?? "all"}
              testID={`button-audit-preset-${key}`}
              onPress={() => setAuditDatePreset(active ? null : key)}
              style={[
                styles.auditPresetChip,
                {
                  backgroundColor: active ? theme.primary + "18" : theme.backgroundDefault,
                  borderColor: active ? theme.primary + "60" : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.auditPresetChipText,
                  {
                    color: active ? theme.primary : theme.textSecondary,
                    fontFamily: active ? "Cairo_600SemiBold" : "Cairo_400Regular",
                  },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}

        {hasAuditFilters ? (
          <Pressable
            testID="button-clear-audit-filters"
            onPress={() => {
              setAuditPerson("");
              setAuditDatePreset(null);
              setAuditEntityType(null);
            }}
            style={[styles.auditClearBtn, { borderColor: theme.border }]}
          >
            <Feather name="x" size={13} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const auditSection = (
    <View style={styles.auditSection}>
      <View style={styles.sectionHeader}>
        <Feather name="clock" size={14} color={theme.textSecondary} />
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Cairo_600SemiBold" }]}
        >
          سجل التغييرات
        </ThemedText>
      </View>

      {auditFilterBar}

      {auditLoading ? (
        <View style={styles.auditLoading}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : auditEntries.length > 0 ? (
        auditEntries.map((entry, idx) => (
          <AuditEntryRow key={entry.auditId} entry={entry} index={idx} />
        ))
      ) : (
        <View style={styles.auditEmpty}>
          <Feather name="inbox" size={28} color={theme.textSecondary} />
          <ThemedText style={[styles.auditEmptyText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            {hasAuditFilters ? "لا توجد نتائج للفلاتر المحددة" : "لا توجد تغييرات بعد"}
          </ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.customerId}
        renderItem={({ item, index }) => (
          <CustomerRow
            item={item}
            index={index}
            currentUserId={user?.customerId}
            onToggle={handleToggle}
            isPending={pendingId === item.customerId}
          />
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View
              style={[
                styles.searchRow,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <Feather name="search" size={16} color={theme.textSecondary} />
              <TextInput
                testID="input-customer-search"
                style={[
                  styles.searchInput,
                  { color: theme.text, fontFamily: "Cairo_400Regular" },
                ]}
                placeholder="بحث بالاسم أو رقم الجوال"
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                textAlign="right"
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  hitSlop={8}
                  testID="button-clear-search"
                >
                  <Feather name="x" size={15} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {cityList.length > 0 ? (
              <View style={styles.cityFilterRow}>
                <Pressable
                  testID="button-city-all"
                  onPress={() => setSelectedCityId(null)}
                  style={[
                    styles.cityChip,
                    {
                      backgroundColor: selectedCityId === null ? theme.primary + "18" : theme.backgroundDefault,
                      borderColor: selectedCityId === null ? theme.primary + "60" : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.cityChipText,
                      {
                        color: selectedCityId === null ? theme.primary : theme.textSecondary,
                        fontFamily: selectedCityId === null ? "Cairo_600SemiBold" : "Cairo_400Regular",
                      },
                    ]}
                  >
                    كل المدن
                  </ThemedText>
                </Pressable>
                {cityList.map((city) => {
                  const active = selectedCityId === city.cityId;
                  return (
                    <Pressable
                      key={city.cityId}
                      testID={`button-city-${city.cityId}`}
                      onPress={() => setSelectedCityId(active ? null : city.cityId)}
                      style={[
                        styles.cityChip,
                        {
                          backgroundColor: active ? theme.primary + "18" : theme.backgroundDefault,
                          borderColor: active ? theme.primary + "60" : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.cityChipText,
                          {
                            color: active ? theme.primary : theme.textSecondary,
                            fontFamily: active ? "Cairo_600SemiBold" : "Cairo_400Regular",
                          },
                        ]}
                      >
                        {city.nameAr}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Pressable
              testID="toggle-admins-only"
              onPress={() => setAdminsOnly((v) => !v)}
              style={[
                styles.adminFilter,
                {
                  backgroundColor: adminsOnly
                    ? theme.primary + "18"
                    : theme.backgroundDefault,
                  borderColor: adminsOnly ? theme.primary + "60" : theme.border,
                },
              ]}
            >
              <Feather
                name="shield"
                size={13}
                color={adminsOnly ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.adminFilterText,
                  {
                    color: adminsOnly ? theme.primary : theme.textSecondary,
                    fontFamily: "Cairo_600SemiBold",
                  },
                ]}
              >
                المشرفون فقط
              </ThemedText>
            </Pressable>

            {customerList.length > 0 ? (
              <View style={styles.statsRow}>
                <View
                  style={[styles.statChip, { backgroundColor: theme.primary + "14" }]}
                >
                  <Feather name="users" size={13} color={theme.primary} />
                  <ThemedText
                    style={[
                      styles.statText,
                      { color: theme.primary, fontFamily: "Cairo_600SemiBold" },
                    ]}
                  >
                    {filteredList.length !== customerList.length
                      ? `${filteredList.length} / ${customerList.length} عميل`
                      : `${customerList.length} عميل`}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statChip,
                    { backgroundColor: theme.primary + "14" },
                  ]}
                >
                  <Feather name="shield" size={13} color={theme.primary} />
                  <ThemedText
                    style={[
                      styles.statText,
                      { color: theme.primary, fontFamily: "Cairo_600SemiBold" },
                    ]}
                  >
                    {adminCount} مشرف
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={auditSection}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather
              name={normalizedQuery.length > 0 || adminsOnly || selectedCityId !== null ? "search" : "users"}
              size={48}
              color={theme.textSecondary}
            />
            <ThemedText
              style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}
            >
              {normalizedQuery.length > 0
                ? "لا توجد نتائج للبحث"
                : adminsOnly
                ? "لا يوجد مشرفون"
                : selectedCityId !== null
                ? "لا يوجد عملاء في هذه المدينة"
                : "لا يوجد عملاء"}
            </ThemedText>
            {(normalizedQuery.length > 0 || adminsOnly || selectedCityId !== null) ? (
              <Pressable
                testID="button-clear-filters"
                onPress={() => {
                  setSearchQuery("");
                  setAdminsOnly(false);
                  setSelectedCityId(null);
                }}
              >
                <ThemedText
                  style={[
                    styles.clearFiltersText,
                    { color: theme.primary, fontFamily: "Cairo_600SemiBold" },
                  ]}
                >
                  مسح الفلاتر
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorTitle: { fontSize: 16, textAlign: "center" },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: "#fff", fontSize: 14 },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  listHeader: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  adminFilter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  adminFilterText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  statText: { fontSize: 12 },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    textAlign: "right",
  },
  mobile: {
    fontSize: 12,
    textAlign: "right",
  },
  email: {
    fontSize: 11,
    textAlign: "right",
  },
  adminBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs ?? 4,
    marginTop: 2,
  },
  adminBadgeText: {
    fontSize: 11,
  },
  selfTag: {
    paddingHorizontal: Spacing.sm,
  },
  selfTagText: {
    fontSize: 12,
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
  clearFiltersText: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  auditSection: {
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  auditLoading: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
  },
  auditCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  auditDot: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  auditInfo: {
    flex: 1,
    gap: 2,
  },
  auditAction: {
    fontSize: 13,
    textAlign: "right",
  },
  auditMeta: {
    fontSize: 11,
    textAlign: "right",
  },
  auditFilterBar: {
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  auditSearchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  auditSearchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  auditDateRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  auditPresetChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  auditPresetChipText: {
    fontSize: 12,
  },
  auditClearBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  auditEmpty: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  auditEmptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  cityFilterRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  cityChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  cityChipText: {
    fontSize: 12,
  },
});
