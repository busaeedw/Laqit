import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
  color?: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: "basic",
    name: "الباقة الأساسية",
    price: "9",
    period: "شهر",
    features: [
      "10 عمليات فحص شهرياً",
      "دقة عادية",
      "معالجة قياسية",
    ],
  },
  {
    id: "pro",
    name: "الباقة الاحترافية",
    price: "19",
    period: "شهر",
    features: [
      "30 عملية فحص شهرياً",
      "دقة عالية",
      "معالجة أسرع",
      "خصومات على الطلبات",
    ],
    popular: true,
    color: "#1E74F2",
  },
  {
    id: "workshop",
    name: "باقة الورش",
    price: "79",
    period: "شهر",
    features: [
      "فحص غير محدود",
      "أعلى مستوى دقة",
      "أولوية دعم",
      "إدارة بيانات العملاء",
    ],
    color: "#C0C7CE",
  },
];

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const [selectedTier, setSelectedTier] = useState<string | null>("pro");

  const handleSelectTier = (tierId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTier(tierId);
  };

  const handleSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderTier = (tier: PricingTier, index: number) => {
    const isSelected = selectedTier === tier.id;
    const accentColor = tier.color || theme.primary;

    return (
      <Animated.View
        key={tier.id}
        entering={FadeInDown.duration(400).delay(100 + index * 100)}
      >
        <Pressable
          onPress={() => handleSelectTier(tier.id)}
          style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
        >
          <View
            style={[
              styles.tierCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: isSelected ? accentColor : "transparent",
                borderWidth: isSelected ? 2 : 0,
              },
            ]}
          >
            {tier.popular && (
              <View style={[styles.popularBadge, { backgroundColor: accentColor }]}>
                <Feather name="star" size={12} color="#FFFFFF" />
                <ThemedText style={[styles.popularText, { fontFamily: "Cairo_600SemiBold" }]}>
                  الأكثر شعبية
                </ThemedText>
              </View>
            )}

            <View style={styles.tierHeader}>
              <ThemedText style={[styles.tierName, { fontFamily: "Cairo_700Bold" }]}>
                {tier.name}
              </ThemedText>
              <View style={styles.priceRow}>
                <ThemedText style={[styles.price, { color: accentColor, fontFamily: "Cairo_700Bold" }]}>
                  {tier.price}
                </ThemedText>
                <ThemedText style={[styles.currency, { color: accentColor, fontFamily: "Cairo_600SemiBold" }]}>
                  ريال
                </ThemedText>
                <ThemedText style={[styles.period, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                  / {tier.period}
                </ThemedText>
              </View>
            </View>

            <View style={styles.featuresContainer}>
              {tier.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Feather name="check" size={16} color={theme.success} />
                  <ThemedText style={[styles.featureText, { fontFamily: "Cairo_400Regular" }]}>
                    {feature}
                  </ThemedText>
                </View>
              ))}
            </View>

            <Pressable
              onPress={handleSubscribe}
              style={({ pressed }) => [
                styles.subscribeButton,
                {
                  backgroundColor: isSelected ? accentColor : theme.backgroundSecondary,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.subscribeButtonText,
                  {
                    color: isSelected ? "#FFFFFF" : theme.text,
                    fontFamily: "Cairo_700Bold",
                  },
                ]}
              >
                اشترك الآن
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { fontFamily: "Cairo_700Bold" }]}>
            اختر الخطة المناسبة لك
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            باقات تناسب جميع احتياجاتك
          </ThemedText>
        </View>
      </Animated.View>

      <View style={styles.tiersContainer}>
        {pricingTiers.map((tier, index) => renderTier(tier, index))}
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(500)}>
        <View style={[styles.lifetimeCard, { backgroundColor: isDark ? "#1E2B3A" : "#E8F4FD" }]}>
          <View style={styles.lifetimeHeader}>
            <View style={[styles.lifetimeBadge, { backgroundColor: theme.accentYellow }]}>
              <Feather name="zap" size={14} color="#1B1B1E" />
              <ThemedText style={[styles.lifetimeBadgeText, { color: "#1B1B1E", fontFamily: "Cairo_700Bold" }]}>
                عرض خاص
              </ThemedText>
            </View>
            <ThemedText style={[styles.lifetimeTitle, { fontFamily: "Cairo_700Bold" }]}>
              اشتراك مدى الحياة
            </ThemedText>
            <View style={styles.lifetimePriceRow}>
              <ThemedText style={[styles.lifetimePrice, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
                149 - 199
              </ThemedText>
              <ThemedText style={[styles.lifetimeCurrency, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                ريال
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={handleSubscribe}
            style={({ pressed }) => [
              styles.lifetimeButton,
              {
                backgroundColor: theme.primary,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <ThemedText style={[styles.lifetimeButtonText, { fontFamily: "Cairo_700Bold" }]}>
              شراء مدى الحياة
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(600)}>
        <View style={[styles.payPerScanCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.payPerScanContent}>
            <ThemedText style={[styles.payPerScanTitle, { fontFamily: "Cairo_700Bold" }]}>
              الدفع لكل فحص
            </ThemedText>
            <ThemedText style={[styles.payPerScanSubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              بدون اشتراك
            </ThemedText>
          </View>
          <View style={styles.payPerScanPrice}>
            <ThemedText style={[styles.payPerScanAmount, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
              3.99
            </ThemedText>
            <ThemedText style={[styles.payPerScanUnit, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              ريال / عملية
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(700)}>
        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            يمكنك الإلغاء في أي وقت
          </ThemedText>
          <View style={styles.paymentIcons}>
            <View style={[styles.paymentIcon, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.paymentIconText, { fontFamily: "Cairo_600SemiBold" }]}>مدى</ThemedText>
            </View>
            <View style={[styles.paymentIcon, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.paymentIconText, { fontFamily: "Cairo_600SemiBold" }]}>Apple Pay</ThemedText>
            </View>
            <View style={[styles.paymentIcon, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.paymentIconText, { fontFamily: "Cairo_600SemiBold" }]}>Visa</ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  tiersContainer: {
    gap: Spacing.md,
  },
  tierCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  popularText: {
    color: "#FFFFFF",
    fontSize: 11,
  },
  tierHeader: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  tierName: {
    fontSize: 18,
  },
  priceRow: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: 36,
  },
  currency: {
    fontSize: 16,
  },
  period: {
    fontSize: 14,
  },
  featuresContainer: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: 14,
  },
  subscribeButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  subscribeButtonText: {
    fontSize: 15,
  },
  lifetimeCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.lg,
    marginTop: Spacing.xl,
  },
  lifetimeHeader: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  lifetimeBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  lifetimeBadgeText: {
    fontSize: 12,
  },
  lifetimeTitle: {
    fontSize: 20,
    textAlign: "center",
  },
  lifetimePriceRow: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    gap: 4,
  },
  lifetimePrice: {
    fontSize: 28,
  },
  lifetimeCurrency: {
    fontSize: 16,
  },
  lifetimeButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  lifetimeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  payPerScanCard: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  payPerScanContent: {
    gap: 2,
  },
  payPerScanTitle: {
    fontSize: 16,
    textAlign: "right",
  },
  payPerScanSubtitle: {
    fontSize: 13,
    textAlign: "right",
  },
  payPerScanPrice: {
    alignItems: "flex-start",
    gap: 2,
  },
  payPerScanAmount: {
    fontSize: 24,
  },
  payPerScanUnit: {
    fontSize: 12,
  },
  footer: {
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 13,
  },
  paymentIcons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  paymentIcon: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  paymentIconText: {
    fontSize: 11,
  },
});
