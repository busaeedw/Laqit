import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Animated,
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { arrayBufferToBase64 } from "../lib/pdfUtils";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { usePdfLocale, PdfLocale } from "@/hooks/usePdfLocale";
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

interface PdfPreviewModalProps {
  visible: boolean;
  pdfBase64: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onShare: () => void;
  sharing: boolean;
  pdfLocale: PdfLocale;
  onReload: (locale: PdfLocale) => void;
}

function PdfPreviewModal({
  visible,
  pdfBase64,
  loading,
  error,
  onClose,
  onShare,
  sharing,
  pdfLocale,
  onReload,
}: PdfPreviewModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setWebViewLoading(true);
  }, [visible, pdfBase64]);

  useEffect(() => {
    if (Platform.OS !== "web" || !pdfBase64) { setBlobUrl(null); return; }
    const binary = atob(pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfBase64]);

  const pdfSource = pdfBase64
    ? { uri: `data:application/pdf;base64,${pdfBase64}` }
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      testID="modal-pdf-preview"
    >
      <View style={[previewStyles.container, { backgroundColor: theme.backgroundRoot }]}>
        {/* Top bar */}
        <View
          style={[
            previewStyles.topBar,
            { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border, paddingTop: insets.top + Spacing.sm },
          ]}
        >
          <Pressable
            style={({ pressed }) => [previewStyles.topBarButton, { opacity: pressed ? 0.6 : 1 }]}
            onPress={onClose}
            testID="button-close-preview"
          >
            <Feather name="x" size={22} color={theme.text} />
          </Pressable>
          <ThemedText style={[previewStyles.topBarTitle, { fontFamily: "Cairo_700Bold" }]}>
            معاينة PDF
          </ThemedText>
          <Pressable
            style={({ pressed }) => [previewStyles.topBarButton, { opacity: pressed || loading ? 0.5 : 1 }]}
            onPress={() => onReload(pdfLocale)}
            disabled={loading}
            testID="button-reload-preview"
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Feather name="refresh-cw" size={20} color={theme.primary} />
            )}
          </Pressable>
        </View>

        {/* Language picker */}
        <View
          style={[
            previewStyles.settingsStrip,
            { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border },
          ]}
        >
          <View style={[previewStyles.inlineLocalePicker, { borderColor: theme.border }]}>
            {[
              { value: "ar" as PdfLocale, label: "عربي" },
              { value: "en" as PdfLocale, label: "English" },
            ].map((opt) => (
              <Pressable
                key={opt.value}
                testID={`button-preview-locale-${opt.value}`}
                onPress={() => {
                  if (opt.value !== pdfLocale) {
                    onReload(opt.value);
                  }
                }}
                style={[
                  previewStyles.inlineLocaleOption,
                  pdfLocale === opt.value && { backgroundColor: theme.primary },
                ]}
              >
                <ThemedText
                  style={[
                    previewStyles.inlineLocaleText,
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
        </View>

        {/* PDF / loading / error area */}
        <View style={previewStyles.webViewContainer}>
          {loading ? (
            <View style={previewStyles.centerState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={[previewStyles.stateText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                جارٍ تحميل التقرير...
              </ThemedText>
            </View>
          ) : error != null ? (
            <View style={previewStyles.centerState}>
              <View style={[previewStyles.errorIcon, { backgroundColor: (theme.error ?? "#d32f2f") + "15" }]}>
                <Feather name="alert-circle" size={32} color={theme.error ?? "#d32f2f"} />
              </View>
              <ThemedText style={[previewStyles.stateText, { color: theme.error ?? "#d32f2f", fontFamily: "Cairo_600SemiBold" }]}>
                {error}
              </ThemedText>
            </View>
          ) : pdfSource != null ? (
            <View style={{ flex: 1 }}>
              {Platform.OS === "web" ? (
                blobUrl
                  ? React.createElement("iframe", {
                      key: blobUrl,
                      src: blobUrl,
                      style: { width: "100%", height: "100%", border: "none", display: "block" },
                      title: "PDF Preview",
                    })
                  : (
                    <View style={previewStyles.centerState}>
                      <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                  )
              ) : (
                <>
                  {webViewLoading ? (
                    <View style={[previewStyles.centerState, previewStyles.webViewOverlay]}>
                      <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                  ) : null}
                  <WebView
                    key={`${pdfLocale}-${pdfBase64 ? pdfBase64.substring(0, 32) : "no-pdf"}`}
                    source={pdfSource}
                    style={previewStyles.webView}
                    onLoadStart={() => setWebViewLoading(true)}
                    onLoadEnd={() => setWebViewLoading(false)}
                    originWhitelist={["*"]}
                    testID="webview-pdf"
                  />
                </>
              )}
            </View>
          ) : null}
        </View>

        {/* Bottom share bar */}
        <View
          style={[
            previewStyles.bottomBar,
            { backgroundColor: theme.backgroundDefault, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.sm },
          ]}
        >
          <Pressable
            onPress={onShare}
            disabled={sharing || pdfBase64 == null || (Platform.OS !== "web" && previewFileUri == null)}
            style={({ pressed }) => [
              previewStyles.shareButton,
              { backgroundColor: theme.primary, opacity: pressed || sharing || pdfBase64 == null || (Platform.OS !== "web" && previewFileUri == null) ? 0.7 : 1 },
            ]}
            testID="button-share-from-preview"
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="share-2" size={18} color="#fff" />
            )}
            <ThemedText style={[previewStyles.shareButtonText, { fontFamily: "Cairo_700Bold" }]}>
              {sharing ? "جارٍ المشاركة..." : "مشاركة أو حفظ"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
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

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSharing, setPreviewSharing] = useState(false);
  const [previewFileUri, setPreviewFileUri] = useState<string | null>(null);

  const pdfCache = useRef<{ key: string; base64: string; fileUri: string | null } | null>(null);

  // Clear the PDF cache every time the screen comes back into focus so that
  // edits made on another screen (and refetched in the background) always
  // produce a fresh PDF on the next preview/download request.
  useFocusEffect(
    useCallback(() => {
      pdfCache.current = null;
      setPreviewBase64(null);
      setPreviewFileUri(null);
      setPreviewError(null);
      setPreviewVisible(false);
    }, [])
  );

  // Brief highlight animation on the outside settings controls when the user
  // closes the preview modal after changing locale/page-numbers inside it.
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const settingsChangedInModal = useRef(false);

  const flashControls = useCallback(() => {
    highlightAnim.setValue(0);
    Animated.sequence([
      Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(highlightAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
    ]).start();
  }, [highlightAnim]);

  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", theme.primary + "22"],
  });

  const { data, isLoading, refetch } = useQuery<{
    inspection: any;
    parts: any[];
    media: any[];
    quotes: any[];
  }>({ queryKey: [`/api/laqit-inspections/${inspectionId}`] });

  // Invalidate the PDF cache whenever the inspection data changes (e.g. parts
  // edited, status updated). Version is derived from updatedAt + parts count +
  // part IDs so any server-side change triggers a fresh PDF fetch next time.
  const prevDataVersionRef = useRef<string | null>(null);
  const dataVersion = data
    ? `${data.inspection?.updatedAt ?? ""}|${data.parts?.length ?? 0}|${(data.parts ?? []).map((p: any) => p.inspectionPartId ?? p.id ?? "").join(",")}`
    : null;
  useEffect(() => {
    if (dataVersion == null) return;
    if (prevDataVersionRef.current !== null && prevDataVersionRef.current !== dataVersion) {
      pdfCache.current = null;
    }
    prevDataVersionRef.current = dataVersion;
  }, [dataVersion]);

  const exportPdf = async (
    dialogTitle: string,
    setLoading: (v: boolean) => void,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDownloadError(null);
    setLoading(true);

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
      const base64 = arrayBufferToBase64(arrayBuffer);

      const filename = `laqit-${Date.now()}.pdf`;

      if (Platform.OS === "web") {
        const byteChars = atob(base64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });

        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(objectUrl);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
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
            dialogTitle,
            UTI: "com.adobe.pdf",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setDownloadError("المشاركة غير متاحة على هذا الجهاز");
        }
      }
    } catch {
      setDownloadError("تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => exportPdf("تنزيل أو مشاركة تقرير PDF", setDownloading);


  const handlePreviewPdf = async (overrideLocale?: PdfLocale, overridePageNumbers?: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const effectiveLocale = overrideLocale ?? pdfLocale;
    if (overrideLocale !== undefined && overrideLocale !== pdfLocale) {
      savePdfLocale(overrideLocale);
      settingsChangedInModal.current = true;
    }

    const cacheKey = `${inspectionId}|${effectiveLocale}`;

    if (pdfCache.current?.key === cacheKey) {
      setPreviewError(null);
      setPreviewBase64(pdfCache.current.base64);
      setPreviewFileUri(pdfCache.current.fileUri);
      setPreviewLoading(false);
      setPreviewVisible(true);
      return;
    }

    setPreviewError(null);
    setPreviewBase64(null);
    setPreviewFileUri(null);
    setPreviewLoading(true);
    setPreviewVisible(true);

    try {
      const url = new URL(`/api/laqit-inspections/${inspectionId}/pdf`, getApiUrl());
      url.searchParams.set("locale", effectiveLocale);
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
        setPreviewError(errorMsg);
        return;
      }

      const arrayBuffer = await resp.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);

      let fileUri: string | null = null;
      if (Platform.OS !== "web") {
        const filename = `laqit-preview-${Date.now()}.pdf`;
        const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
        fileUri = dir + filename;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      pdfCache.current = { key: cacheKey, base64, fileUri };
      setPreviewFileUri(fileUri);
      setPreviewBase64(base64);
    } catch {
      setPreviewError("تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleShareFromPreview = async () => {
    if (previewFileUri == null && previewBase64 == null) return;
    setPreviewSharing(true);
    try {
      if (Platform.OS === "web" && previewBase64) {
        const link = document.createElement("a");
        link.href = "data:application/pdf;base64," + previewBase64;
        link.download = "laqit-report.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      if (previewFileUri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(previewFileUri, {
            mimeType: "application/pdf",
            dialogTitle: "مشاركة أو حفظ تقرير PDF",
            UTI: "com.adobe.pdf",
          });
        } else {
          setPreviewError("المشاركة غير متاحة على هذا الجهاز");
        }
      }
    } catch {
      setPreviewError("تعذر فتح خيارات المشاركة");
    } finally {
      setPreviewSharing(false);
    }
  };

  const handleOpenEmailModal = () => {
    setSendEmailError(null);
    setSendEmailSuccess(false);
    setEmailModalVisible(true);
  };

  const [sendingToAgent, setSendingToAgent] = useState(false);

  const handleSendToAgent = async () => {
    if (sendingToAgent) return;
    const confirmTitle = "إرسال الطلب للوكيل";
    const confirmMsg = "سيتم إرسال قائمة القطع المطلوبة إلى الوكيل المعتمد للماركة بالبريد الإلكتروني وتحديث حالة الطلب.";
    const doSend = async () => {
      setSendingToAgent(true);
      try {
        const url = new URL(`/api/laqit-inspections/${inspectionId}/send-to-agent`, getApiUrl());
        const resp = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ locale: "ar" }),
        });
        const json = await resp.json().catch(() => ({} as any));
        if (!resp.ok) {
          const msg = json.error ?? "تعذر إرسال الطلب";
          if (Platform.OS === "web") { window.alert(msg); } else { Alert.alert("خطأ", msg); }
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetch();
        const successMsg = "تم إرسال طلب قطع الغيار إلى الوكيل بنجاح";
        if (Platform.OS === "web") { window.alert(successMsg); } else { Alert.alert("تم الإرسال", successMsg); }
      } catch {
        const msg = "تعذر الاتصال بالخادم";
        if (Platform.OS === "web") { window.alert(msg); } else { Alert.alert("خطأ", msg); }
      } finally {
        setSendingToAgent(false);
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`${confirmTitle}\n\n${confirmMsg}`)) doSend();
    } else {
      Alert.alert(confirmTitle, confirmMsg, [
        { text: "إلغاء", style: "cancel" },
        { text: "إرسال", style: "default", onPress: doSend },
      ]);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const performDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const url = new URL(`/api/laqit-inspections/${inspectionId}`, getApiUrl());
      const resp = await fetch(url.toString(), {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({} as any));
        const msg = json.error ?? "\u062a\u0639\u0630\u0631 \u062d\u0630\u0641 \u0627\u0644\u0637\u0644\u0628";
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert("\u062e\u0637\u0623", msg);
        }
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch {
      const msg = "\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("\u062e\u0637\u0623", msg);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    const title = "\u062d\u0630\u0641 \u0627\u0644\u0637\u0644\u0628";
    const message =
      "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0623\u0646\u0643 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628\u061f \u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646\u0647.";

    if (Platform.OS === "web") {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        performDelete();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: "\u0625\u0644\u063a\u0627\u0621", style: "cancel" },
      {
        text: "\u062d\u0630\u0641",
        style: "destructive",
        onPress: performDelete,
      },
    ]);
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
            {/* Preview button — full width */}
            <Pressable
              testID="button-preview-pdf"
              onPress={handlePreviewPdf}
              style={({ pressed }) => [
                styles.pdfPreviewBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="eye" size={18} color="#fff" />
              <ThemedText style={[styles.pdfPreviewBtnText, { fontFamily: "Cairo_700Bold" }]}>
                معاينة PDF
              </ThemedText>
            </Pressable>

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
        ) : (inspection.status === "draft" || inspection.status === "rfq_sent") ? (
          <Pressable
            testID="button-send-to-agent"
            onPress={handleSendToAgent}
            disabled={sendingToAgent || inspection.status !== "draft"}
            style={[
              styles.agentSendBtn,
              {
                backgroundColor: inspection.status === "draft" ? theme.primary : theme.backgroundSecondary,
                opacity: sendingToAgent ? 0.6 : 1,
              },
            ]}
          >
            {sendingToAgent ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : inspection.status === "draft" ? (
              <Feather name="send" size={18} color="#fff" />
            ) : (
              <Feather name="check-circle" size={18} color={theme.textSecondary} />
            )}
            <ThemedText
              style={[
                styles.agentSendBtnText,
                { fontFamily: "Cairo_700Bold", color: inspection.status === "draft" ? "#fff" : theme.textSecondary },
              ]}
            >
              {sendingToAgent ? "جارٍ الإرسال..." : inspection.status === "draft" ? "أرسل الطلب للوكيل" : "تم الإرسال للوكيل"}
            </ThemedText>
          </Pressable>
        ) : null}

        {/* Delete button */}
        <Pressable
          testID="button-delete-order"
          onPress={handleDelete}
          disabled={deleting}
          style={({ pressed }) => [
            styles.deleteBtn,
            {
              opacity: deleting ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="trash-2" size={18} color="#fff" />
          )}
          <ThemedText style={[styles.deleteBtnText, { fontFamily: "Cairo_700Bold" }]}>
            {deleting ? "جارٍ الحذف..." : "حذف الطلب"}
          </ThemedText>
        </Pressable>
      </ScrollView>

      {/* PDF Preview modal */}
      <PdfPreviewModal
        visible={previewVisible}
        pdfBase64={previewBase64}
        loading={previewLoading}
        error={previewError}
        onClose={() => {
          setPreviewVisible(false);
          if (settingsChangedInModal.current) {
            settingsChangedInModal.current = false;
            flashControls();
          }
        }}
        onShare={handleShareFromPreview}
        sharing={previewSharing}
        pdfLocale={pdfLocale}
        onReload={handlePreviewPdf}
      />

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

const previewStyles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  topBarButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: { fontSize: 17 },
  topBarSpacer: { width: 36 },
  settingsStrip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  inlineLocalePicker: {
    flexDirection: "row-reverse",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
    flex: 1,
  },
  inlineLocaleOption: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineLocaleText: { fontSize: 12 },
  inlineCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  inlinePageNumLabel: { fontSize: 12 },
  webViewContainer: { flex: 1 },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing["2xl"],
  },
  stateText: { fontSize: 14, textAlign: "center" },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  webView: { flex: 1 },
  webViewOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  shareButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  shareButtonText: { color: "#fff", fontSize: 16 },
});

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
  settingsHighlightWrapper: {
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginHorizontal: -4,
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
  pdfPreviewBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  pdfPreviewBtnText: { color: "#fff", fontSize: 15 },
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
  deleteBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: "#EF4444",
    marginBottom: Spacing.lg,
  },
  deleteBtnText: { color: "#fff", fontSize: 15 },
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
  agentSendBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  agentSendBtnText: { color: "#fff", fontSize: 16 },
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
