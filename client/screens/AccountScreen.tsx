import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl, authHeaders } from "@/lib/query-client";
import { formatDualDate } from "@/utils/dateFormat";
import { useUser } from "@/context/UserContext";

interface MenuItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  badge?: string;
  color?: string;
}

type ModalMode = "login" | "register";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, isDark } = useTheme();
  const { user, setUser, setSession, clearSession, isLoggedIn } = useUser();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  
  const [formName, setFormName] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; mobile?: string; terms?: string; general?: string }>({});

  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [inspections, setInspections] = useState<any[]>([]);
  const [isLoadingInspections, setIsLoadingInspections] = useState(false);

  const [isCarsModalVisible, setIsCarsModalVisible] = useState(false);
  const [userCars, setUserCars] = useState<any[]>([]);
  const [isLoadingCars, setIsLoadingCars] = useState(false);

  const [isPartsModalVisible, setIsPartsModalVisible] = useState(false);
  const [userParts, setUserParts] = useState<any[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);

  const [cities, setCities] = useState<{ cityId: string; nameAr: string; nameEn: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [isCityPickerVisible, setIsCityPickerVisible] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [formOtp, setFormOtp] = useState("");
  const [pendingMobileE164, setPendingMobileE164] = useState("");

  const fetchInspections = async () => {
    if (!user?.customerId) return;

    setIsLoadingInspections(true);
    try {
      const response = await fetch(
        new URL(`/api/laqit-inspections/customer/${user.customerId}`, getApiUrl()).toString(),
        { headers: authHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        setInspections(data.inspections || []);
      }
    } catch (error) {
      console.error("Failed to fetch inspections:", error);
    } finally {
      setIsLoadingInspections(false);
    }
  };

  const handleViewHistory = () => {
    if (!isLoggedIn) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchInspections();
    setIsHistoryModalVisible(true);
  };

  const fetchUserCars = async () => {
    if (!user?.customerId) return;

    setIsLoadingCars(true);
    try {
      const response = await fetch(
        new URL(`/api/laqit-inspections/customer/${user.customerId}`, getApiUrl()).toString(),
        { headers: authHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        const inspectionsList: any[] = data.inspections || [];

        // Deduplicate by carModelId — show each car once with inspection count
        const carsMap = new Map<string, {
          carModelId: string;
          makeName: string;
          modelName: string;
          carYear: number | null;
          inspectionCount: number;
          lastInspectionNo: string;
          lastInspectionDate: string;
        }>();

        inspectionsList.forEach((insp: any) => {
          const key = insp.carModelId;
          if (!carsMap.has(key)) {
            carsMap.set(key, {
              carModelId: insp.carModelId,
              makeName: insp.makeName ?? "",
              modelName: insp.modelName ?? "",
              carYear: insp.carYear ?? null,
              inspectionCount: 0,
              lastInspectionNo: insp.inspectionNo,
              lastInspectionDate: insp.createdAt,
            });
          }
          const entry = carsMap.get(key)!;
          entry.inspectionCount += 1;
          // Keep most recent inspection info (list is ordered desc)
          if (!entry.lastInspectionNo) {
            entry.lastInspectionNo = insp.inspectionNo;
            entry.lastInspectionDate = insp.createdAt;
          }
        });

        setUserCars(Array.from(carsMap.values()));
      }
    } catch (error) {
      console.error("Failed to fetch user cars:", error);
    } finally {
      setIsLoadingCars(false);
    }
  };

  const handleViewCars = () => {
    if (!isLoggedIn) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchUserCars();
    setIsCarsModalVisible(true);
  };

  const fetchUserParts = async () => {
    if (!user?.customerId) return;

    setIsLoadingParts(true);
    try {
      const response = await fetch(
        new URL(`/api/laqit-inspections/customer/${user.customerId}`, getApiUrl()).toString(),
        { headers: authHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        const inspectionsList: any[] = data.inspections || [];
        const allParts: any[] = [];
        inspectionsList.forEach((inspection: any) => {
          allParts.push({
            partName: [inspection.makeName, inspection.modelName, inspection.carYear].filter(Boolean).join(" "),
            inspectionNumber: inspection.inspectionNo,
            inspectionId: inspection.inspectionId,
            carMakeAr: inspection.makeName,
            carModelAr: inspection.modelName,
            carYear: inspection.carYear,
            createdAt: inspection.createdAt,
          });
        });
        setUserParts(allParts);
      }
    } catch (error) {
      console.error("Failed to fetch user parts:", error);
    } finally {
      setIsLoadingParts(false);
    }
  };

  const handleViewParts = () => {
    if (!isLoggedIn) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchUserParts();
    setIsPartsModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    const { gregorian, hijri } = formatDualDate(dateString, true);
    return `${gregorian}\n${hijri}`;
  };

  const handleViewPricing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Pricing");
  };

  const loadCities = async () => {
    if (cities.length > 0) return;
    try {
      const resp = await fetch(new URL("/api/cities", getApiUrl()).toString());
      const data = await resp.json();
      setCities(data.cities ?? []);
    } catch { /* ignore */ }
  };

  const handleOpenModal = (mode: ModalMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalMode(mode);
    setFormName("");
    setFormMobile("");
    setFormEmail("");
    setSelectedCityId("");
    setTermsAccepted(false);
    setFormErrors({});
    setOtpStep(false);
    setFormOtp("");
    setPendingMobileE164("");
    setIsModalVisible(true);
    if (mode === "register") loadCities();
  };

  const validateLoginForm = () => {
    const errors: { name?: string; mobile?: string } = {};
    
    if (!formName.trim()) {
      errors.name = "الاسم مطلوب";
    }
    
    if (!formMobile.trim()) {
      errors.mobile = "رقم الجوال مطلوب";
    } else if (!/^05[0-9]{8}$/.test(formMobile.replace(/\s/g, ""))) {
      errors.mobile = "رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateRegisterForm = () => {
    const errors: { name?: string; mobile?: string; terms?: string } = {};
    
    if (!formName.trim()) {
      errors.name = "الاسم مطلوب";
    }
    
    if (!formMobile.trim()) {
      errors.mobile = "رقم الجوال مطلوب";
    } else if (!/^05[0-9]{8}$/.test(formMobile.replace(/\s/g, ""))) {
      errors.mobile = "رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام";
    }
    
    if (!termsAccepted) {
      errors.terms = "يجب الموافقة على الشروط والأحكام";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setFormErrors({});

    try {
      const rawMobile = formMobile.trim().replace(/[\s\-\(\)]/g, "");
      const mobileE164 = rawMobile.startsWith("+")
        ? rawMobile
        : `+966${rawMobile.replace(/^0/, "")}`;

      const response = await fetch(
        new URL("/api/customers/login", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobileE164 }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setFormErrors({ general: data.error || "حدث خطأ أثناء تسجيل الدخول" });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // OTP disabled for login: the server returns the session token directly
      // for an existing account, so skip the verification step entirely.
      if (data.token && data.customer) {
        const customer = data.customer;
        setSession(
          {
            id: customer.customerId,
            name: customer.fullName ?? formName.trim(),
            mobile: customer.mobileE164,
            email: customer.email,
            customerId: customer.customerId,
            cityId: customer.cityId,
            isAdmin: !!customer.isAdmin,
          },
          data.token
        );
        setIsModalVisible(false);
        setOtpStep(false);
        return;
      }

      setPendingMobileE164(mobileE164);
      setFormOtp("");
      setOtpStep(true);
    } catch (error) {
      setFormErrors({ general: "حدث خطأ في الاتصال بالخادم" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formOtp.trim() || formOtp.trim().length !== 6) {
      setFormErrors({ general: "يرجى إدخال رمز التحقق المكون من 6 أرقام" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setFormErrors({});

    try {
      const response = await fetch(
        new URL("/api/customers/verify-otp", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mobileE164: pendingMobileE164,
            otp: formOtp.trim(),
            ...(modalMode === "register" && {
              fullName: formName.trim() || undefined,
              email: formEmail.trim(),
              cityId: selectedCityId,
            }),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error || "رمز التحقق غير صحيح";
        setFormErrors({ general: data.attemptsLeft != null ? `${msg} (${data.attemptsLeft} محاولات متبقية)` : msg });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const customer = data.customer;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSession(
        {
          id: customer.customerId,
          name: customer.fullName ?? formName.trim(),
          mobile: customer.mobileE164,
          email: customer.email,
          customerId: customer.customerId,
          cityId: customer.cityId,
          isAdmin: !!customer.isAdmin,
        },
        data.token
      );
      setIsModalVisible(false);
      setOtpStep(false);
    } catch (error) {
      setFormErrors({ general: "حدث خطأ في الاتصال بالخادم" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingMobileE164) return;
    setFormErrors({});
    setIsLoading(true);
    try {
      const endpoint = modalMode === "login" ? "/api/customers/login" : "/api/customers/login";
      const response = await fetch(
        new URL(endpoint, getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobileE164: pendingMobileE164 }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setFormErrors({ general: data.error || "حدث خطأ أثناء إعادة الإرسال" });
      } else {
        setFormOtp("");
      }
    } catch {
      setFormErrors({ general: "حدث خطأ في الاتصال بالخادم" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateRegisterForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!selectedCityId) {
      setFormErrors({ general: "يرجى اختيار المدينة" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setFormErrors({});

    try {
      const rawMobile = formMobile.trim().replace(/[\s\-\(\)]/g, "");
      const mobileE164 = rawMobile.startsWith("+")
        ? rawMobile
        : `+966${rawMobile.replace(/^0/, "")}`;

      // Register in new customers table
      const custResponse = await fetch(
        new URL("/api/customers/register", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formName.trim(),
            mobileE164,
            email: formEmail.trim(),
            cityId: selectedCityId,
          }),
        }
      );
      const custData = await custResponse.json();

      if (!custResponse.ok) {
        setFormErrors({ general: custData.error || "حدث خطأ أثناء التسجيل" });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // OTP frozen: server creates the account and returns a session token directly.
      const customer = custData.customer;
      setSession(
        {
          id: customer.customerId,
          name: customer.fullName ?? formName.trim(),
          mobile: customer.mobileE164,
          email: customer.email,
          customerId: customer.customerId,
          cityId: customer.cityId,
          isAdmin: !!customer.isAdmin,
        },
        custData.token
      );
      setIsModalVisible(false);
      setOtpStep(false);
    } catch (error) {
      setFormErrors({ general: "حدث خطأ في الاتصال بالخادم" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSession();
  };

  const handleAdminCustomers = () => {
    navigation.navigate("AdminCustomers");
  };

  const menuItems: MenuItem[][] = [
    [
      { id: "subscription", icon: "star", label: isLoggedIn && user?.isAdmin ? "مدير النظام" : "اشتراكي", badge: isLoggedIn && user?.isAdmin ? "مدير" : "مجاني", onPress: handleViewPricing },
      { id: "pricing", icon: "credit-card", label: "الباقات والأسعار", onPress: handleViewPricing },
    ],
    [
      { id: "history", icon: "clock", label: "سجل الفحوصات", onPress: handleViewHistory },
      { id: "favorites", icon: "heart", label: "القطع المحفوظة", onPress: handleViewParts },
      { id: "vehicles", icon: "truck", label: "سياراتي", onPress: handleViewCars },
    ],
    [
      { id: "notifications", icon: "bell", label: "الإشعارات" },
      { id: "language", icon: "globe", label: "اللغة", badge: "العربية" },
      { id: "support", icon: "help-circle", label: "المساعدة والدعم" },
    ],
    [
      { id: "about", icon: "info", label: "عن التطبيق" },
      { id: "terms", icon: "file-text", label: "الشروط والأحكام" },
      { id: "privacy", icon: "shield", label: "سياسة الخصوصية" },
    ],
  ];

  const renderMenuSection = (items: MenuItem[], sectionIndex: number) => (
    <Animated.View
      key={sectionIndex}
      entering={FadeInDown.duration(400).delay(100 * sectionIndex)}
      style={[styles.menuSection, { backgroundColor: theme.backgroundDefault }]}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              item.onPress?.();
            }}
            style={({ pressed }) => [
              styles.menuItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: theme.primary + "15" }]}>
                <Feather name={item.icon} size={18} color={item.color || theme.primary} />
              </View>
              <ThemedText style={[styles.menuLabel, { fontFamily: "Cairo_600SemiBold" }]}>
                {item.label}
              </ThemedText>
            </View>
            <View style={styles.menuItemRight}>
              {item.badge ? (
                <ThemedText style={[styles.menuBadge, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                  {item.badge}
                </ThemedText>
              ) : null}
              <Feather name="chevron-left" size={18} color={theme.textSecondary} />
            </View>
          </Pressable>
          {index < items.length - 1 ? (
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          ) : null}
        </React.Fragment>
      ))}
    </Animated.View>
  );

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={[styles.profileCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Feather name="user" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <ThemedText style={[styles.profileName, { fontFamily: "Cairo_700Bold" }]}>
                {isLoggedIn && user ? user.name : "مستخدم ضيف"}
              </ThemedText>
              <ThemedText style={[styles.profileEmail, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                {isLoggedIn && user ? user.mobile : "سجل دخول لحفظ بياناتك"}
              </ThemedText>
            </View>
            {!isLoggedIn ? (
              <View style={styles.authButtons}>
                <Pressable 
                  onPress={() => handleOpenModal("login")}
                  style={({ pressed }) => [
                    styles.loginButton, 
                    { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  <ThemedText style={[styles.loginButtonText, { fontFamily: "Cairo_600SemiBold" }]}>
                    تسجيل الدخول
                  </ThemedText>
                </Pressable>
                <Pressable 
                  onPress={() => handleOpenModal("register")}
                  style={({ pressed }) => [
                    styles.registerLink,
                    { opacity: pressed ? 0.6 : 1 }
                  ]}
                >
                  <ThemedText style={[styles.registerLinkText, { color: theme.primary, fontFamily: "Cairo_400Regular" }]}>
                    ليس لديك حساب؟ سجل الآن
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <View style={styles.menuContainer}>
          {menuItems.map((section, index) => renderMenuSection(section, index))}
        </View>

        {isLoggedIn && user?.isAdmin ? (
          <Animated.View entering={FadeInDown.duration(400).delay(450)}>
            <View style={[styles.menuSection, { backgroundColor: theme.backgroundDefault }]}>
              <Pressable
                testID="button-admin-customers"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleAdminCustomers();
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: theme.primary + "15" }]}>
                    <Feather name="users" size={18} color={theme.primary} />
                  </View>
                  <ThemedText style={[styles.menuLabel, { fontFamily: "Cairo_600SemiBold" }]}>
                    إدارة المستخدمين
                  </ThemedText>
                </View>
                <View style={styles.menuItemRight}>
                  <Feather name="chevron-left" size={18} color={theme.textSecondary} />
                </View>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {isLoggedIn ? (
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                { 
                  backgroundColor: theme.error + "10",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="log-out" size={18} color={theme.error} />
              <ThemedText style={[styles.logoutText, { color: theme.error, fontFamily: "Cairo_600SemiBold" }]}>
                تسجيل الخروج
              </ThemedText>
            </Pressable>
          </Animated.View>
        ) : null}

        <ThemedText style={[styles.version, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
          الإصدار 1.0.0
        </ThemedText>
      </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { fontFamily: "Cairo_700Bold" }]}>
                {otpStep ? "التحقق من الهوية" : modalMode === "login" ? "تسجيل الدخول" : "تسجيل حساب جديد"}
              </ThemedText>
              <Pressable 
                onPress={() => {
                  if (otpStep) {
                    setOtpStep(false);
                    setFormOtp("");
                    setFormErrors({});
                  } else {
                    setIsModalVisible(false);
                  }
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Feather name={otpStep ? "arrow-right" : "x"} size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {formErrors.general ? (
                <View style={[styles.errorBanner, { backgroundColor: theme.error + "15" }]}>
                  <Feather name="alert-circle" size={16} color={theme.error} />
                  <ThemedText style={[styles.errorBannerText, { color: theme.error, fontFamily: "Cairo_400Regular" }]}>
                    {formErrors.general}
                  </ThemedText>
                </View>
              ) : null}

              {otpStep ? (
                <>
                  <View style={[styles.inputGroup, { alignItems: "center", paddingVertical: Spacing.lg }]}>
                    <Feather name="shield" size={48} color={theme.primary} />
                    <ThemedText style={[styles.inputLabel, { fontFamily: "Cairo_600SemiBold", textAlign: "center", marginTop: Spacing.md }]}>
                      {`تم إرسال رمز التحقق إلى\n${pendingMobileE164}`}
                    </ThemedText>
                  </View>
                  <View style={styles.inputGroup}>
                    <ThemedText style={[styles.inputLabel, { fontFamily: "Cairo_600SemiBold" }]}>
                      رمز التحقق <ThemedText style={{ color: theme.error }}>*</ThemedText>
                    </ThemedText>
                    <TextInput
                      value={formOtp}
                      onChangeText={(t) => setFormOtp(t.replace(/[^0-9]/g, "").slice(0, 6))}
                      placeholder="------"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          color: theme.text,
                          borderColor: theme.border,
                          fontFamily: "Cairo_700Bold",
                          fontSize: 24,
                          letterSpacing: 8,
                          textAlign: "center",
                        },
                      ]}
                      editable={!isLoading}
                      autoFocus
                    />
                  </View>
                  <Pressable
                    onPress={handleVerifyOtp}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.submitButton,
                      { backgroundColor: theme.primary, opacity: isLoading ? 0.6 : pressed ? 0.8 : 1 },
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <ThemedText style={[styles.submitButtonText, { fontFamily: "Cairo_700Bold" }]}>
                        تحقق
                      </ThemedText>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleResendOtp}
                    disabled={isLoading}
                    style={({ pressed }) => [styles.switchModeButton, { opacity: isLoading ? 0.4 : pressed ? 0.6 : 1 }]}
                  >
                    <ThemedText style={[styles.switchModeText, { color: theme.primary, fontFamily: "Cairo_400Regular" }]}>
                      لم يصلك الرمز؟ أعد الإرسال
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
              <>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { fontFamily: "Cairo_600SemiBold" }]}>
                  الاسم <ThemedText style={{ color: theme.error }}>*</ThemedText>
                </ThemedText>
                <TextInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="أدخل اسمك الكامل"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: formErrors.name ? theme.error : theme.border,
                      fontFamily: "Cairo_400Regular",
                    },
                  ]}
                  textAlign="right"
                  editable={!isLoading}
                />
                {formErrors.name ? (
                  <ThemedText style={[styles.errorText, { color: theme.error, fontFamily: "Cairo_400Regular" }]}>
                    {formErrors.name}
                  </ThemedText>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { fontFamily: "Cairo_600SemiBold" }]}>
                  رقم الجوال <ThemedText style={{ color: theme.error }}>*</ThemedText>
                </ThemedText>
                <TextInput
                  value={formMobile}
                  onChangeText={setFormMobile}
                  placeholder="05xxxxxxxx"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: formErrors.mobile ? theme.error : theme.border,
                      fontFamily: "Cairo_400Regular",
                    },
                  ]}
                  textAlign="right"
                  editable={!isLoading}
                />
                {formErrors.mobile ? (
                  <ThemedText style={[styles.errorText, { color: theme.error, fontFamily: "Cairo_400Regular" }]}>
                    {formErrors.mobile}
                  </ThemedText>
                ) : null}
              </View>

              {modalMode === "register" ? (
                <>
                  <View style={styles.inputGroup}>
                    <ThemedText style={[styles.inputLabel, { fontFamily: "Cairo_600SemiBold" }]}>
                      البريد الإلكتروني <ThemedText style={{ color: theme.error }}>*</ThemedText>
                    </ThemedText>
                    <TextInput
                      value={formEmail}
                      onChangeText={setFormEmail}
                      placeholder="example@email.com"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[
                        styles.textInput,
                        { 
                          backgroundColor: theme.backgroundSecondary,
                          color: theme.text,
                          borderColor: theme.border,
                          fontFamily: "Cairo_400Regular",
                        },
                      ]}
                      textAlign="right"
                      editable={!isLoading}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText style={[styles.inputLabel, { fontFamily: "Cairo_600SemiBold" }]}>
                      المدينة <ThemedText style={{ color: theme.error }}>*</ThemedText>
                    </ThemedText>
                    <Pressable
                      onPress={() => { loadCities(); setIsCityPickerVisible(!isCityPickerVisible); }}
                      style={[
                        styles.textInput,
                        { backgroundColor: theme.backgroundSecondary, borderColor: isCityPickerVisible ? theme.primary : theme.border, justifyContent: "center", flexDirection: "row-reverse", alignItems: "center" },
                      ]}
                    >
                      <ThemedText style={{ flex: 1, textAlign: "right", color: selectedCityId ? theme.text : theme.textSecondary, fontFamily: "Cairo_400Regular" }}>
                        {selectedCityId ? (cities.find((c) => c.cityId === selectedCityId)?.nameAr ?? "اختر المدينة") : "اختر مدينتك"}
                      </ThemedText>
                      <Feather name={isCityPickerVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
                    </Pressable>
                    {isCityPickerVisible ? (
                      <View style={[styles.cityDropdown, { backgroundColor: theme.backgroundDefault, borderColor: theme.primary }]}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                          {cities.map((city) => (
                            <Pressable
                              key={city.cityId}
                              onPress={() => { setSelectedCityId(city.cityId); setIsCityPickerVisible(false); }}
                              style={[styles.cityItem, { borderBottomColor: theme.border, backgroundColor: selectedCityId === city.cityId ? theme.primary + "12" : "transparent" }]}
                            >
                              <ThemedText style={[styles.cityItemText, { fontFamily: selectedCityId === city.cityId ? "Cairo_700Bold" : "Cairo_400Regular", color: selectedCityId === city.cityId ? theme.primary : theme.text }]}>
                                {city.nameAr}
                              </ThemedText>
                              {selectedCityId === city.cityId ? (
                                <Feather name="check" size={16} color={theme.primary} />
                              ) : null}
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => {
                      if (!isLoading) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTermsAccepted(!termsAccepted);
                      }
                    }}
                    style={styles.termsRow}
                  >
                    <View 
                      style={[
                        styles.checkbox, 
                        { 
                          borderColor: formErrors.terms ? theme.error : theme.border,
                          backgroundColor: termsAccepted ? theme.primary : "transparent",
                        }
                      ]}
                    >
                      {termsAccepted ? (
                        <Feather name="check" size={14} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <ThemedText style={[styles.termsText, { fontFamily: "Cairo_400Regular" }]}>
                      أوافق على{" "}
                      <ThemedText style={{ color: theme.primary, fontFamily: "Cairo_600SemiBold" }}>
                        الشروط والأحكام
                      </ThemedText>
                      {" "}و{" "}
                      <ThemedText style={{ color: theme.primary, fontFamily: "Cairo_600SemiBold" }}>
                        سياسة الخصوصية
                      </ThemedText>
                      {" "}<ThemedText style={{ color: theme.error }}>*</ThemedText>
                    </ThemedText>
                  </Pressable>
                  {formErrors.terms ? (
                    <ThemedText style={[styles.errorText, { color: theme.error, fontFamily: "Cairo_400Regular", marginTop: Spacing.xs }]}>
                      {formErrors.terms}
                    </ThemedText>
                  ) : null}
                </>
              ) : null}

              <Pressable
                onPress={modalMode === "login" ? handleLogin : handleRegister}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: theme.primary, opacity: isLoading ? 0.6 : pressed ? 0.8 : 1 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={[styles.submitButtonText, { fontFamily: "Cairo_700Bold" }]}>
                    {modalMode === "login" ? "دخول" : "تسجيل"}
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const nextMode = modalMode === "login" ? "register" : "login";
                  setModalMode(nextMode);
                  setFormErrors({});
                  if (nextMode === "register") loadCities();
                }}
                disabled={isLoading}
                style={({ pressed }) => [styles.switchModeButton, { opacity: pressed ? 0.6 : 1 }]}
              >
                <ThemedText style={[styles.switchModeText, { color: theme.primary, fontFamily: "Cairo_400Regular" }]}>
                  {modalMode === "login" ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب؟ سجل دخول"}
                </ThemedText>
              </Pressable>
              </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      <Modal
        visible={isHistoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={[styles.historyModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.historyModalHeader}>
              <Pressable
                onPress={() => setIsHistoryModalVisible(false)}
                style={styles.historyCloseButton}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
              <ThemedText style={[styles.historyModalTitle, { fontFamily: "Cairo_700Bold" }]}>
                سجل الفحوصات
              </ThemedText>
              <View style={{ width: 24 }} />
            </View>

            {isLoadingInspections ? (
              <View style={styles.historyLoadingContainer}>
                <ThemedText style={[styles.historyLoadingText, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                  جاري التحميل...
                </ThemedText>
              </View>
            ) : inspections.length === 0 ? (
              <View style={styles.historyEmptyContainer}>
                <Feather name="inbox" size={48} color={theme.textSecondary} />
                <ThemedText style={[styles.historyEmptyText, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                  لا توجد فحوصات محفوظة
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Spacing.xl }}
              >
                {inspections.map((inspection: any, index: number) => {
                  const statusMap: Record<string, { label: string; color: string }> = {
                    draft:          { label: "إنشاء الطلب",  color: theme.textSecondary },
                    rfq_sent:       { label: "أُرسل للموردين", color: theme.primary },
                    quotes_received:{ label: "عروض واردة",     color: theme.accentYellow },
                    quote_accepted: { label: "تم القبول",      color: theme.success },
                    paid:           { label: "مدفوع",          color: theme.success },
                  };
                  const st = statusMap[inspection.status] ?? { label: inspection.status, color: theme.textSecondary };

                  return (
                    <Animated.View
                      key={inspection.inspectionId}
                      entering={FadeInDown.duration(300).delay(50 * index)}
                      style={[styles.inspectionCard, { backgroundColor: theme.backgroundSecondary }]}
                    >
                      <View style={styles.inspectionHeader}>
                        <View style={[styles.inspectionNumberBadge, { backgroundColor: theme.primary + "20" }]}>
                          <ThemedText style={[styles.inspectionNumber, { fontFamily: "Cairo_600SemiBold", color: theme.primary }]}>
                            {inspection.inspectionNo}
                          </ThemedText>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: st.color + "20" }]}>
                          <ThemedText style={[styles.statusBadgeText, { color: st.color, fontFamily: "Cairo_600SemiBold" }]}>
                            {st.label}
                          </ThemedText>
                        </View>
                      </View>

                      <View style={styles.inspectionCarInfo}>
                        <Feather name="truck" size={18} color={theme.primary} style={{ marginLeft: Spacing.sm }} />
                        <ThemedText style={[styles.inspectionCarText, { fontFamily: "Cairo_600SemiBold" }]}>
                          {[inspection.makeName, inspection.modelName, inspection.carYear].filter(Boolean).join(" ")}
                        </ThemedText>
                      </View>

                      <View style={styles.inspectionDateContainer}>
                        <Feather name="calendar" size={13} color={theme.textSecondary} style={{ marginLeft: 4 }} />
                        <ThemedText style={[styles.inspectionDate, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                          {formatDate(inspection.createdAt)}
                        </ThemedText>
                      </View>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={isCarsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCarsModalVisible(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={[styles.historyModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.historyModalHeader}>
              <Pressable
                onPress={() => setIsCarsModalVisible(false)}
                style={styles.historyCloseButton}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
              <ThemedText style={[styles.historyModalTitle, { fontFamily: "Cairo_700Bold" }]}>
                سياراتي
              </ThemedText>
              <View style={{ width: 24 }} />
            </View>

            {isLoadingCars ? (
              <View style={styles.historyLoadingContainer}>
                <ThemedText style={[styles.historyLoadingText, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                  جاري التحميل...
                </ThemedText>
              </View>
            ) : userCars.length === 0 ? (
              <View style={styles.historyEmptyContainer}>
                <Feather name="truck" size={48} color={theme.textSecondary} />
                <ThemedText style={[styles.historyEmptyText, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                  لا توجد سيارات محفوظة
                </ThemedText>
              </View>
            ) : (
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Spacing.xl }}
              >
                {userCars.map((car, index) => (
                  <Animated.View
                    key={car.carModelId}
                    entering={FadeInDown.duration(300).delay(50 * index)}
                    style={[styles.carCard, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <View style={styles.carCardHeader}>
                      <View style={[styles.carIconContainer, { backgroundColor: theme.primary + "15" }]}>
                        <Feather name="truck" size={24} color={theme.primary} />
                      </View>
                      <View style={styles.carInfoContainer}>
                        <ThemedText style={[styles.carName, { fontFamily: "Cairo_700Bold" }]}>
                          {car.makeName} {car.modelName}
                        </ThemedText>
                        {car.carYear ? (
                          <ThemedText style={[styles.carYear, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                            سنة {car.carYear}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>

                    <View style={[styles.carInspectionsContainer, { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }]}>
                      <View style={[styles.inspectionCountBadge, { backgroundColor: theme.primary + "15" }]}>
                        <Feather name="clipboard" size={13} color={theme.primary} />
                        <ThemedText style={[styles.inspectionCountText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                          {car.inspectionCount} {car.inspectionCount === 1 ? "طلب" : "طلبات"}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.carInspectionDate, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                        آخر طلب: {formatDate(car.lastInspectionDate)}
                      </ThemedText>
                    </View>
                  </Animated.View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPartsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPartsModalVisible(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={[styles.historyModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.historyModalHeader}>
              <Pressable
                onPress={() => setIsPartsModalVisible(false)}
                style={styles.historyCloseButton}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
              <ThemedText style={[styles.historyModalTitle, { fontFamily: "Cairo_700Bold" }]}>
                القطع المحفوظة
              </ThemedText>
              <View style={{ width: 24 }} />
            </View>

            {isLoadingParts ? (
              <View style={styles.historyLoadingContainer}>
                <ThemedText style={[styles.historyLoadingText, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                  جاري التحميل...
                </ThemedText>
              </View>
            ) : userParts.length === 0 ? (
              <View style={styles.historyEmptyContainer}>
                <Feather name="heart" size={48} color={theme.textSecondary} />
                <ThemedText style={[styles.historyEmptyText, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                  لا توجد قطع محفوظة
                </ThemedText>
              </View>
            ) : (
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Spacing.xl }}
              >
                {userParts.map((part, index) => (
                  <Animated.View
                    key={`${part.inspectionNumber}-${index}`}
                    entering={FadeInDown.duration(300).delay(30 * index)}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.partCard,
                        { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.75 : 1 },
                      ]}
                      onPress={() => {
                        if (!part.inspectionId) return;
                        setIsPartsModalVisible(false);
                        navigation.navigate("InspectionDetail", { inspectionId: part.inspectionId });
                      }}
                    >
                      <View style={styles.partCardHeader}>
                        <View style={[styles.partIconContainer, { backgroundColor: theme.primary + "15" }]}>
                          <Feather name="settings" size={20} color={theme.primary} />
                        </View>
                        <View style={styles.partInfoContainer}>
                          <ThemedText style={[styles.partName, { fontFamily: "Cairo_600SemiBold" }]}>
                            {part.partName}
                          </ThemedText>
                          <ThemedText style={[styles.partCarInfo, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                            {part.carMakeAr} {part.carModelAr} {part.carYear}
                          </ThemedText>
                        </View>
                        <Feather name="chevron-left" size={16} color={theme.textSecondary} />
                      </View>

                      <View style={styles.partInspectionInfo}>
                        <View style={[styles.inspectionNumberBadge, { backgroundColor: theme.primary + "20" }]}>
                          <ThemedText style={[styles.inspectionNumber, { fontFamily: "Cairo_600SemiBold", color: theme.primary }]}>
                            #{part.inspectionNumber}
                          </ThemedText>
                        </View>
                        <View style={styles.inspectionDateContainer}>
                          <Feather name="calendar" size={12} color={theme.textSecondary} style={{ marginLeft: Spacing.xs }} />
                          <ThemedText style={[styles.partInspectionDate, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                            {formatDate(part.createdAt)}
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    alignItems: "center",
    gap: 2,
  },
  profileName: {
    fontSize: 18,
  },
  profileEmail: {
    fontSize: 14,
  },
  authButtons: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  loginButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  registerLink: {
    padding: Spacing.xs,
  },
  registerLinkText: {
    fontSize: 13,
  },
  menuContainer: {
    marginTop: Spacing.xl,
    gap: Spacing.lg,
  },
  menuSection: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  menuItemLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    fontSize: 15,
  },
  menuItemRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
  },
  menuBadge: {
    fontSize: 13,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  logoutButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
  logoutText: {
    fontSize: 15,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    marginTop: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
  },
  formContainer: {
    gap: Spacing.md,
  },
  errorBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    textAlign: "right",
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
    textAlign: "right",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: "right",
  },
  termsRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
  },
  submitButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  switchModeButton: {
    alignItems: "center",
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  switchModeText: {
    fontSize: 14,
  },
  historyModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  historyModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: "85%",
  },
  historyModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    marginBottom: Spacing.md,
  },
  historyCloseButton: {
    padding: Spacing.xs,
  },
  historyModalTitle: {
    fontSize: 18,
    textAlign: "center",
  },
  historyLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  historyLoadingText: {
    fontSize: 16,
  },
  historyEmptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.md,
  },
  historyEmptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  inspectionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  inspectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  inspectionNumberBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  inspectionNumber: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 11,
  },
  inspectionDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  inspectionDate: {
    fontSize: 12,
  },
  inspectionCarInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  inspectionCarText: {
    fontSize: 15,
  },
  inspectionPartsContainer: {
    marginTop: Spacing.xs,
  },
  inspectionPartsTitle: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  inspectionPartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  partBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: Spacing.sm,
  },
  inspectionPartText: {
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  carCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  carCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  carIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.md,
  },
  carInfoContainer: {
    flex: 1,
  },
  carName: {
    fontSize: 16,
    textAlign: "right",
  },
  carYear: {
    fontSize: 13,
    textAlign: "right",
  },
  carInspectionsContainer: {
    marginTop: Spacing.xs,
  },
  carInspectionsTitle: {
    fontSize: 13,
    marginBottom: Spacing.sm,
    textAlign: "right",
  },
  carInspectionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  carInspectionDate: {
    fontSize: 11,
  },
  inspectionCountBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  inspectionCountText: {
    fontSize: 12,
  },
  partCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  partCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  partIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  partInfoContainer: {
    flex: 1,
  },
  partName: {
    fontSize: 14,
    textAlign: "right",
  },
  partCarInfo: {
    fontSize: 12,
    textAlign: "right",
  },
  partInspectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  partInspectionDate: {
    fontSize: 11,
  },
  cityDropdown: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    marginTop: 4,
    overflow: "hidden",
  },
  cityItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  cityItemText: {
    fontSize: 15,
    textAlign: "right",
  },
});
