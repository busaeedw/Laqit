import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl, authHeaders } from "@/lib/query-client";
import { useUser } from "@/context/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

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

interface ExportSchedule {
  scheduleId: string;
  frequency: string;
  recipientEmails: string[];
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface SchedulesResponse {
  schedules: ExportSchedule[];
}

function CustomerRow({
  item,
  index,
  currentUserId,
  onToggle,
  isPending,
  cityList,
}: {
  item: CustomerItem;
  index: number;
  currentUserId: string | undefined;
  onToggle: (customerId: string, isAdmin: boolean) => void;
  isPending: boolean;
  cityList: CityItem[];
}) {
  const { theme } = useTheme();
  const isCurrentUser = item.customerId === currentUserId;
  const adminStatus = !!item.isAdmin;
  const cityName = item.cityId
    ? (cityList.find((c) => c.cityId === item.cityId)?.nameAr ?? null)
    : null;

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
            {cityName ? (
              <View style={styles.cityLabel}>
                <Feather name="map-pin" size={10} color={theme.textSecondary} />
                <ThemedText
                  style={[
                    styles.cityLabelText,
                    { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
                  ]}
                >
                  {cityName}
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

function presetToDateRange(preset: DatePreset): { since: Date; until: Date } | null {
  if (!preset) return null;
  const now = new Date();
  const until = new Date(now);
  until.setHours(23, 59, 59, 999);
  if (preset === "today") {
    const since = new Date(now);
    since.setHours(0, 0, 0, 0);
    return { since, until };
  }
  if (preset === "week") {
    const since = new Date(now);
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    return { since, until };
  }
  if (preset === "month") {
    const since = new Date(now);
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);
    return { since, until };
  }
  return null;
}

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "week", label: "آخر 7 أيام" },
  { key: "month", label: "آخر 30 يوم" },
];

export default function AdminCustomersScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [newFrequency, setNewFrequency] = useState<"daily" | "weekly">("weekly");
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [runningNowId, setRunningNowId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<CustomersResponse>({
    queryKey: ["/api/customers/all"],
    staleTime: 0,
  });

  const { data: schedulesData, isLoading: schedulesLoading } = useQuery<SchedulesResponse>({
    queryKey: ["/api/admin/export-schedules"],
    staleTime: 30000,
  });

  const createScheduleMutation = useMutation({
    mutationFn: async ({ frequency, recipientEmails }: { frequency: string; recipientEmails: string[] }) => {
      const res = await apiRequest("POST", "/api/admin/export-schedules", { frequency, recipientEmails });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/export-schedules"] });
      setEmailList([]);
      setEmailInput("");
    },
    onError: () => {
      Alert.alert("خطأ", "تعذر إنشاء الجدولة، يرجى المحاولة مجدداً");
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/export-schedules/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/export-schedules"] });
    },
    onError: () => {
      Alert.alert("خطأ", "تعذر تعديل الجدولة، يرجى المحاولة مجدداً");
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/export-schedules/${id}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/export-schedules"] });
    },
    onError: () => {
      Alert.alert("خطأ", "تعذر حذف الجدولة، يرجى المحاولة مجدداً");
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async (id: string) => {
      setRunningNowId(id);
      const res = await apiRequest("POST", `/api/admin/export-schedules/${id}/run-now`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/export-schedules"] });
      Alert.alert("تم الإرسال", "تم إرسال قائمة العملاء بنجاح");
    },
    onError: () => {
      Alert.alert("خطأ", "تعذر إرسال التقرير، تأكد من صحة إعدادات البريد الإلكتروني");
    },
    onSettled: () => {
      setRunningNowId(null);
    },
  });

  const { data: citiesData } = useQuery<{ cities: CityItem[] }>({
    queryKey: ["/api/cities"],
    staleTime: 60000,
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
      queryClient.invalidateQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === "string" &&
          (query.queryKey[0] as string).startsWith("/api/admin/audit-log"),
      });
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

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (adminsOnly) params.set("adminsOnly", "true");
      if (selectedCityId) params.set("cityId", selectedCityId);

      const exportDateRange = presetToDateRange(datePreset);

      const toLocalDateStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      const sinceLocalStr = exportDateRange ? toLocalDateStr(exportDateRange.since) : null;
      const untilLocalStr = exportDateRange ? toLocalDateStr(exportDateRange.until) : null;

      if (exportDateRange) {
        params.set("since", exportDateRange.since.toISOString());
        params.set("until", exportDateRange.until.toISOString());
      }

      const dateTag =
        sinceLocalStr && untilLocalStr
          ? `${sinceLocalStr}_${untilLocalStr}`
          : toLocalDateStr(new Date());

      const qs = params.toString();
      const path = `/api/customers/export${qs ? `?${qs}` : ""}`;
      const baseUrl = getApiUrl();
      const url = new URL(path, baseUrl).toString();

      if (Platform.OS === "web") {
        const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `customers_${dateTag}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      } else {
        const fileUri = FileSystem.cacheDirectory + `customers_${dateTag}.csv`;
        const result = await FileSystem.downloadAsync(url, fileUri, {
          headers: authHeaders(),
        });
        if (result.status !== 200) throw new Error(`${result.status}`);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(result.uri, {
            mimeType: "text/csv",
            dialogTitle: "تصدير قائمة العملاء",
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
  const dateRange = presetToDateRange(datePreset);
  const filteredList = customerList.filter((c) => {
    if (adminsOnly && !c.isAdmin) return false;
    if (selectedCityId && c.cityId !== selectedCityId) return false;
    if (dateRange) {
      const created = new Date(c.createdAt);
      if (created < dateRange.since || created > dateRange.until) return false;
    }
    if (normalizedQuery.length === 0) return true;
    const nameMatch = (c.fullName ?? "").toLowerCase().includes(normalizedQuery);
    const mobileMatch = c.mobileE164.toLowerCase().includes(normalizedQuery);
    return nameMatch || mobileMatch;
  });

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
            cityList={cityList}
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

            <View style={styles.cityFilterRow}>
              {DATE_PRESETS.map(({ key, label }) => {
                const active = datePreset === key;
                return (
                  <Pressable
                    key={key ?? "all"}
                    testID={`button-date-preset-${key}`}
                    onPress={() => setDatePreset(active ? null : key)}
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
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

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
                <Pressable
                  testID="button-export-customers"
                  onPress={handleExport}
                  disabled={isExporting || filteredList.length === 0}
                  style={({ pressed }) => [
                    styles.exportBtn,
                    {
                      backgroundColor: theme.primary + "14",
                      borderColor: theme.primary + "40",
                      opacity: pressed || isExporting || filteredList.length === 0 ? 0.5 : 1,
                    },
                  ]}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Feather name="download" size={13} color={theme.primary} />
                  )}
                  <ThemedText
                    style={[
                      styles.statText,
                      { color: theme.primary, fontFamily: "Cairo_600SemiBold" },
                    ]}
                  >
                    تصدير CSV
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            {/* ── Scheduled Export Panel ────────────────────────── */}
            <Pressable
              testID="button-toggle-schedule-panel"
              onPress={() => setShowSchedulePanel((v) => !v)}
              style={[
                styles.schedulePanelHeader,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: showSchedulePanel ? theme.primary + "60" : theme.border,
                },
              ]}
            >
              <Feather
                name="mail"
                size={14}
                color={showSchedulePanel ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.schedulePanelHeaderText,
                  {
                    color: showSchedulePanel ? theme.primary : theme.text,
                    fontFamily: "Cairo_600SemiBold",
                  },
                ]}
              >
                جدولة التصدير بالبريد الإلكتروني
              </ThemedText>
              <Feather
                name={showSchedulePanel ? "chevron-up" : "chevron-down"}
                size={14}
                color={showSchedulePanel ? theme.primary : theme.textSecondary}
              />
            </Pressable>

            {showSchedulePanel ? (
              <View
                style={[
                  styles.schedulePanel,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                {schedulesLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ alignSelf: "center" }} />
                ) : (schedulesData?.schedules ?? []).length > 0 ? (
                  (schedulesData?.schedules ?? []).map((sched) => (
                    <View
                      key={sched.scheduleId}
                      style={[
                        styles.scheduleItem,
                        { borderColor: sched.isActive ? theme.primary + "40" : theme.border },
                      ]}
                    >
                      <View style={styles.scheduleItemTop}>
                        <View style={{ flex: 1, gap: 3 }}>
                          <ThemedText
                            style={[styles.scheduleFreqText, { fontFamily: "Cairo_600SemiBold" }]}
                          >
                            {sched.frequency === "daily" ? "يومي" : "أسبوعي"}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.scheduleEmailsText,
                              { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
                            ]}
                            numberOfLines={2}
                          >
                            {sched.recipientEmails.join("، ")}
                          </ThemedText>
                          {sched.nextRunAt ? (
                            <ThemedText
                              style={[
                                styles.scheduleNextText,
                                { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
                              ]}
                            >
                              {"التالي: " + new Date(sched.nextRunAt).toLocaleDateString("ar-SA", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </ThemedText>
                          ) : null}
                          {sched.lastRunAt ? (
                            <ThemedText
                              style={[
                                styles.scheduleNextText,
                                { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
                              ]}
                            >
                              {"آخر إرسال: " + new Date(sched.lastRunAt).toLocaleDateString("ar-SA", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </ThemedText>
                          ) : null}
                        </View>
                        <View style={styles.scheduleItemActions}>
                          <Switch
                            testID={`switch-schedule-${sched.scheduleId}`}
                            value={sched.isActive}
                            onValueChange={(val) =>
                              toggleScheduleMutation.mutate({ id: sched.scheduleId, isActive: val })
                            }
                            trackColor={{ false: theme.border, true: theme.primary + "80" }}
                            thumbColor={sched.isActive ? theme.primary : theme.textSecondary}
                          />
                        </View>
                      </View>
                      <View style={styles.scheduleItemFooter}>
                        <Pressable
                          testID={`button-run-now-${sched.scheduleId}`}
                          disabled={runningNowId === sched.scheduleId}
                          onPress={() => runNowMutation.mutate(sched.scheduleId)}
                          style={({ pressed }) => [
                            styles.scheduleActionBtn,
                            {
                              backgroundColor: theme.primary + "14",
                              borderColor: theme.primary + "40",
                              opacity: pressed || runningNowId === sched.scheduleId ? 0.5 : 1,
                            },
                          ]}
                        >
                          {runningNowId === sched.scheduleId ? (
                            <ActivityIndicator size="small" color={theme.primary} />
                          ) : (
                            <Feather name="send" size={12} color={theme.primary} />
                          )}
                          <ThemedText
                            style={[
                              styles.scheduleActionText,
                              { color: theme.primary, fontFamily: "Cairo_600SemiBold" },
                            ]}
                          >
                            إرسال الآن
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          testID={`button-delete-schedule-${sched.scheduleId}`}
                          onPress={() => {
                            Alert.alert("حذف الجدولة", "هل أنت متأكد من حذف هذه الجدولة؟", [
                              { text: "إلغاء", style: "cancel" },
                              {
                                text: "حذف",
                                style: "destructive",
                                onPress: () => deleteScheduleMutation.mutate(sched.scheduleId),
                              },
                            ]);
                          }}
                          style={({ pressed }) => [
                            styles.scheduleActionBtn,
                            {
                              backgroundColor: "#FF3B3014",
                              borderColor: "#FF3B3040",
                              opacity: pressed ? 0.5 : 1,
                            },
                          ]}
                        >
                          <Feather name="trash-2" size={12} color="#FF3B30" />
                          <ThemedText
                            style={[
                              styles.scheduleActionText,
                              { color: "#FF3B30", fontFamily: "Cairo_600SemiBold" },
                            ]}
                          >
                            حذف
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ))
                ) : (
                  <ThemedText
                    style={[
                      styles.scheduleEmptyText,
                      { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
                    ]}
                  >
                    لا توجد جدولة مفعّلة بعد
                  </ThemedText>
                )}

                <View style={styles.scheduleNewForm}>
                  <ThemedText
                    style={[
                      styles.scheduleFormLabel,
                      { color: theme.text, fontFamily: "Cairo_600SemiBold" },
                    ]}
                  >
                    إنشاء جدولة جديدة
                  </ThemedText>
                  <View style={styles.freqRow}>
                    {(["daily", "weekly"] as const).map((freq) => {
                      const active = newFrequency === freq;
                      return (
                        <Pressable
                          key={freq}
                          testID={`button-freq-${freq}`}
                          onPress={() => setNewFrequency(freq)}
                          style={[
                            styles.cityChip,
                            {
                              backgroundColor: active ? theme.primary + "18" : theme.backgroundSecondary ?? theme.border,
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
                            {freq === "daily" ? "يومي" : "أسبوعي"}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View
                    style={[
                      styles.emailInputRow,
                      { backgroundColor: theme.backgroundRoot ?? theme.backgroundDefault, borderColor: theme.border },
                    ]}
                  >
                    <TextInput
                      testID="input-schedule-email"
                      style={[
                        styles.emailInputField,
                        { color: theme.text, fontFamily: "Cairo_400Regular" },
                      ]}
                      placeholder="البريد الإلكتروني"
                      placeholderTextColor={theme.textSecondary}
                      value={emailInput}
                      onChangeText={setEmailInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      textAlign="right"
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        const trimmed = emailInput.trim();
                        if (trimmed.includes("@") && !emailList.includes(trimmed)) {
                          setEmailList((prev) => [...prev, trimmed]);
                          setEmailInput("");
                        }
                      }}
                    />
                    <Pressable
                      testID="button-add-email"
                      onPress={() => {
                        const trimmed = emailInput.trim();
                        if (trimmed.includes("@") && !emailList.includes(trimmed)) {
                          setEmailList((prev) => [...prev, trimmed]);
                          setEmailInput("");
                        }
                      }}
                      style={({ pressed }) => [
                        styles.addEmailBtn,
                        { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Feather name="plus" size={14} color="#fff" />
                    </Pressable>
                  </View>
                  {emailList.length > 0 ? (
                    <View style={styles.emailTagsRow}>
                      {emailList.map((email) => (
                        <Pressable
                          key={email}
                          onPress={() => setEmailList((prev) => prev.filter((e) => e !== email))}
                          style={[
                            styles.emailTag,
                            { backgroundColor: theme.primary + "14", borderColor: theme.primary + "40" },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.emailTagText,
                              { color: theme.primary, fontFamily: "Cairo_400Regular" },
                            ]}
                          >
                            {email}
                          </ThemedText>
                          <Feather name="x" size={11} color={theme.primary} />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <Pressable
                    testID="button-create-schedule"
                    disabled={emailList.length === 0 || createScheduleMutation.isPending}
                    onPress={() => {
                      if (emailList.length === 0) return;
                      createScheduleMutation.mutate({ frequency: newFrequency, recipientEmails: emailList });
                    }}
                    style={({ pressed }) => [
                      styles.createScheduleBtn,
                      {
                        backgroundColor: theme.primary,
                        opacity:
                          pressed || emailList.length === 0 || createScheduleMutation.isPending ? 0.5 : 1,
                      },
                    ]}
                  >
                    {createScheduleMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : null}
                    <ThemedText
                      style={[
                        styles.createScheduleBtnText,
                        { fontFamily: "Cairo_600SemiBold" },
                      ]}
                    >
                      حفظ الجدولة
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <Pressable
            testID="button-open-audit-log"
            onPress={() => navigation.navigate("AdminAuditLog")}
            style={[
              styles.auditLogLink,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="clock" size={16} color={theme.primary} />
            <ThemedText
              style={[styles.auditLogLinkText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}
            >
              سجل التغييرات
            </ThemedText>
            <Feather name="chevron-left" size={16} color={theme.primary} />
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather
              name={normalizedQuery.length > 0 || adminsOnly || selectedCityId !== null || datePreset !== null ? "search" : "users"}
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
                : datePreset !== null
                ? "لا يوجد عملاء في هذه الفترة"
                : "لا يوجد عملاء"}
            </ThemedText>
            {(normalizedQuery.length > 0 || adminsOnly || selectedCityId !== null || datePreset !== null) ? (
              <Pressable
                testID="button-clear-filters"
                onPress={() => {
                  setSearchQuery("");
                  setAdminsOnly(false);
                  setSelectedCityId(null);
                  setDatePreset(null);
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
  exportBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
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
  cityLabel: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  cityLabelText: {
    fontSize: 11,
    textAlign: "right",
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
  auditLogLink: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  auditLogLinkText: {
    flex: 1,
    fontSize: 14,
    textAlign: "right",
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
  schedulePanelHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  schedulePanelHeaderText: {
    flex: 1,
    fontSize: 13,
    textAlign: "right",
  },
  schedulePanel: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  scheduleItem: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  scheduleItemTop: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  scheduleItemActions: {
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleItemFooter: {
    flexDirection: "row-reverse",
    gap: Spacing.sm,
  },
  scheduleFreqText: {
    fontSize: 13,
    textAlign: "right",
  },
  scheduleEmailsText: {
    fontSize: 12,
    textAlign: "right",
  },
  scheduleNextText: {
    fontSize: 11,
    textAlign: "right",
  },
  scheduleActionBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  scheduleActionText: {
    fontSize: 12,
  },
  scheduleEmptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },
  scheduleNewForm: {
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "transparent",
    paddingTop: Spacing.sm,
  },
  scheduleFormLabel: {
    fontSize: 13,
    textAlign: "right",
  },
  freqRow: {
    flexDirection: "row-reverse",
    gap: Spacing.sm,
  },
  emailInputRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  emailInputField: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 9,
    padding: 0,
  },
  addEmailBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emailTagsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  emailTag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
  },
  emailTagText: {
    fontSize: 11,
  },
  createScheduleBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
  },
  createScheduleBtnText: {
    color: "#fff",
    fontSize: 14,
  },
});
