import React from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
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

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();

  const handleViewPricing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Pricing");
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
              {item.badge && (
                <ThemedText style={[styles.menuBadge, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                  {item.badge}
                </ThemedText>
              )}
              <Feather name="chevron-left" size={18} color={theme.textSecondary} />
            </View>
          </Pressable>
          {index < items.length - 1 && (
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          )}
        </React.Fragment>
      ))}
    </Animated.View>
  );

  return (
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
              مستخدم ضيف
            </ThemedText>
            <ThemedText style={[styles.profileEmail, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              سجل دخول لحفظ بياناتك
            </ThemedText>
          </View>
          <Pressable style={[styles.loginButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.loginButtonText, { fontFamily: "Cairo_600SemiBold" }]}>
              تسجيل الدخول
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      <View style={styles.menuContainer}>
        {menuItems.map((section, index) => renderMenuSection(section, index))}
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(500)}>
        <Pressable
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

      <ThemedText style={[styles.version, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
        الإصدار 1.0.0
      </ThemedText>
    </ScrollView>
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
});
