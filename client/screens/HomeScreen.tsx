import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RecentScan = {
  id: string;
  imageUri: string;
  carMake: string;
  carModel: string;
  date: string;
  partsCount: number;
};

const mockRecentScans: RecentScan[] = [];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleStartScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Camera");
  };

  const handleViewPricing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Pricing");
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Animated.View entering={FadeInDown.duration(600).delay(100)}>
        <View style={[styles.heroCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <ThemedText style={[styles.heroTitle, { fontFamily: "Cairo_700Bold" }]}>
                اكتشف قطع سيارتك بالذكاء الاصطناعي
              </ThemedText>
              <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                صور أي جزء من سيارتك وسنتعرف عليه فوراً
              </ThemedText>
            </View>
            <Pressable
              onPress={handleStartScan}
              style={({ pressed }) => [
                styles.scanButton,
                { 
                  backgroundColor: theme.primary,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Feather name="camera" size={24} color="#FFFFFF" />
              <ThemedText style={[styles.scanButtonText, { fontFamily: "Cairo_700Bold" }]}>
                ابدأ الفحص
              </ThemedText>
            </Pressable>
          </View>
          <View style={[styles.heroDecoration, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="zap" size={60} color={theme.primary} style={{ opacity: 0.3 }} />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="cpu" size={20} color={theme.primary} />
            </View>
            <ThemedText style={[styles.statValue, { fontFamily: "Cairo_700Bold" }]}>AI</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              تحليل ذكي
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.accent + "20" }]}>
              <Feather name="clock" size={20} color={theme.accent} />
            </View>
            <ThemedText style={[styles.statValue, { fontFamily: "Cairo_700Bold" }]}>ثوانٍ</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              نتائج فورية
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.success + "20" }]}>
              <Feather name="check-circle" size={20} color={theme.success} />
            </View>
            <ThemedText style={[styles.statValue, { fontFamily: "Cairo_700Bold" }]}>دقة</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              عالية جداً
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(300)}>
        <Pressable
          onPress={handleViewPricing}
          style={({ pressed }) => [
            styles.promoCard,
            { 
              backgroundColor: isDark ? "#1E2B3A" : "#E8F4FD",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            },
          ]}
        >
          <View style={styles.promoContent}>
            <View style={[styles.promoBadge, { backgroundColor: theme.accentYellow }]}>
              <ThemedText style={[styles.promoBadgeText, { color: "#1B1B1E", fontFamily: "Cairo_700Bold" }]}>
                جديد
              </ThemedText>
            </View>
            <ThemedText style={[styles.promoTitle, { fontFamily: "Cairo_700Bold" }]}>
              اشترك الآن واحصل على خصم 20%
            </ThemedText>
            <ThemedText style={[styles.promoSubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              باقات تناسب جميع احتياجاتك
            </ThemedText>
          </View>
          <Feather name="chevron-left" size={24} color={theme.primary} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(400)}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
            عمليات الفحص الأخيرة
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );

  const renderEmptyState = () => (
    <Animated.View 
      entering={FadeIn.duration(600).delay(500)}
      style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="search" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}>
        لا توجد عمليات فحص بعد
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
        ابدأ بتصوير قطعة من سيارتك للتعرف عليها
      </ThemedText>
    </Animated.View>
  );

  const renderScanItem = ({ item, index }: { item: RecentScan; index: number }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(100 * index)}>
      <Card style={styles.scanCard}>
        <Image source={{ uri: item.imageUri }} style={styles.scanImage} />
        <View style={styles.scanInfo}>
          <ThemedText style={[styles.scanCarName, { fontFamily: "Cairo_700Bold" }]}>
            {item.carMake} {item.carModel}
          </ThemedText>
          <ThemedText style={[styles.scanDate, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            {item.date}
          </ThemedText>
          <View style={styles.scanParts}>
            <Feather name="box" size={14} color={theme.primary} />
            <ThemedText style={[styles.scanPartsText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
              {item.partsCount} قطعة
            </ThemedText>
          </View>
        </View>
        <Feather name="chevron-left" size={20} color={theme.textSecondary} />
      </Card>
    </Animated.View>
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={mockRecentScans}
      keyExtractor={(item) => item.id}
      renderItem={renderScanItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyState}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  heroContent: {
    gap: Spacing.lg,
    zIndex: 1,
  },
  heroTextContainer: {
    gap: Spacing.xs,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 34,
    textAlign: "right",
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: "right",
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
  scanButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowColor: "#1E74F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  promoCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  promoContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  promoBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  promoBadgeText: {
    fontSize: 10,
  },
  promoTitle: {
    fontSize: 15,
    textAlign: "right",
  },
  promoSubtitle: {
    fontSize: 12,
    textAlign: "right",
  },
  sectionHeader: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    textAlign: "right",
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  scanCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  scanImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#E5E7EB",
  },
  scanInfo: {
    flex: 1,
    gap: 2,
  },
  scanCarName: {
    fontSize: 15,
    textAlign: "right",
  },
  scanDate: {
    fontSize: 12,
    textAlign: "right",
  },
  scanParts: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  scanPartsText: {
    fontSize: 12,
  },
});
