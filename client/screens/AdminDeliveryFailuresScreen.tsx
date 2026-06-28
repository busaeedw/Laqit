import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
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

interface RfqFailure {
  rfqRecipientId: string;
  inspectionId: string | null;
  inspectionNo: string | null;
  vendorName: string | null;
  whatsappE164: string | null;
  channel: string | null;
  createdAt: string;
}

interface NotificationFailure {
  notificationId: string;
  recipientType: string;
  inspectionId: string | null;
  inspectionNo: string | null;
  vendorName: string | null;
  whatsappE164: string | null;
  channel: string | null;
  body: string | null;
  createdAt: string;
}

interface ZeroVendorBroadcast {
  inspectionId: string | null;
  inspectionNo: string | null;
  totalRecipients: number;
  sentCount: number;
  lastAttemptAt: string | null;
}

interface DeliveryFailuresResponse {
  rfqFailures: RfqFailure[];
  notificationFailures: NotificationFailure[];
  zeroVendorBroadcasts: ZeroVendorBroadcast[];
  counts: {
    rfqFailures: number;
    notificationFailures: number;
    zeroVendorBroadcasts: number;
  };
}

const DANGER = "#EF4444";
const WARN = "#F59E0B";

function formatExactDateTime(isoDate: string | null): string {
  if (!isoDate) return "";
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

type Row =
  | { kind: "section"; key: string; title: string; count: number; color: string; icon: React.ComponentProps<typeof Feather>["name"] }
  | { kind: "zero"; key: string; item: ZeroVendorBroadcast }
  | { kind: "rfq"; key: string; item: RfqFailure }
  | { kind: "notification"; key: string; item: NotificationFailure }
  | { kind: "empty"; key: string; text: string };

function SectionHeader({
  title,
  count,
  color,
  icon,
}: {
  title: string;
  count: number;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
        {title}
      </ThemedText>
      <View style={[styles.countBadge, { backgroundColor: count > 0 ? color : theme.border }]}>
        <ThemedText style={[styles.countBadgeText, { fontFamily: "Cairo_700Bold", color: "#FFFFFF" }]}>
          {count}
        </ThemedText>
      </View>
    </View>
  );
}

function FailureCard({
  index,
  color,
  inspectionNo,
  primary,
  secondary,
  createdAt,
  testID,
}: {
  index: number;
  color: string;
  inspectionNo: string | null;
  primary: string;
  secondary?: string | null;
  createdAt: string | null;
  testID: string;
}) {
  const { theme } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index * 25, 600))}>
      <View
        testID={testID}
        style={[
          styles.card,
          { backgroundColor: theme.backgroundDefault, borderColor: color + "30" },
        ]}
      >
        <View style={[styles.cardDot, { backgroundColor: color + "18" }]}>
          <Feather name="alert-triangle" size={15} color={color} />
        </View>
        <View style={styles.cardInfo}>
          <ThemedText style={[styles.cardPrimary, { fontFamily: "Cairo_600SemiBold" }]}>
            {primary}
          </ThemedText>
          {inspectionNo ? (
            <ThemedText style={[styles.cardMeta, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {`رقم الفحص: ${inspectionNo}`}
            </ThemedText>
          ) : null}
          {secondary ? (
            <ThemedText
              style={[styles.cardMeta, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}
              numberOfLines={2}
            >
              {secondary}
            </ThemedText>
          ) : null}
          {createdAt ? (
            <ThemedText style={[styles.cardTime, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {formatExactDateTime(createdAt)}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

export default function AdminDeliveryFailuresScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<DeliveryFailuresResponse>({
    queryKey: ["/api/admin/delivery-failures"],
    staleTime: 0,
  });

  const channelLabel = (c: string | null) => {
    switch (c) {
      case "whatsapp":
        return "واتساب";
      case "sms":
        return "رسالة نصية";
      case "email":
        return "بريد";
      case "push":
        return "إشعار";
      default:
        return c ?? "";
    }
  };

  const rows: Row[] = React.useMemo(() => {
    if (!data) return [];
    const out: Row[] = [];

    out.push({
      kind: "section",
      key: "sec-zero",
      title: "بث وصل إلى صفر موردين",
      count: data.counts.zeroVendorBroadcasts,
      color: DANGER,
      icon: "wifi-off",
    });
    if (data.zeroVendorBroadcasts.length === 0) {
      out.push({ kind: "empty", key: "empty-zero", text: "لا توجد عمليات بث فاشلة بالكامل" });
    } else {
      data.zeroVendorBroadcasts.forEach((item, i) =>
        out.push({ kind: "zero", key: `zero-${item.inspectionId ?? i}`, item })
      );
    }

    out.push({
      kind: "section",
      key: "sec-rfq",
      title: "موردون لم يصلهم طلب العرض",
      count: data.counts.rfqFailures,
      color: WARN,
      icon: "send",
    });
    if (data.rfqFailures.length === 0) {
      out.push({ kind: "empty", key: "empty-rfq", text: "لا توجد إخفاقات في إرسال طلبات العروض" });
    } else {
      data.rfqFailures.forEach((item) =>
        out.push({ kind: "rfq", key: `rfq-${item.rfqRecipientId}`, item })
      );
    }

    out.push({
      kind: "section",
      key: "sec-notif",
      title: "إشعارات فشل إرسالها",
      count: data.counts.notificationFailures,
      color: WARN,
      icon: "bell-off",
    });
    if (data.notificationFailures.length === 0) {
      out.push({ kind: "empty", key: "empty-notif", text: "لا توجد إشعارات فاشلة" });
    } else {
      data.notificationFailures.forEach((item) =>
        out.push({ kind: "notification", key: `notif-${item.notificationId}`, item })
      );
    }

    return out;
  }, [data]);

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="wifi-off" size={40} color={theme.textSecondary} />
        <ThemedText style={[styles.errorTitle, { fontFamily: "Cairo_700Bold", marginTop: Spacing.md }]}>
          تعذر تحميل البيانات
        </ThemedText>
        <Pressable
          testID="button-retry-delivery-failures"
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

  if (isLoading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: Row; index: number }) => {
    switch (item.kind) {
      case "section":
        return (
          <SectionHeader
            title={item.title}
            count={item.count}
            color={item.color}
            icon={item.icon}
          />
        );
      case "empty":
        return (
          <View style={styles.emptyRow}>
            <Feather name="check-circle" size={16} color={theme.textSecondary} />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}
            >
              {item.text}
            </ThemedText>
          </View>
        );
      case "zero":
        return (
          <FailureCard
            index={index}
            color={DANGER}
            inspectionNo={item.item.inspectionNo}
            primary={`لم يصل أي مورد (${item.item.sentCount} من ${item.item.totalRecipients})`}
            createdAt={item.item.lastAttemptAt}
            testID={`card-zero-${item.item.inspectionId}`}
          />
        );
      case "rfq":
        return (
          <FailureCard
            index={index}
            color={WARN}
            inspectionNo={item.item.inspectionNo}
            primary={item.item.vendorName ?? "مورد غير معروف"}
            secondary={`${channelLabel(item.item.channel)}${item.item.whatsappE164 ? `  •  ${item.item.whatsappE164}` : ""}`}
            createdAt={item.item.createdAt}
            testID={`card-rfq-${item.item.rfqRecipientId}`}
          />
        );
      case "notification":
        return (
          <FailureCard
            index={index}
            color={WARN}
            inspectionNo={item.item.inspectionNo}
            primary={item.item.vendorName ?? (item.item.recipientType === "customer" ? "عميل" : "مستلم غير معروف")}
            secondary={`${channelLabel(item.item.channel)}${item.item.whatsappE164 ? `  •  ${item.item.whatsappE164}` : ""}`}
            createdAt={item.item.createdAt}
            testID={`card-notif-${item.item.notificationId}`}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderItem}
        refreshing={isFetching}
        onRefresh={refetch}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  errorTitle: { fontSize: 17 },
  retryBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: "#FFFFFF", fontSize: 14 },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { flex: 1, fontSize: 16, textAlign: "right" },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { fontSize: 13 },
  card: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cardDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, gap: 2 },
  cardPrimary: { fontSize: 14, textAlign: "right" },
  cardMeta: { fontSize: 12, textAlign: "right" },
  cardTime: { fontSize: 11, textAlign: "right", marginTop: 2 },
  emptyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  emptyText: { fontSize: 13, textAlign: "right" },
});
