import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, authHeaders } from "@/lib/query-client";

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
    [key: string]: unknown;
  } | null;
}

interface AuditLogResponse {
  entries: AuditEntry[];
  hasMore: boolean;
  page: number;
}

type DatePreset = "today" | "week" | "month" | null;

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

function formatExactDateTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat("ar-SA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoDate;
  }
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
        getDetail: (p) => {
          if (!p?.previousStatus || !p?.newStatus) return null;
          const statusLine = `${p.previousStatus} ← ${p.newStatus}`;
          if (p.reason) return `${statusLine}\nالسبب: ${p.reason}`;
          return statusLine;
        },
      };
    default:
      return {
        label: action,
        icon: "activity",
        color: "#6B7280",
      };
  }
}

function buildPayloadLines(payload: AuditEntry["payload"]): { key: string; value: string }[] {
  if (!payload) return [];
  const knownKeys = new Set([
    "actorName",
    "actorMobile",
    "targetName",
    "targetMobile",
    "vendorName",
    "fullName",
    "inspectionNo",
    "previousStatus",
    "newStatus",
    "reason",
  ]);
  const labelMap: Record<string, string> = {
    actorName: "المنفذ",
    actorMobile: "جوال المنفذ",
    targetName: "الهدف",
    targetMobile: "جوال الهدف",
    vendorName: "المورد",
    fullName: "الاسم",
    inspectionNo: "رقم الطلب",
    previousStatus: "الحالة السابقة",
    newStatus: "الحالة الجديدة",
    reason: "السبب",
  };
  const lines: { key: string; value: string }[] = [];
  for (const k of knownKeys) {
    const v = (payload as Record<string, unknown>)[k];
    if (v != null && v !== "") {
      lines.push({ key: labelMap[k] ?? k, value: String(v) });
    }
  }
  for (const k of Object.keys(payload)) {
    if (!knownKeys.has(k)) {
      const v = (payload as Record<string, unknown>)[k];
      if (v != null && v !== "") {
        lines.push({ key: k, value: typeof v === "object" ? JSON.stringify(v) : String(v) });
      }
    }
  }
  return lines;
}

