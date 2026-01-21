import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";

interface Feature {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    id: "ai",
    icon: "cpu",
    title: "تحديد بالذكاء الاصطناعي",
    description: "تقنية متقدمة لتحديد القطع بدقة عالية",
    color: "#1E74F2",
  },
  {
    id: "database",
    icon: "database",
    title: "قاعدة بيانات شاملة",
    description: "ملايين القطع من جميع الماركات",
    color: "#10B981",
  },
  {
    id: "expert",
    icon: "users",
    title: "دعم الخبراء",
    description: "تواصل مع ميكانيكيين محترفين",
    color: "#F59E0B",
  },
  {
    id: "shopping",
    icon: "shopping-bag",
    title: "تسوق فوري",
    description: "اطلب القطع من موردين موثوقين",
    color: "#C8102E",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

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
      <Animated.View entering={FadeInDown.duration(600).delay(100)}>
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <ThemedText style={[styles.heroTitle, { color: "#FFFFFF", fontFamily: "Cairo_700Bold" }]}>
                اطلب قطع غيار سيارتك بسهولة
              </ThemedText>
              <ThemedText style={[styles.heroSubtitle, { color: "rgba(255,255,255,0.8)", fontFamily: "Cairo_400Regular" }]}>
                حدد سيارتك، صور القطعة، واحصل على عروض أسعار فورية
              </ThemedText>
            </View>
            <Pressable
              onPress={() => navigation.navigate("Order")}
              style={({ pressed }) => [
                styles.heroButton,
                { 
                  backgroundColor: "#FFFFFF",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Feather name="plus-circle" size={20} color={theme.primary} />
              <ThemedText style={[styles.heroButtonText, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
                طلب جديد
              </ThemedText>
            </Pressable>
          </View>
          <View style={[styles.heroDecoration, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Feather name="zap" size={60} color="rgba(255,255,255,0.3)" />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(300)}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
            مميزات التطبيق
          </ThemedText>
        </View>
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <View
              key={feature.id}
              style={[styles.featureCard, { backgroundColor: theme.backgroundDefault }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color + "20" }]}>
                <Feather name={feature.icon} size={24} color={feature.color} />
              </View>
              <ThemedText style={[styles.featureTitle, { fontFamily: "Cairo_700Bold" }]}>
                {feature.title}
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                {feature.description}
              </ThemedText>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(500)}>
        <Pressable
          onPress={() => navigation.navigate("Order")}
          style={({ pressed }) => [
            styles.ctaCard,
            { 
              backgroundColor: isDark ? "#1E2B3A" : "#E8F4FD",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            },
          ]}
        >
          <View style={styles.ctaContent}>
            <View style={[styles.ctaBadge, { backgroundColor: theme.accentYellow }]}>
              <ThemedText style={[styles.ctaBadgeText, { color: "#1B1B1E", fontFamily: "Cairo_700Bold" }]}>
                عرض خاص
              </ThemedText>
            </View>
            <ThemedText style={[styles.ctaTitle, { fontFamily: "Cairo_700Bold" }]}>
              اشترك الآن واحصل على فحص غير محدود
            </ThemedText>
            <ThemedText style={[styles.ctaSubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              ابدأ الآن بخصم 20% على جميع الباقات
            </ThemedText>
          </View>
          <Feather name="chevron-left" size={24} color={theme.primary} />
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    overflow: "hidden",
    position: "relative",
    marginBottom: Spacing.lg,
  },
  heroContent: {
    gap: Spacing.lg,
    zIndex: 1,
  },
  heroTextContainer: {
    gap: Spacing.sm,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 32,
    textAlign: "right",
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
  },
  heroButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-end",
  },
  heroButtonText: {
    fontSize: 16,
  },
  heroDecoration: {
    position: "absolute",
    left: -20,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    textAlign: "right",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  featureCard: {
    width: "47%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  featureTitle: {
    fontSize: 14,
    textAlign: "right",
  },
  featureDescription: {
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18,
  },
  ctaCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  ctaContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  ctaBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  ctaBadgeText: {
    fontSize: 10,
  },
  ctaTitle: {
    fontSize: 15,
    textAlign: "right",
  },
  ctaSubtitle: {
    fontSize: 12,
    textAlign: "right",
  },
});
