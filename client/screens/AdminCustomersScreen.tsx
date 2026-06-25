import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useUser } from "@/context/UserContext";

interface CustomerItem {
  customerId: string;
  fullName: string | null;
  mobileE164: string;
  email: string | null;
  isAdmin: boolean | null;
  createdAt: string;
}

interface CustomersResponse {
  customers: CustomerItem[];
}

interface AuditEntry {
  auditId: string;
  action: string;
  createdAt: string;
  payload: {
    actorName: string | null;
    actorMobile: string | null;
    targetName: string | null;
    targetMobile: string | null;
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

function AuditEntryRow({ entry, index }: { entry: AuditEntry; index: number }) {
  const { theme } = useTheme();
  const isGrant = entry.action === "admin_granted";
  const accentColor = isGrant ? "#22C55E" : "#EF4444";
  const actorLabel = entry.payload?.actorName ?? entry.payload?.actorMobile ?? "مشرف";
  const targetLabel = entry.payload?.targetName ?? entry.payload?.targetMobile ?? "مستخدم";

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 30)}>
      <View
        style={[
          styles.auditCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: accentColor + "30",
          },
        ]}
        testID={`audit-entry-${entry.auditId}`}
      >
        <View
          style={[
            styles.auditDot,
            { backgroundColor: accentColor + "20" },
          ]}
        >
          <Feather
            name={isGrant ? "shield" : "shield-off"}
            size={14}
            color={accentColor}
          />
        </View>
        <View style={styles.auditInfo}>
          <ThemedText
            style={[styles.auditAction, { fontFamily: "Cairo_600SemiBold" }]}
            numberOfLines={2}
          >
            {isGrant ? "منح صلاحيات المشرف" : "سحب صلاحيات المشرف"}
            {"  "}
            <ThemedText
              style={[styles.auditAction, { color: accentColor, fontFamily: "Cairo_700Bold" }]}
            >
              {targetLabel}
            </ThemedText>
          </ThemedText>
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

export default function AdminCustomersScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<CustomersResponse>({
    queryKey: ["/api/customers/all"],
    staleTime: 0,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<AuditLogResponse>({
    queryKey: ["/api/admin/audit-log"],
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
  const auditEntries = auditData?.entries ?? [];

  const auditSection =
    auditEntries.length > 0 ? (
      <View style={styles.auditSection}>
        <View style={styles.sectionHeader}>
          <Feather name="clock" size={14} color={theme.textSecondary} />
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Cairo_600SemiBold" }]}
          >
            سجل التغييرات
          </ThemedText>
        </View>
        {auditEntries.map((entry, idx) => (
          <AuditEntryRow key={entry.auditId} entry={entry} index={idx} />
        ))}
      </View>
    ) : auditLoading ? (
      <View style={[styles.auditSection, styles.auditLoading]}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    ) : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={customerList}
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
          customerList.length > 0 ? (
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
                  {customerList.length} عميل
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
          ) : null
        }
        ListFooterComponent={auditSection}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color={theme.textSecondary} />
            <ThemedText
              style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}
            >
              لا يوجد عملاء
            </ThemedText>
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
});
