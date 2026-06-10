import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { usePdfLocale } from "@/hooks/usePdfLocale";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl, authHeaders } from "@/lib/query-client";

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

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { pdfLocale, savePdfLocale } = usePdfLocale();

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false);

  const { data, isLoading } = useQuery<{
    inspection: any;
    parts: any[];
    media: any[];
    quotes: any[];
  }>({ queryKey: [`/api/laqit-inspections/${inspectionId}`] });

  const handleDownloadPdf = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDownloadError(null);
    setDownloading(true);

    try {
      const url = new URL(`/api/laqit-inspections/${inspectionId}/pdf`, getApiUrl());
      url.searchParams.set("locale", pdfLocale);
      const resp = await fetch(url.toString(), {
        method: "GET",
        headers: { ...authHeaders() },
      });

      if (!resp.ok) {
        let errorMsg = "حدث خطأ أثناء إنشاء التقرير";
        try {
          const json = await resp.json();
          errorMsg = json.error ?? errorMsg;
        } catch {}
        setDownloadError(errorMsg);
        return;
      }

      const arrayBuffer = await resp.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      const filename = `laqit-${Date.now()}.pdf`;
      const fileUri =
        (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "") +
        filename;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "تنزيل أو مشاركة تقرير PDF",
          UTI: "com.adobe.pdf",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setDownloadError("المشاركة غير متاحة على هذا الجهاز");
      }
    } catch {
      setDownloadError("تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenEmailModal = () => {
    setSendEmailError(null);
    setSendEmailSuccess(false);
    setEmailModalVisible(true);
  };

  const handleSendEmail = async () => {
    const trimmed = emailAddress.trim();
    if (!trimmed) {
      setSendEmailError("يرجى إدخال البريد الإلكتروني");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setSendEmailError("البريد الإلكتروني غير صحيح");
      return;
    }

    setSendEmailError(null);
    setSendingEmail(true);

    try {
      const url = new URL(`/api/laqit-inspections/${inspectionId}/send-pdf`, getApiUrl());
      const resp = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email: trimmed, locale: pdfLocale }),
      });

      const json = await resp.json();
      if (!resp.ok) {
        setSendEmailError(json.error ?? "فشل إرسال البريد الإلكتروني");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSendEmailSuccess(true);
      setTimeout(() => setEmailModalVisible(false), 1500);
    } catch {
      setSendEmailError("تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setSendingEmail(false);
    }
  };

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
    <>
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
        {parts.length > 0 ? (
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
        ) : null}

        {/* PDF actions — only when parts exist */}
        {parts.length > 0 ? (
          <View style={styles.pdfSection}>
            {/* Language selector */}
            <View style={[styles.localePicker, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              {(
                [
                  { value: "ar", label: "عربي" },
                  { value: "bilingual", label: "ثنائي" },
                  { value: "en", label: "English" },
                ] as const
              ).map((opt) => (
                <Pressable
                  key={opt.value}
                  testID={`button-pdf-locale-${opt.value}`}
                  onPress={() => savePdfLocale(opt.value)}
                  style={[
                    styles.localeOption,
                    pdfLocale === opt.value && { backgroundColor: theme.primary },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.localeOptionText,
                      {
                        fontFamily: "Cairo_700Bold",
                        color: pdfLocale === opt.value ? "#fff" : theme.textSecondary,
                      },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.pdfBtnRow}>
              {/* Download */}
              <Pressable
                testID="button-download-pdf"
                onPress={handleDownloadPdf}
                disabled={downloading}
                style={({ pressed }) => [
                  styles.pdfBtn,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                    opacity: pressed || downloading ? 0.7 : 1,
                    flex: 1,
                  },
                ]}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Feather name="download" size={18} color={theme.primary} />
                )}
                <ThemedText style={[styles.pdfBtnText, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
                  {downloading ? "جارٍ..." : "تنزيل PDF"}
                </ThemedText>
              </Pressable>

              {/* Email */}
              <Pressable
                testID="button-email-pdf"
                onPress={handleOpenEmailModal}
                style={({ pressed }) => [
                  styles.pdfBtn,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                    flex: 1,
                  },
                ]}
              >
                <Feather name="mail" size={18} color={theme.primary} />
                <ThemedText style={[styles.pdfBtnText, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
                  إرسال بالبريد
                </ThemedText>
              </Pressable>
            </View>

            {downloadError != null ? (
              <ThemedText style={[styles.errorText, { color: theme.error ?? "#d32f2f", fontFamily: "Cairo_400Regular" }]}>
                {downloadError}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

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

      {/* Email modal */}
      <Modal
        visible={emailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setEmailModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
            {/* Handle */}
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

            <ThemedText style={[styles.modalTitle, { fontFamily: "Cairo_700Bold" }]}>
              إرسال تقرير PDF
            </ThemedText>
            <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              أدخل عنوان بريدك الإلكتروني أو بريد الورشة
            </ThemedText>

            <View style={[styles.localeBadgeRow]}>
              <View style={[styles.localeBadge, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "40" }]}>
                <Feather name="file-text" size={13} color={theme.primary} />
                <ThemedText style={[styles.localeBadgeText, { color: theme.primary, fontFamily: "Cairo_400Regular" }]}>
                  {pdfLocale === "ar" ? "لغة التقرير: عربي" : pdfLocale === "en" ? "لغة التقرير: English" : "لغة التقرير: عربي / English"}
                </ThemedText>
              </View>
            </View>

            <TextInput
              testID="input-email-pdf"
              value={emailAddress}
              onChangeText={(t) => { setEmailAddress(t); setSendEmailError(null); setSendEmailSuccess(false); }}
              placeholder="example@email.com"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.emailInput,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: sendEmailError ? (theme.error ?? "#d32f2f") : theme.border,
                  color: theme.text,
                  fontFamily: "Cairo_400Regular",
                },
              ]}
            />

            {sendEmailError != null ? (
              <ThemedText style={[styles.errorText, { color: theme.error ?? "#d32f2f", fontFamily: "Cairo_400Regular" }]}>
                {sendEmailError}
              </ThemedText>
            ) : null}

            {sendEmailSuccess ? (
              <View style={[styles.successBanner, { backgroundColor: "#16A34A15" }]}>
                <Feather name="check-circle" size={16} color="#16A34A" />
                <ThemedText style={[styles.successText, { color: "#16A34A", fontFamily: "Cairo_700Bold" }]}>
                  تم إرسال التقرير بنجاح
                </ThemedText>
              </View>
            ) : null}

            <Pressable
              testID="button-send-pdf-confirm"
              onPress={handleSendEmail}
              disabled={sendingEmail || sendEmailSuccess}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed || sendingEmail || sendEmailSuccess ? 0.7 : 1,
                },
              ]}
            >
              {sendingEmail ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
              <ThemedText style={[styles.sendBtnText, { fontFamily: "Cairo_700Bold" }]}>
                {sendingEmail ? "جارٍ الإرسال..." : "إرسال التقرير"}
              </ThemedText>
            </Pressable>

            <View style={{ height: insets.bottom + Spacing.md }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  pdfSection: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  localePicker: {
    flexDirection: "row-reverse",
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  localeOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  localeOptionText: {
    fontSize: 13,
  },
  pdfBtnRow: {
    flexDirection: "row-reverse",
    gap: Spacing.sm,
  },
  pdfBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  pdfBtnText: { fontSize: 14 },
  errorText: { fontSize: 13, textAlign: "center" },
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
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  modalTitle: { fontSize: 18, textAlign: "right" },
  modalSubtitle: { fontSize: 13, textAlign: "right", marginTop: -Spacing.xs },
  localeBadgeRow: {
    flexDirection: "row-reverse",
    marginTop: Spacing.md,
  },
  localeBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  localeBadgeText: { fontSize: 12 },
  emailInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 15,
    textAlign: "left",
  },
  successBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  successText: { fontSize: 14 },
  sendBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  sendBtnText: { color: "#fff", fontSize: 16 },
});
