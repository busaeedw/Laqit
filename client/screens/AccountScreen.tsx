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

interface MenuItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  badge?: string;
  color?: string;
}

interface UserData {
  name: string;
  mobile: string;
  email: string;
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, isDark } = useTheme();

  const [isRegistrationModalVisible, setIsRegistrationModalVisible] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userData, setUserData] = useState<UserData>({ name: "", mobile: "", email: "" });
  
  const [formName, setFormName] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; mobile?: string; terms?: string }>({});

  const handleViewPricing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Pricing");
  };

  const handleOpenRegistration = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormName("");
    setFormMobile("");
    setFormEmail("");
    setTermsAccepted(false);
    setFormErrors({});
    setIsRegistrationModalVisible(true);
  };

  const validateForm = () => {
    const errors: { name?: string; mobile?: string; terms?: string } = {};
    
    if (!formName.trim()) {
      errors.name = "الاسم مطلوب";
    }
    
    if (!formMobile.trim()) {
      errors.mobile = "رقم الجوال مطلوب";
    } else if (!/^[0-9]{10}$/.test(formMobile.replace(/\s/g, ""))) {
      errors.mobile = "رقم الجوال غير صحيح";
    }
    
    if (!termsAccepted) {
      errors.terms = "يجب الموافقة على الشروط والأحكام";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRegistration = () => {
    if (validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUserData({
        name: formName.trim(),
        mobile: formMobile.trim(),
        email: formEmail.trim(),
      });
      setIsRegistered(true);
      setIsRegistrationModalVisible(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRegistered(false);
    setUserData({ name: "", mobile: "", email: "" });
  };

  const menuItems: MenuItem[][] = [
    [
      { id: "subscription", icon: "star", label: "اشتراكي", badge: "مجاني", onPress: handleViewPricing },
      { id: "pricing", icon: "credit-card", label: "الباقات والأسعار", onPress: handleViewPricing },
    ],
    [
      { id: "history", icon: "clock", label: "سجل الفحوصات" },
      { id: "favorites", icon: "heart", label: "القطع المحفوظة" },
      { id: "vehicles", icon: "truck", label: "سياراتي" },
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
                {isRegistered ? userData.name : "مستخدم ضيف"}
              </ThemedText>
              <ThemedText style={[styles.profileEmail, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                {isRegistered ? userData.mobile : "سجل دخول لحفظ بياناتك"}
              </ThemedText>
            </View>
            {!isRegistered ? (
              <Pressable 
                onPress={handleOpenRegistration}
                style={({ pressed }) => [
                  styles.loginButton, 
                  { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <ThemedText style={[styles.loginButtonText, { fontFamily: "Cairo_600SemiBold" }]}>
                  تسجيل الدخول
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        <View style={styles.menuContainer}>
          {menuItems.map((section, index) => renderMenuSection(section, index))}
        </View>

        {isRegistered ? (
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
        visible={isRegistrationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRegistrationModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { fontFamily: "Cairo_700Bold" }]}>
                تسجيل حساب جديد
              </ThemedText>
              <Pressable 
                onPress={() => setIsRegistrationModalVisible(false)}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
                />
                {formErrors.mobile ? (
                  <ThemedText style={[styles.errorText, { color: theme.error, fontFamily: "Cairo_400Regular" }]}>
                    {formErrors.mobile}
                  </ThemedText>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { fontFamily: "Cairo_600SemiBold" }]}>
                  البريد الإلكتروني <ThemedText style={{ color: theme.textSecondary }}>(اختياري)</ThemedText>
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
                />
              </View>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTermsAccepted(!termsAccepted);
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

              <Pressable
                onPress={handleSubmitRegistration}
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText style={[styles.submitButtonText, { fontFamily: "Cairo_700Bold" }]}>
                  تسجيل
                </ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  loginButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
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
    marginBottom: Spacing.lg,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});
