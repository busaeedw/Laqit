import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, "InspectionDetail">;

const STATUS_STEPS = [
  { key: "draft", label: "إنشاء الطلب" },
  { key: "rfq_sent", label: "إرسال للموردين" },
  { key: "quotes_received", label: "استلام العروض" },
  { key: "quote_accepted", label: "قبول عرض" },
  { key: "paid", label: "تم الدفع" },
];

function statusIndex(status: string) {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export default function InspectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { inspectionId } = route.params;
  const { theme } = useTheme();

  const { data, isLoading } = useQuery<{
    inspection: any;
    parts: any[];
    media: any[];
    quotes: any[];
  }>({ queryKey: [`/api/laqit-inspections/${inspectionId}`] });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const { inspection, parts = [], quotes = [] } = data ?? {};
  if (!inspection) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={{ fontFamily: "Cairo_400Regular" }}>الفحص غير موجود</ThemedText>
      </View>
    );
  }

  const currentStepIdx = statusIndex(inspection.status);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing["4xl"],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Inspection No */}
      <View style={[styles.inspNoCard, { backgroundColor: theme.primary }]}>
        <ThemedText style={[styles.inspNoLabel, { fontFamily: "Cairo_400Regular" }]}>رقم الفحص</ThemedText>
        <ThemedText style={[styles.inspNoValue, { fontFamily: "Cairo_700Bold" }]}>
          {inspection.inspectionNo}
        </ThemedText>
      </View>

      {/* Status timeline */}
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
          حالة الطلب
        </ThemedText>
        <View style={styles.timeline}>
          {STATUS_STEPS.map((step, idx) => {
            const done = idx <= currentStepIdx;
            const active = idx === currentStepIdx;
            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  {idx < STATUS_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: done ? theme.primary : theme.border }]} />
                  )}
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: done ? theme.primary : theme.border },
                    ]}
                  >
                    {done && <Feather name="check" size={10} color="#fff" />}
                  </View>
                </View>
                <ThemedText
                  style={[
                    styles.timelineLabel,
                    {
                      fontFamily: active ? "Cairo_700Bold" : "Cairo_400Regular",
                      color: done ? theme.text : theme.textSecondary,
                    },
                  ]}
                >
                  {step.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>

      {/* Parts */}
      {parts.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
            القطع المطلوبة ({parts.length})
          </ThemedText>
          {parts.map((p: any, idx: number) => (
            <View key={p.inspectionPartId} style={styles.partRow}>
              <ThemedText style={[styles.partNum, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                {idx + 1}.
              </ThemedText>
              <ThemedText style={[styles.partName, { fontFamily: "Cairo_400Regular" }]}>
                {p.partName}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Quotes CTA */}
      {quotes.length > 0 ? (
        <Pressable
          testID="button-view-quotes"
          onPress={() => navigation.navigate("QuotesList", { inspectionId })}
          style={[styles.quotesBtn, { backgroundColor: theme.primary }]}
        >
          <ThemedText style={[styles.quotesBtnText, { fontFamily: "Cairo_700Bold" }]}>
            عرض {quotes.length} {quotes.length === 1 ? "عرض سعر" : "عروض أسعار"}
          </ThemedText>
          <Feather name="arrow-left" size={18} color="#fff" />
        </Pressable>
      ) : (
        <View style={[styles.waitCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="clock" size={24} color={theme.textSecondary} />
          <ThemedText style={[styles.waitText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            بانتظار ردود الموردين...
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  inspNoCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  inspNoLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  inspNoValue: { color: "#fff", fontSize: 24 },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitle: { fontSize: 16, textAlign: "right" },
  timeline: { gap: Spacing.sm },
  timelineRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: Spacing.md },
  timelineLeft: { alignItems: "center", width: 24 },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  timelineLine: {
    position: "absolute",
    top: 22,
    width: 2,
    height: 28,
    left: 10,
  },
  timelineLabel: { fontSize: 14, flex: 1, textAlign: "right", paddingTop: 2 },
  partRow: { flexDirection: "row-reverse", alignItems: "center", gap: Spacing.sm },
  partNum: { fontSize: 13, width: 24, textAlign: "right" },
  partName: { flex: 1, fontSize: 14, textAlign: "right" },
  quotesBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  quotesBtnText: { color: "#fff", fontSize: 16 },
  waitCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  waitText: { fontSize: 14 },
});
