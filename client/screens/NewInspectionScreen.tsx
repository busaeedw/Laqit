import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, authHeaders } from "@/lib/query-client";
import { useUser } from "@/context/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface ApiMake {
  makeId: string;
  makeName: string;
}

interface ApiModel {
  carModelId: string;
  modelName: string;
}

interface PartItem {
  partName: string;
  quantity: number;
  source: "ai" | "user";
}

type Step = 1 | 2 | 3 | 4;

const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) =>
  String(new Date().getFullYear() - i)
);

export default function NewInspectionScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const { user, isLoggedIn, isHydrated, clearSession } = useUser();

  const requireLogin = (): boolean => {
    if (isLoggedIn) return true;
    if (!isHydrated) return false;
    Alert.alert(
      "تسجيل الدخول مطلوب",
      "يجب تسجيل الدخول أولاً لاستخدام التحليل بالذكاء الاصطناعي",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تسجيل الدخول",
          onPress: () =>
            (navigation as any).push("Main", { screen: "AccountTab" }),
        },
      ]
    );
    return false;
  };

  const [step, setStep] = useState<Step>(1);

  // Step 1 – car
  const [makes, setMakes] = useState<ApiMake[]>([]);
  const [models, setModels] = useState<ApiModel[]>([]);
  const [selectedMake, setSelectedMake] = useState<ApiMake | null>(null);
  const [selectedModel, setSelectedModel] = useState<ApiModel | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [makesLoading, setMakesLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [carIdentifying, setCarIdentifying] = useState(false);

  // Step 2 – photos
  const [carPhotoUri, setCarPhotoUri] = useState<string | null>(null);
  const [damagePhotoUri, setDamagePhotoUri] = useState<string | null>(null);

  // Step 3 – parts
  const [parts, setParts] = useState<PartItem[]>([]);
  const [newPartName, setNewPartName] = useState("");
  const [partsLoading, setPartsLoading] = useState(false);

  // Step 4 / submission
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [inspectionNo, setInspectionNo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Auto-clear session-expired gate as soon as the user logs back in
  useEffect(() => {
    if (user && sessionExpired) {
      setSessionExpired(false);
      setSubmitError(null);
    }
  }, [user]);

  const apiUrl = getApiUrl();

  const loadMakes = useCallback(async (): Promise<ApiMake[]> => {
    setMakesLoading(true);
    try {
      const resp = await fetch(new URL("/api/car-makes", apiUrl).toString());
      const data = await resp.json();
      const list: ApiMake[] = data.makes ?? [];
      setMakes(list);
      return list;
    } catch {
      return [];
    } finally {
      setMakesLoading(false);
    }
  }, [apiUrl]);

  // Auto-load makes on mount so identification always has data available
  useEffect(() => {
    loadMakes();
  }, [loadMakes]);

  const loadModels = useCallback(
    async (makeId: string) => {
      setModelsLoading(true);
      setModels([]);
      setSelectedModel(null);
      try {
        const resp = await fetch(
          new URL(`/api/car-models/${makeId}`, apiUrl).toString()
        );
        const data = await resp.json();
        setModels(data.models ?? []);
      } catch {
        // fallback silently
      } finally {
        setModelsLoading(false);
      }
    },
    [apiUrl]
  );

  const handleIdentifyByCar = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const dataUri = `data:image/jpeg;base64,${asset.base64}`;

    setCarIdentifying(true);
    try {
      const resp = await fetch(new URL("/api/identify-car", apiUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ imageUri: dataUri }),
      });
      if (resp.status === 401) {
        requireLogin();
        return;
      }
      const data = await resp.json();
      if (!resp.ok) {
        Alert.alert("", data.message || data.error || "تعذر تحليل صورة السيارة، يرجى المحاولة مرة أخرى");
        return;
      }
      if (!data.makeName) {
        Alert.alert("", "تعذر تحديد نوع السيارة من الصورة، يرجى الاختيار يدوياً");
        return;
      }

      // Ensure makes are loaded (auto-loads on mount, but fetch again if still empty)
      let allMakes = makes;
      if (allMakes.length === 0) {
        allMakes = await loadMakes();
      }
      if (allMakes.length === 0) {
        Alert.alert("خطأ", "تعذر تحميل قائمة العلامات، يرجى التحقق من الاتصال والمحاولة مجدداً");
        return;
      }

      // Match make — exact, then substring, then token-level
      const idMake = (data.makeName ?? "").toLowerCase().trim();
      const matchedMake = allMakes.find(
        (m) => {
          const name = m.makeName.toLowerCase().trim();
          return (
            name === idMake ||
            name.includes(idMake) ||
            idMake.includes(name) ||
            idMake.split(/[\s-]+/).some((token: string) => name.includes(token) && token.length >= 3)
          );
        }
      );

      if (!matchedMake) {
        Alert.alert("", `تم التعرف على الماركة كـ "${data.makeName}" لكنها غير موجودة في القائمة، يرجى الاختيار يدوياً`);
        return;
      }
      setSelectedMake(matchedMake);

      // Load models for matched make
      setModelsLoading(true);
      const modelsResp = await fetch(new URL(`/api/car-models/${matchedMake.makeId}`, apiUrl).toString());
      const modelsData = await modelsResp.json();
      const allModels: ApiModel[] = modelsData.models ?? [];
      setModels(allModels);
      setModelsLoading(false);

      // Match model
      const idModel = (data.modelName ?? "").toLowerCase();
      const matchedModel = allModels.find(
        (m) =>
          m.modelName.toLowerCase() === idModel ||
          m.modelName.toLowerCase().includes(idModel) ||
          idModel.includes(m.modelName.toLowerCase())
      );
      if (matchedModel) setSelectedModel(matchedModel);

      // Set year
      if (data.year) setSelectedYear(String(data.year));

      const label = [matchedMake.makeName, matchedModel?.modelName, data.year].filter(Boolean).join(" ");
      Alert.alert("تم التحديد", `تم التعرف على السيارة: ${label}`);
    } catch {
      Alert.alert("خطأ", "تعذر تحليل صورة السيارة، يرجى المحاولة مرة أخرى");
    } finally {
      setCarIdentifying(false);
    }
  };

  const createInspection = async (): Promise<string | null> => {
    if (!user?.customerId || !selectedModel) return null;
    const resp = await fetch(
      new URL("/api/laqit-inspections", apiUrl).toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          customerId: user.customerId,
          carModelId: selectedModel.carModelId,
          carYear: selectedYear || null,
        }),
      }
    );
    const data = await resp.json();
    if (resp.status === 401) {
      const e: any = new Error(data.error ?? "الجلسة منتهية، يرجى تسجيل الدخول مجدداً");
      e.isSessionExpired = true;
      throw e;
    }
    if (!resp.ok) throw new Error(data.error ?? "خطأ في إنشاء الفحص");
    return data.inspection;
  };

  const uploadPhoto = async (
    inspId: string,
    uri: string,
    mediaType: "car_photo" | "damage_photo"
  ) => {
    await fetch(
      new URL(`/api/laqit-inspections/${inspId}/media`, apiUrl).toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ fileUrl: uri, mediaType }),
      }
    );
  };

  const saveParts = async (inspId: string) => {
    if (parts.length === 0) return;
    await fetch(
      new URL(`/api/laqit-inspections/${inspId}/parts`, apiUrl).toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ parts }),
      }
    );
  };

  const analyzeForParts = async () => {
    if (!damagePhotoUri) return;
    setPartsLoading(true);
    try {
      const resp = await fetch(new URL("/api/analyze", apiUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          imageUri: damagePhotoUri,
          carInfo: selectedModel
            ? { make: selectedMake?.makeName ?? "", model: selectedModel.modelName, year: selectedYear }
            : undefined,
        }),
      });
      if (resp.status === 401) {
        requireLogin();
        return;
      }
      const data = await resp.json();
      if (!resp.ok) {
        Alert.alert(
          "تعذر التحليل",
          data.message || data.error || "حدث خطأ أثناء تحليل صورة الضرر، يرجى المحاولة مرة أخرى"
        );
        return;
      }
      const aiParts: PartItem[] = Array.isArray(data.parts)
        ? data.parts.map((p: any) => ({
            partName: p.nameAr ?? p.name ?? "قطعة",
            quantity: 1,
            source: "ai" as const,
          }))
        : [];
      if (aiParts.length > 0) {
        setParts(aiParts);
      } else {
        Alert.alert(
          "لم يتم اكتشاف أضرار",
          "لم نتمكن من اكتشاف أضرار واضحة في الصورة. يمكنك التقاط صورة أوضح أو إضافة القطع المطلوبة يدوياً."
        );
      }
    } catch {
      Alert.alert(
        "تعذر التحليل",
        "تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى"
      );
    } finally {
      setPartsLoading(false);
    }
  };

  const pickImage = async (
    setter: (uri: string) => void
  ) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const dataUri = `data:image/jpeg;base64,${asset.base64}`;
      setter(dataUri);
    }
  };

  const goNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 1) {
      if (!selectedMake || !selectedModel) {
        Alert.alert("", "يرجى اختيار الماركة والموديل");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!damagePhotoUri) {
        Alert.alert("", "يرجى إضافة صورة العطل أولاً");
        return;
      }
      setStep(3);
      await analyzeForParts();
    } else if (step === 3) {
      if (parts.length === 0) {
        Alert.alert("", "أضف قطعة واحدة على الأقل");
        return;
      }
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    if (!user?.customerId) {
      setSubmitError("يجب تسجيل الدخول أولاً لإرسال الطلب");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const inspection = await createInspection();
      if (!inspection) throw new Error("فشل إنشاء الفحص");
      const inspId = (inspection as any).inspectionId;
      const inspNo = (inspection as any).inspectionNo;

      if (carPhotoUri) await uploadPhoto(inspId, carPhotoUri, "car_photo");
      if (damagePhotoUri) await uploadPhoto(inspId, damagePhotoUri, "damage_photo");
      await saveParts(inspId);

      await fetch(
        new URL(`/api/laqit-inspections/${inspId}/submit`, apiUrl).toString(),
        { method: "POST", headers: authHeaders() }
      );

      setInspectionId(inspId);
      setInspectionNo(inspNo);
      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const msg = err.message ?? "حدث خطأ أثناء الإرسال";
      setSubmitError(msg);
      if (err.isSessionExpired) {
        clearSession();
        setSessionExpired(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = ["السيارة", "الصور", "القطع", "المراجعة"];

  if (submitted) {
    return (
      <View style={[styles.successContainer, { backgroundColor: theme.backgroundRoot }]}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.successCard}>
          <View style={[styles.successIcon, { backgroundColor: theme.success + "20" }]}>
            <Feather name="check-circle" size={56} color={theme.success} />
          </View>
          <ThemedText style={[styles.successTitle, { fontFamily: "Cairo_700Bold" }]}>
            تم إرسال الطلب بنجاح
          </ThemedText>
          <ThemedText style={[styles.successInspNo, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
            {inspectionNo}
          </ThemedText>
          <ThemedText style={[styles.successHint, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            سيتواصل معك الموردون عبر الواتساب بعروض الأسعار. ستصلك إشعارات SMS عند وصول العروض.
          </ThemedText>
          <Pressable
            onPress={() => navigation.navigate("Main")}
            style={[styles.successBtn, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={[styles.successBtnText, { fontFamily: "Cairo_700Bold" }]}>
              العودة للرئيسية
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      {/* Step indicator */}
      <View
        style={[
          styles.stepsRow,
          {
            paddingTop: headerHeight + Spacing.sm,
            backgroundColor: theme.backgroundDefault,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {stepLabels.map((label, idx) => {
          const stepNum = (idx + 1) as Step;
          const active = step === stepNum;
          const done = step > stepNum;
          return (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: done
                      ? theme.success
                      : active
                      ? theme.primary
                      : theme.border,
                  },
                ]}
              >
                {done ? (
                  <Feather name="check" size={12} color="#fff" />
                ) : (
                  <ThemedText style={[styles.stepNum, { color: active ? "#fff" : theme.textSecondary }]}>
                    {stepNum}
                  </ThemedText>
                )}
              </View>
              <ThemedText
                style={[
                  styles.stepLabel,
                  {
                    color: active ? theme.primary : theme.textSecondary,
                    fontFamily: active ? "Cairo_700Bold" : "Cairo_400Regular",
                  },
                ]}
              >
                {label}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing["4xl"],
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step 1: Car ── */}
        {step === 1 && (
          <Animated.View entering={FadeInRight.duration(400)}>
            <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
              اختر السيارة
            </ThemedText>

            {/* Identify by photo — always visible */}
            <Pressable
              style={[
                styles.identifyPhotoBtn,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: carIdentifying ? theme.textSecondary : theme.primary,
                  opacity: carIdentifying ? 0.6 : 1,
                },
              ]}
              onPress={handleIdentifyByCar}
              disabled={carIdentifying}
              testID="button-identify-car"
            >
              {carIdentifying ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Feather name="camera" size={16} color={theme.primary} />
              )}
              <ThemedText style={[styles.identifyPhotoBtnText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                {carIdentifying ? "جاري تحليل الصورة..." : "تحديد نوع السيارة بالصورة"}
              </ThemedText>
            </Pressable>

            {/* Makes */}
            {makesLoading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.lg }} />
            ) : makes.length === 0 ? (
              <Pressable
                style={[styles.loadBtn, { backgroundColor: theme.primary, marginTop: Spacing.md }]}
                onPress={loadMakes}
                testID="button-load-makes"
              >
                <ThemedText style={[styles.loadBtnText, { fontFamily: "Cairo_700Bold" }]}>
                  تحميل قائمة العلامات
                </ThemedText>
              </Pressable>
            ) : (
              <>
                <ThemedText style={[styles.fieldLabel, { fontFamily: "Cairo_600SemiBold", color: theme.textSecondary }]}>
                  الماركة
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                  {makes.map((m) => (
                    <Pressable
                      key={m.makeId}
                      onPress={() => {
                        setSelectedMake(m);
                        loadModels(m.makeId);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            selectedMake?.makeId === m.makeId ? theme.primary : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          {
                            color: selectedMake?.makeId === m.makeId ? "#fff" : theme.text,
                            fontFamily: "Cairo_600SemiBold",
                          },
                        ]}
                      >
                        {m.makeName}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Models */}
            {selectedMake && (
              <>
                <ThemedText style={[styles.fieldLabel, { fontFamily: "Cairo_600SemiBold", color: theme.textSecondary, marginTop: Spacing.lg }]}>
                  الموديل
                </ThemedText>
                {modelsLoading ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <View style={styles.modelsGrid}>
                    {models.map((m) => (
                      <Pressable
                        key={m.carModelId}
                        onPress={() => setSelectedModel(m)}
                        style={[
                          styles.modelChip,
                          {
                            backgroundColor:
                              selectedModel?.carModelId === m.carModelId
                                ? theme.primary
                                : theme.backgroundSecondary,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.chipText,
                            {
                              color:
                                selectedModel?.carModelId === m.carModelId ? "#fff" : theme.text,
                              fontFamily: "Cairo_600SemiBold",
                            },
                          ]}
                        >
                          {m.modelName}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Year */}
            {selectedModel && (
              <>
                <ThemedText style={[styles.fieldLabel, { fontFamily: "Cairo_600SemiBold", color: theme.textSecondary, marginTop: Spacing.lg }]}>
                  السنة (اختياري)
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                  {YEAR_OPTIONS.map((y) => (
                    <Pressable
                      key={y}
                      onPress={() => setSelectedYear(y === selectedYear ? "" : y)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selectedYear === y ? theme.primary : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          {
                            color: selectedYear === y ? "#fff" : theme.text,
                            fontFamily: "Cairo_400Regular",
                          },
                        ]}
                      >
                        {y}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </Animated.View>
        )}

        {/* ── Step 2: Photos ── */}
        {step === 2 && (
          <Animated.View entering={FadeInRight.duration(400)}>
            <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
              صور السيارة
            </ThemedText>

            {[
              { label: "صورة العطل / الضرر", uri: damagePhotoUri, setter: setDamagePhotoUri },
            ].map(({ label, uri, setter }) => (
              <View key={label} style={styles.photoBlock}>
                <ThemedText style={[styles.fieldLabel, { fontFamily: "Cairo_600SemiBold", color: theme.textSecondary }]}>
                  {label}
                </ThemedText>
                {uri ? (
                  <Pressable onPress={() => pickImage(setter)}>
                    <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
                    <ThemedText style={[styles.changePhoto, { color: theme.primary, fontFamily: "Cairo_400Regular" }]}>
                      تغيير الصورة
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => pickImage(setter)}
                    style={[styles.photoPlaceholder, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                  >
                    <Feather name="camera" size={32} color={theme.textSecondary} />
                    <ThemedText style={[styles.photoPlaceholderText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                      اضغط لاختيار صورة
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── Step 3: Parts ── */}
        {step === 3 && (
          <Animated.View entering={FadeInRight.duration(400)}>
            <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
              القطع المطلوبة
            </ThemedText>

            {partsLoading ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator color={theme.primary} size="large" />
                <ThemedText style={[styles.loadingText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                  جارٍ تحليل صورة الضرر بالذكاء الاصطناعي...
                </ThemedText>
              </View>
            ) : (
              <>
                {parts.map((p, idx) => (
                  <View key={idx} style={[styles.partRow, { backgroundColor: theme.backgroundDefault }]}>
                    <Pressable
                      onPress={() => setParts(parts.filter((_, i) => i !== idx))}
                      style={styles.removeBtn}
                    >
                      <Feather name="x" size={16} color={theme.error} />
                    </Pressable>
                    <ThemedText style={[styles.partName, { fontFamily: "Cairo_400Regular" }]}>
                      {p.partName}
                    </ThemedText>
                    {p.source === "ai" && (
                      <View style={[styles.aiBadge, { backgroundColor: theme.primary + "20" }]}>
                        <ThemedText style={[styles.aiBadgeText, { color: theme.primary, fontFamily: "Cairo_400Regular" }]}>
                          AI
                        </ThemedText>
                      </View>
                    )}
                  </View>
                ))}

                <View style={[styles.addPartRow, { backgroundColor: theme.backgroundDefault }]}>
                  <Pressable
                    onPress={() => {
                      const name = newPartName.trim();
                      if (!name) return;
                      setParts([...parts, { partName: name, quantity: 1, source: "user" }]);
                      setNewPartName("");
                    }}
                    style={[styles.addPartBtn, { backgroundColor: theme.primary }]}
                  >
                    <Feather name="plus" size={20} color="#fff" />
                  </Pressable>
                  <TextInput
                    value={newPartName}
                    onChangeText={setNewPartName}
                    placeholder="أضف قطعة يدوياً"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.addPartInput, { color: theme.text, fontFamily: "Cairo_400Regular" }]}
                    textAlign="right"
                    onSubmitEditing={() => {
                      const name = newPartName.trim();
                      if (!name) return;
                      setParts([...parts, { partName: name, quantity: 1, source: "user" }]);
                      setNewPartName("");
                    }}
                  />
                </View>
              </>
            )}
          </Animated.View>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <Animated.View entering={FadeInRight.duration(400)}>
            <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
              مراجعة الطلب
            </ThemedText>

            <View style={[styles.reviewCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.reviewLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                السيارة
              </ThemedText>
              <ThemedText style={[styles.reviewValue, { fontFamily: "Cairo_700Bold" }]}>
                {selectedMake?.makeName} {selectedModel?.modelName}
                {selectedYear ? ` — ${selectedYear}` : ""}
              </ThemedText>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.reviewLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                القطع ({parts.length})
              </ThemedText>
              {parts.map((p, idx) => (
                <ThemedText key={idx} style={[styles.reviewPart, { fontFamily: "Cairo_400Regular" }]}>
                  {idx + 1}. {p.partName}
                </ThemedText>
              ))}
            </View>

            {(carPhotoUri || damagePhotoUri) && (
              <View style={styles.reviewPhotos}>
                {carPhotoUri && (
                  <Image source={{ uri: carPhotoUri }} style={styles.reviewPhoto} resizeMode="cover" />
                )}
                {damagePhotoUri && (
                  <Image source={{ uri: damagePhotoUri }} style={styles.reviewPhoto} resizeMode="cover" />
                )}
              </View>
            )}

            <ThemedText style={[styles.reviewHint, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              بالضغط على إرسال، سيُولَّد رقم فحص فريد ويُرسَل طلب عرض السعر للموردين المناسبين في مدينتك.
            </ThemedText>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom action */}
      <View
        style={[
          styles.footer,
          { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        {step > 1 && !submitted && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStep((s) => (s - 1) as Step);
            }}
            style={[styles.backBtn, { borderColor: theme.border }]}
          >
            <ThemedText style={[styles.backBtnText, { color: theme.text, fontFamily: "Cairo_600SemiBold" }]}>
              رجوع
            </ThemedText>
          </Pressable>
        )}

        {step < 4 ? (
          <Pressable
            onPress={goNext}
            disabled={partsLoading || submitting}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: theme.primary, opacity: pressed || partsLoading || submitting ? 0.5 : 1 },
            ]}
          >
            <ThemedText style={[styles.nextBtnText, { fontFamily: "Cairo_700Bold" }]}>
              {partsLoading ? "جارٍ التحليل..." : "التالي"}
            </ThemedText>
            {!partsLoading && <Feather name="arrow-left" size={18} color="#fff" />}
          </Pressable>
        ) : (
          <View style={styles.submitCol}>
            {submitError ? (
              <ThemedText style={[styles.submitErrorText, { color: "#DC2626", fontFamily: "Cairo_400Regular" }]}>
                {submitError}
              </ThemedText>
            ) : null}
            <View style={styles.submitRow}>
              {sessionExpired ? (
                <Pressable
                  onPress={() => (navigation as any).push("Main", { screen: "AccountTab" })}
                  style={[styles.nextBtn, { backgroundColor: theme.primary }]}
                >
                  <ThemedText style={[styles.nextBtnText, { fontFamily: "Cairo_700Bold" }]}>
                    تسجيل الدخول
                  </ThemedText>
                  <Feather name="log-in" size={18} color="#fff" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={[
                    styles.nextBtn,
                    {
                      backgroundColor: submitting
                        ? theme.textSecondary
                        : theme.primary,
                    },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <ThemedText style={[styles.nextBtnText, { fontFamily: "Cairo_700Bold" }]}>
                        إرسال الطلب
                      </ThemedText>
                      <Feather name="send" size={18} color="#fff" />
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  stepsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  stepItem: { alignItems: "center", gap: 4 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: { fontSize: 13 },
  stepLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 20, textAlign: "right", marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 13, textAlign: "right", marginBottom: Spacing.xs },
  loadBtnsRow: {
    flexDirection: "row-reverse",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  loadBtnFlex: {
    flex: 1,
  },
  loadBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  loadBtnText: { color: "#fff", fontSize: 15, textAlign: "center" },
  identifyPhotoBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  identifyPhotoBtnText: { fontSize: 14, textAlign: "center" },
  chipsRow: { flexDirection: "row", marginBottom: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  chipText: { fontSize: 13 },
  modelsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modelChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  photoBlock: { marginBottom: Spacing.xl },
  photoPlaceholder: {
    height: 160,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  photoPlaceholderText: { fontSize: 14 },
  photoPreview: { width: "100%", height: 180, borderRadius: BorderRadius.md },
  changePhoto: { textAlign: "center", marginTop: Spacing.xs, fontSize: 13 },
  loadingBlock: { alignItems: "center", gap: Spacing.md, marginTop: Spacing["3xl"] },
  loadingText: { fontSize: 14, textAlign: "center" },
  partRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  removeBtn: { padding: 4 },
  partName: { flex: 1, fontSize: 14, textAlign: "right" },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: { fontSize: 10 },
  addPartRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  addPartInput: { flex: 1, fontSize: 14 },
  addPartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  reviewLabel: { fontSize: 13 },
  reviewValue: { fontSize: 16, textAlign: "right" },
  reviewPart: { fontSize: 14, textAlign: "right", lineHeight: 24 },
  reviewPhotos: { flexDirection: "row-reverse", gap: Spacing.sm, marginBottom: Spacing.md },
  reviewPhoto: { flex: 1, height: 120, borderRadius: BorderRadius.md },
  reviewHint: { fontSize: 13, textAlign: "center", lineHeight: 22, marginTop: Spacing.sm },
  footer: {
    flexDirection: "row-reverse",
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  backBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
  },
  backBtnText: { fontSize: 15 },
  nextBtn: {
    flex: 2,
    flexDirection: "row-reverse",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  nextBtnText: { color: "#fff", fontSize: 15 },
  loginNudge: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 6,
  },
  submitCol: {
    flex: 2,
    gap: 6,
  },
  submitRow: {
    flexDirection: "row",
  },
  submitErrorText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  successContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  successCard: { alignItems: "center", gap: Spacing.lg, maxWidth: 360 },
  successIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center" },
  successTitle: { fontSize: 22, textAlign: "center" },
  successInspNo: { fontSize: 20, textAlign: "center" },
  successHint: { fontSize: 14, textAlign: "center", lineHeight: 24 },
  successBtn: {
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  successBtnText: { color: "#fff", fontSize: 16 },
});
