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
import * as ImagePicker from "expo-image-picker";
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

interface CarBrand {
  id: string;
  name: string;
  nameAr: string;
  color: string;
}

const carBrands: CarBrand[] = [
  { id: "toyota", name: "Toyota", nameAr: "تويوتا", color: "#EB0A1E" },
  { id: "honda", name: "Honda", nameAr: "هوندا", color: "#CC0000" },
  { id: "nissan", name: "Nissan", nameAr: "نيسان", color: "#C3002F" },
  { id: "hyundai", name: "Hyundai", nameAr: "هيونداي", color: "#002C5F" },
  { id: "mercedes", name: "Mercedes", nameAr: "مرسيدس", color: "#333333" },
  { id: "bmw", name: "BMW", nameAr: "بي إم دبليو", color: "#0066B1" },
];

interface HowToStep {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}

const howToSteps: HowToStep[] = [
  {
    id: "1",
    icon: "truck",
    title: "حدد السيارة",
    description: "اختر الشركة والموديل وسنة الصنع للحصول على نتائج أدق",
  },
  {
    id: "2",
    icon: "camera",
    title: "التقط صورة",
    description: "صور قطعة السيارة أو اختر صورة من المعرض",
  },
  {
    id: "3",
    icon: "cpu",
    title: "تحليل بالذكاء الاصطناعي",
    description: "سيقوم الذكاء الاصطناعي بتحليل الصورة وتحديد القطع",
  },
  {
    id: "4",
    icon: "shopping-cart",
    title: "اطلب القطع",
    description: "أضف القطع للسلة واطلبها مباشرة أو تواصل مع خبير",
  },
];

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [selectedCar, setSelectedCar] = React.useState<{make: string, makeAr: string, model?: string, modelAr?: string, year?: string} | null>(null);

    const handleStartScan = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("Camera", {
        onSelectCar: (car) => {
          setSelectedCar(car);
        }
      });
    };

    const handlePickImageForIdentification = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        navigation.navigate("Analysis", {
          imageUri: result.assets[0].uri,
          carInfo: selectedCar ? {
            make: selectedCar.make,
            makeAr: selectedCar.makeAr,
            model: selectedCar.model || "",
            modelAr: selectedCar.modelAr || "",
            year: selectedCar.year || "",
          } : undefined,
        });
      }
    };

    const handleSelectBrand = (brand: CarBrand) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedCar({ make: brand.name, makeAr: brand.nameAr });
      navigation.navigate("Camera", {
        carInfo: {
          make: brand.name,
          makeAr: brand.nameAr,
          model: "",
          modelAr: "",
          year: "",
        },
        onSelectCar: (car) => {
          setSelectedCar(car);
        }
      });
    };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Animated.View entering={FadeInDown.duration(600).delay(100)}>
        <View style={[styles.heroCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <ThemedText style={[styles.heroTitle, { fontFamily: "Cairo_700Bold" }]}>
                اكتشف وحدد قطع السيارات بدقة الذكاء الاصطناعي
              </ThemedText>
              <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                صور أي قطعة وسنحددها لك فوراً مع تفاصيل كاملة ومستوى الثقة
              </ThemedText>
            </View>
          </View>
          <View style={[styles.heroDecoration, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="zap" size={60} color={theme.primary} style={{ opacity: 0.3 }} />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
            كيفية الاستخدام
          </ThemedText>
        </View>
        <View style={styles.stepsContainer}>
          {howToSteps.map((step, index) => (
            <View key={step.id} style={[styles.stepCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                <ThemedText style={[styles.stepNumberText, { fontFamily: "Cairo_700Bold" }]}>
                  {index + 1}
                </ThemedText>
              </View>
              <View style={[styles.stepIcon, { backgroundColor: theme.primary + "15" }]}>
                <Feather name={step.icon} size={24} color={theme.primary} />
              </View>
              <View style={styles.stepContent}>
                <ThemedText style={[styles.stepTitle, { fontFamily: "Cairo_700Bold" }]}>
                  {step.title}
                </ThemedText>
                <ThemedText style={[styles.stepDescription, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                  {step.description}
                </ThemedText>
                {step.id === "1" ? (
                  <View style={styles.stepContent}>
                    <View style={[styles.heroButtons, { marginTop: Spacing.md }]}>
                      <Pressable
                        onPress={() => navigation.navigate("CarSelection", {
                          onSelect: (car) => setSelectedCar(car)
                        })}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          { 
                            backgroundColor: theme.backgroundSecondary,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                          },
                        ]}
                      >
                        <Feather name="edit-2" size={18} color={theme.text} />
                        <ThemedText style={[styles.secondaryButtonText, { fontFamily: "Cairo_600SemiBold" }]}>
                          يدوي
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={handleStartScan}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          { 
                            backgroundColor: theme.primary,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                          },
                        ]}
                      >
                        <Feather name="camera" size={18} color="#FFFFFF" />
                        <ThemedText style={[styles.primaryButtonText, { fontFamily: "Cairo_700Bold" }]}>
                          تصوير
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={handlePickImageForIdentification}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          { 
                            backgroundColor: theme.backgroundSecondary,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                          },
                        ]}
                      >
                        <Feather name="image" size={20} color={theme.text} />
                        <ThemedText style={[styles.secondaryButtonText, { fontFamily: "Cairo_600SemiBold" }]}>
                          رفع صورة
                        </ThemedText>
                      </Pressable>
                    </View>
                    
                    <View style={[styles.resultBox, { 
                      backgroundColor: theme.backgroundSecondary, 
                      borderColor: theme.primary + "30",
                      borderStyle: 'dashed',
                      minHeight: 50,
                      justifyContent: 'center'
                    }]}>
                      {selectedCar ? (
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm }}>
                          <Feather name="check-circle" size={16} color={theme.primary} />
                          <ThemedText style={[styles.resultText, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
                            السيارة المحددة: {selectedCar.makeAr} {selectedCar.modelAr} {selectedCar.year}
                          </ThemedText>
                        </View>
                      ) : (
                        <ThemedText style={[styles.resultText, { color: theme.textSecondary, textAlign: 'center', opacity: 0.6 }]}>
                          بانتظار تحديد السيارة...
                        </ThemedText>
                      )}
                    </View>
                  </View>
                ) : null}
                {step.id === "2" ? (
                  <View style={[styles.heroButtons, { marginTop: Spacing.md }]}>
                    <Pressable
                      onPress={handleStartScan}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        { 
                          backgroundColor: theme.primary,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <Feather name="camera" size={20} color="#FFFFFF" />
                      <ThemedText style={[styles.primaryButtonText, { fontFamily: "Cairo_700Bold" }]}>
                        التقط صورة
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={handleStartScan}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        { 
                          backgroundColor: theme.backgroundSecondary,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <Feather name="upload" size={20} color={theme.text} />
                      <ThemedText style={[styles.secondaryButtonText, { fontFamily: "Cairo_600SemiBold" }]}>
                        ارفع صورة
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
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
          onPress={() => navigation.navigate("Pricing")}
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
    </View>
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
      data={[]}
      keyExtractor={() => "header"}
      renderItem={() => null}
      ListHeaderComponent={renderHeader}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    gap: Spacing.xl,
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
  heroButtons: {
    flexDirection: "row-reverse",
    gap: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    shadowColor: "#1E74F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  secondaryButtonText: {
    fontSize: 15,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    textAlign: "right",
  },
  stepsContainer: {
    gap: Spacing.md,
  },
  stepCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: -6,
    right: -6,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 15,
    textAlign: "right",
  },
  stepDescription: {
    fontSize: 13,
    textAlign: "right",
  },
  brandsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  brandCard: {
    width: "31%",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: 12,
    textAlign: "center",
  },
  featuresGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  featureCard: {
    width: "48%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
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
  resultBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultText: {
    fontSize: 14,
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