function AuditEntryRow({ entry, index }: { entry: AuditEntry; index: number }) {
  const { theme } = useTheme();
  const config = getActionConfig(entry.action, entry.payload);
  const actorLabel =
    entry.payload?.actorName ?? entry.payload?.actorMobile ?? "النظام";
  const detail = config.getDetail?.(entry.payload);
  const [expanded, setExpanded] = useState(false);
  const payloadLines = buildPayloadLines(entry.payload);

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index * 25, 600))}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        testID={`audit-entry-${entry.auditId}`}
        style={[
          styles.auditCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: config.color + "30",
          },
        ]}
      >
        <View
          style={[
            styles.auditDot,
            { backgroundColor: config.color + "20" },
          ]}
        >
          <Feather name={config.icon} size={16} color={config.color} />
        </View>
        <View style={styles.auditInfo}>
          <ThemedText
            style={[styles.auditAction, { fontFamily: "Cairo_600SemiBold" }]}
            numberOfLines={expanded ? undefined : 2}
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
          <Pressable
            onLongPress={async () => {
              const formatted = formatExactDateTime(entry.createdAt);
              await Clipboard.setStringAsync(formatted);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            delayLongPress={400}
            testID={`pressable-audit-timestamp-${entry.auditId}`}
          >
            <ThemedText
              style={[styles.auditTimestamp, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}
              testID={`text-audit-timestamp-${entry.auditId}`}
            >
              {formatExactDateTime(entry.createdAt)}
            </ThemedText>
          </Pressable>

          {expanded && payloadLines.length > 0 ? (
            <View
              style={[
                styles.payloadBox,
                { backgroundColor: theme.backgroundRoot, borderColor: theme.border },
              ]}
            >
              {payloadLines.map(({ key, value }) => (
                <View key={key} style={styles.payloadRow}>
                  <ThemedText
                    style={[styles.payloadKey, { color: theme.textSecondary, fontFamily: "Cairo_600SemiBold" }]}
                  >
                    {key}:
                  </ThemedText>
                  <ThemedText
                    style={[styles.payloadValue, { fontFamily: "Cairo_400Regular" }]}
                    selectable
                  >
                    {value}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={theme.textSecondary}
          style={styles.expandChevron}
        />
      </Pressable>
    </Animated.View>
  );
}

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

const ACTION_TYPES: { key: string; label: string }[] = [
  { key: "admin_granted", label: "منح مشرف" },
  { key: "admin_revoked", label: "سحب مشرف" },
  { key: "vendor_created", label: "إضافة مورد" },
  { key: "vendor_activated", label: "تفعيل مورد" },
  { key: "vendor_deactivated", label: "إيقاف مورد" },
  { key: "inspection_status_override", label: "تغيير حالة" },
];

export default function AdminAuditLogScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [auditPerson, setAuditPerson] = useState("");
  const [auditDatePreset, setAuditDatePreset] = useState<DatePreset>(null);
  const [auditEntityType, setAuditEntityType] = useState<string | null>(null);
  const [auditAction, setAuditAction] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [accumulatedEntries, setAccumulatedEntries] = useState<AuditEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const isFirstMount = useRef(true);

  const baseQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (auditPerson.trim()) params.set("person", auditPerson.trim());
    const range = presetToDateRange(auditDatePreset);
    if (range) {
      params.set("since", range.since);
      params.set("until", range.until);
    }
    if (auditEntityType) params.set("entityType", auditEntityType);
    if (auditAction) params.set("action", auditAction);
    const qs = params.toString();
    return qs ? `/api/admin/audit-log?${qs}` : "/api/admin/audit-log";
  }, [auditPerson, auditDatePreset, auditEntityType, auditAction]);

  const queryUrl = useMemo(() => {
    const sep = baseQueryUrl.includes("?") ? "&" : "?";
    return auditPage > 1 ? `${baseQueryUrl}${sep}page=${auditPage}` : baseQueryUrl;
  }, [baseQueryUrl, auditPage]);

  const hasFilters =
    auditPerson.trim().length > 0 ||
    auditDatePreset !== null ||
    auditEntityType !== null ||
    auditAction !== null;

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setAuditPage(1);
    setAccumulatedEntries([]);
  }, [baseQueryUrl]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<AuditLogResponse>({
    queryKey: [queryUrl],
    staleTime: 0,
  });

  useEffect(() => {
    if (!data) return;
    if (data.page === 1) {
      setAccumulatedEntries(data.entries);
    } else {
      setAccumulatedEntries((prev) => [...prev, ...data.entries]);
    }
  }, [data]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (auditPerson.trim()) params.set("person", auditPerson.trim());
      const range = presetToDateRange(auditDatePreset);
      if (range) {
        params.set("since", range.since);
        params.set("until", range.until);
      }
      if (auditEntityType) params.set("entityType", auditEntityType);
      if (auditAction) params.set("action", auditAction);
      const qs = params.toString();
      const path = `/api/admin/audit-log/export${qs ? `?${qs}` : ""}`;
      const baseUrl = getApiUrl();
      const url = new URL(path, baseUrl).toString();

      if (Platform.OS === "web") {
        const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        const today = new Date().toISOString().slice(0, 10);
        a.download = `audit_log_${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const fileUri = FileSystem.cacheDirectory + `audit_log_${today}.csv`;
        const result = await FileSystem.downloadAsync(url, fileUri, {
          headers: authHeaders(),
        });
        if (result.status !== 200) throw new Error(`${result.status}`);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(result.uri, {
            mimeType: "text/csv",
            dialogTitle: "تصدير سجل التغييرات",
            UTI: "public.comma-separated-values-text",
          });
        } else {
          Alert.alert("تصدير", `تم حفظ الملف في:\n${result.uri}`);
        }
      }
    } catch {
      Alert.alert("خطأ", "تعذر تصدير السجل، يرجى المحاولة مجدداً");
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setAuditPerson("");
    setAuditDatePreset(null);
    setAuditEntityType(null);
    setAuditAction(null);
  };

  const filterHeader = (
    <View style={styles.filterBar}>
      {/* Person search */}
      <View
        style={[
          styles.searchRow,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        <Feather name="user" size={15} color={theme.textSecondary} />
        <TextInput
          testID="input-audit-person"
          style={[styles.searchInput, { color: theme.text, fontFamily: "Cairo_400Regular" }]}
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
            <Feather name="x" size={14} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Entity type chips */}
      <View style={styles.chipRow}>
        {ENTITY_TYPES.map(({ key, label }) => {
          const active = auditEntityType === key;
          return (
            <Pressable
              key={key}
              testID={`button-audit-entity-${key}`}
              onPress={() => setAuditEntityType(active ? null : key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary + "18" : theme.backgroundDefault,
                  borderColor: active ? theme.primary + "60" : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
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

      {/* Action chips */}
      <View style={styles.chipRow}>
        {ACTION_TYPES.map(({ key, label }) => {
          const active = auditAction === key;
          return (
            <Pressable
              key={key}
              testID={`button-audit-action-${key}`}
              onPress={() => setAuditAction(active ? null : key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary + "18" : theme.backgroundDefault,
                  borderColor: active ? theme.primary + "60" : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
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
      <View style={styles.chipRow}>
        {DATE_PRESETS.map(({ key, label }) => {
          const active = auditDatePreset === key;
          return (
            <Pressable
              key={key ?? "all"}
              testID={`button-audit-preset-${key}`}
              onPress={() => setAuditDatePreset(active ? null : key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary + "18" : theme.backgroundDefault,
                  borderColor: active ? theme.primary + "60" : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
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
        {hasFilters ? (
          <Pressable
            testID="button-clear-audit-filters"
            onPress={clearFilters}
            style={[styles.clearBtn, { borderColor: theme.border }]}
          >
            <Feather name="x" size={13} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Export button */}
      <Pressable
        testID="button-export-audit-log"
        onPress={handleExport}
        disabled={isExporting}
        style={({ pressed }) => [
          styles.exportBtn,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            opacity: pressed || isExporting ? 0.5 : 1,
          },
        ]}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <>
            <Feather name="download" size={13} color={theme.primary} />
            <ThemedText style={[styles.exportText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
              تصدير CSV
            </ThemedText>
          </>
        )}
      </Pressable>
    </View>
  );

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="wifi-off" size={40} color={theme.textSecondary} />
        <ThemedText style={[styles.errorTitle, { fontFamily: "Cairo_700Bold", marginTop: Spacing.md }]}>
          تعذر تحميل السجل
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

  const hasMore = data?.hasMore ?? false;

  const listFooter =
    isLoading && auditPage === 1 ? (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    ) : accumulatedEntries.length === 0 ? (
      <View style={styles.emptyBox}>
        <Feather name="inbox" size={40} color={theme.textSecondary} />
        <ThemedText style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
          {hasFilters ? "لا توجد نتائج للفلاتر المحددة" : "لا توجد أحداث بعد"}
        </ThemedText>
        {hasFilters ? (
          <Pressable onPress={clearFilters} testID="button-clear-audit-filters-empty">
            <ThemedText style={[styles.clearLink, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
              مسح الفلاتر
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    ) : hasMore ? (
      <Pressable
        testID="button-audit-load-more"
        onPress={() => setAuditPage((p) => p + 1)}
        disabled={isFetching}
        style={[
          styles.loadMoreBtn,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            opacity: isFetching ? 0.6 : 1,
          },
        ]}
      >
        {isFetching ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <>
            <Feather name="chevron-down" size={15} color={theme.primary} />
            <ThemedText style={[styles.loadMoreText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
              تحميل المزيد
            </ThemedText>
          </>
        )}
      </Pressable>
    ) : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={accumulatedEntries}
        keyExtractor={(item) => item.auditId}
        renderItem={({ item, index }) => (
          <AuditEntryRow entry={item} index={index} />
        )}
        ListHeaderComponent={filterHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore && !isFetching) {
            setAuditPage((p) => p + 1);
          }
        }}
        onEndReachedThreshold={0.3}
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
  filterBar: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
  chipRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12 },
  clearBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignSelf: "flex-end",
  },
  exportText: { fontSize: 13 },
  auditCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  auditDot: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  auditInfo: {
    flex: 1,
    gap: 3,
  },
  auditAction: {
    fontSize: 14,
    textAlign: "right",
  },
  auditMeta: {
    fontSize: 12,
    textAlign: "right",
  },
  auditTimestamp: {
    fontSize: 11,
    textAlign: "right",
    opacity: 0.65,
    marginTop: 1,
  },
  expandChevron: {
    marginTop: 4,
    flexShrink: 0,
  },
  payloadBox: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: 4,
  },
  payloadRow: {
    flexDirection: "row-reverse",
    gap: 6,
    flexWrap: "wrap",
  },
  payloadKey: {
    fontSize: 11,
    textAlign: "right",
  },
  payloadValue: {
    fontSize: 11,
    textAlign: "right",
    flex: 1,
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyBox: {
    alignItems: "center",
    paddingTop: 60,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
  clearLink: {
    fontSize: 14,
  },
  loadMoreBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 44,
  },
  loadMoreText: { fontSize: 13 },
});
