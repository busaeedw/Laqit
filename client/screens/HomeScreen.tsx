import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Image,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Animated, {
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import { getApiUrl } from "@/lib/query-client";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
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
    title: "مراجعة الطلب قبل الإرسال",
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

    const [isIdentifying, setIsIdentifying] = React.useState(false);
    
    const [identifiedParts, setIdentifiedParts] = React.useState<string[]>([]);
    const [isAnalyzingParts, setIsAnalyzingParts] = React.useState(false);
    const [isAddingPart, setIsAddingPart] = React.useState(false);
    const [newPartText, setNewPartText] = React.useState("");
    const [isReviewModalVisible, setIsReviewModalVisible] = React.useState(false);

    const identifyCarFromImage = async (imageUri: string) => {
      setIsIdentifying(true);
      try {
        // Convert image to base64
        let base64Image = "";
        if (imageUri.startsWith("data:")) {
          base64Image = imageUri;
        } else {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 800 } }],
            { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.7 }
          );
          if (manipulatedImage.base64) {
            base64Image = `data:image/jpeg;base64,${manipulatedImage.base64}`;
          } else {
            throw new Error("Failed to convert image to base64");
          }
        }

        // Call AI car identification API
        const response = await fetch(new URL("/api/identify-car", getApiUrl()).href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUri: base64Image }),
        });

        if (!response.ok) {
          throw new Error("API request failed");
        }

        const result = await response.json();
        
        setSelectedCar({
          make: result.make,
          makeAr: result.makeAr,
          model: result.model,
          modelAr: result.modelAr,
          year: result.year
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Failed to identify car:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsIdentifying(false);
      }
    };

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
        await identifyCarFromImage(result.assets[0].uri);
      }
    };

    const analyzePartsFromImage = async (imageUri: string) => {
      setIsAnalyzingParts(true);
      try {
        let base64Image = "";
        if (imageUri.startsWith("data:")) {
          base64Image = imageUri;
        } else {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 800 } }],
            { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.7 }
          );
          if (manipulatedImage.base64) {
            base64Image = `data:image/jpeg;base64,${manipulatedImage.base64}`;
          } else {
            throw new Error("Failed to convert image to base64");
          }
        }

        const response = await fetch(new URL("/api/analyze", getApiUrl()).href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUri: base64Image, carInfo: selectedCar }),
        });

        if (!response.ok) {
          throw new Error("API request failed");
        }

        const result = await response.json();
        
        if (result.parts && result.parts.length > 0) {
          setIdentifiedParts(result.parts.map((part: any) => part.nameAr || part.name));
        } else {
          setIdentifiedParts(["لم يتم العثور على قطع"]);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Failed to analyze parts:", error);
        setIdentifiedParts(["فشل في تحليل الصورة"]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsAnalyzingParts(false);
      }
    };

    const handleCapturePartPhoto = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("Camera", {
        carInfo: selectedCar || undefined,
        onAnalyzeParts: async (imageUri: string) => {
          await analyzePartsFromImage(imageUri);
        }
      });
    };

    const handlePickImageForParts = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        await analyzePartsFromImage(result.assets[0].uri);
      }
    };

    const removePart = (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIdentifiedParts(prev => prev.filter((_, i) => i !== index));
    };

    const startAddingPart = () => {
      if (identifiedParts.length >= 10) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsAddingPart(true);
      setNewPartText("");
    };

    const confirmAddPart = () => {
      if (newPartText.trim() && identifiedParts.length < 10) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIdentifiedParts(prev => [...prev, newPartText.trim()]);
      }
      setIsAddingPart(false);
      setNewPartText("");
    };

    const cancelAddPart = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsAddingPart(false);
      setNewPartText("");
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
                      {isIdentifying ? (
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm }}>
                          <Feather name="loader" size={16} color={theme.primary} />
                          <ThemedText style={[styles.resultText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                            جاري تحديد السيارة...
                          </ThemedText>
                        </View>
                      ) : selectedCar ? (
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
                  <View style={styles.stepContent}>
                    <View style={[styles.heroButtons, { marginTop: Spacing.md }]}>
                      <Pressable
                        onPress={handleCapturePartPhoto}
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
                        onPress={handlePickImageForParts}
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
                    
                    <View style={[styles.resultBox, { 
                      backgroundColor: theme.backgroundSecondary, 
                      borderColor: theme.primary + "30",
                      borderStyle: 'dashed',
                      minHeight: 50,
                      justifyContent: 'center'
                    }]}>
                      {isAnalyzingParts ? (
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm }}>
                          <Feather name="loader" size={16} color={theme.primary} />
                          <ThemedText style={[styles.resultText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                            جاري تحليل القطع...
                          </ThemedText>
                        </View>
                      ) : identifiedParts.length > 0 ? (
                        <View style={{ gap: Spacing.sm }}>
                          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm }}>
                            {identifiedParts.length < 10 && !isAddingPart ? (
                              <Pressable 
                                onPress={startAddingPart}
                                style={({ pressed }) => ({
                                  opacity: pressed ? 0.6 : 1,
                                  backgroundColor: theme.primary,
                                  borderRadius: BorderRadius.xs,
                                  padding: 4,
                                  paddingHorizontal: 8,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4
                                })}
                              >
                                <Feather name="plus" size={14} color="#FFFFFF" />
                                <ThemedText style={{ color: "#FFFFFF", fontSize: 12, fontFamily: "Cairo_600SemiBold" }}>
                                  إضافة
                                </ThemedText>
                              </Pressable>
                            ) : null}
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                              <Feather name="check-circle" size={16} color={theme.primary} />
                              <ThemedText style={[styles.resultText, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
                                القطع المحددة ({identifiedParts.length}/10):
                              </ThemedText>
                            </View>
                          </View>
                          <View style={{ gap: Spacing.xs }}>
                            {identifiedParts.map((part, index) => (
                              <View 
                                key={index} 
                                style={{ 
                                  flexDirection: 'row-reverse', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  paddingRight: Spacing.lg 
                                }}
                              >
                                <ThemedText style={[styles.resultText, { color: theme.text, fontFamily: "Cairo_400Regular" }]}>
                                  {index + 1}. {part}
                                </ThemedText>
                                <Pressable 
                                  onPress={() => removePart(index)}
                                  style={({ pressed }) => ({
                                    opacity: pressed ? 0.6 : 1,
                                    padding: 4
                                  })}
                                >
                                  <Feather name="x-circle" size={16} color="#EF4444" />
                                </Pressable>
                              </View>
                            ))}
                            {isAddingPart ? (
                              <View 
                                style={{ 
                                  flexDirection: 'row-reverse', 
                                  alignItems: 'center', 
                                  gap: Spacing.sm,
                                  paddingRight: Spacing.lg 
                                }}
                              >
                                <ThemedText style={[styles.resultText, { color: theme.text, fontFamily: "Cairo_400Regular" }]}>
                                  {identifiedParts.length + 1}.
                                </ThemedText>
                                <TextInput
                                  value={newPartText}
                                  onChangeText={setNewPartText}
                                  placeholder="اسم القطعة..."
                                  placeholderTextColor={theme.textSecondary}
                                  maxLength={30}
                                  style={{
                                    flex: 1,
                                    backgroundColor: "#FFFFFF",
                                    borderRadius: BorderRadius.xs,
                                    paddingHorizontal: Spacing.sm,
                                    paddingVertical: Spacing.xs,
                                    fontSize: 14,
                                    fontFamily: "Cairo_400Regular",
                                    textAlign: 'right',
                                    color: theme.text,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                  }}
                                  autoFocus
                                />
                                <Pressable 
                                  onPress={confirmAddPart}
                                  style={({ pressed }) => ({
                                    opacity: pressed ? 0.6 : 1,
                                    padding: 4
                                  })}
                                >
                                  <Feather name="check-circle" size={20} color="#10B981" />
                                </Pressable>
                                <Pressable 
                                  onPress={cancelAddPart}
                                  style={({ pressed }) => ({
                                    opacity: pressed ? 0.6 : 1,
                                    padding: 4
                                  })}
                                >
                                  <Feather name="x-circle" size={20} color="#EF4444" />
                                </Pressable>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <ThemedText style={[styles.resultText, { color: theme.textSecondary, textAlign: 'center', opacity: 0.6 }]}>
                          بانتظار تحليل قطع السيارة...
                        </ThemedText>
                      )}
                    </View>
                  </View>
                ) : null}
                {step.id === "3" ? (
                  <View style={styles.stepContent}>
                    <Pressable
                      onPress={() => setIsReviewModalVisible(true)}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        { 
                          backgroundColor: theme.primary,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                          marginTop: Spacing.md,
                        },
                      ]}
                    >
                      <Feather name="file-text" size={20} color="#FFFFFF" />
                      <ThemedText style={[styles.primaryButtonText, { fontFamily: "Cairo_700Bold" }]}>
                        راجع الطلب
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      <Modal
        visible={isReviewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable
              onPress={() => setIsReviewModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Spacing.xl }}
            >
              <View style={styles.modalLogoContainer}>
                <View style={[styles.modalLogo, { backgroundColor: theme.primary + "15" }]}>
                  <Feather name="zap" size={40} color={theme.primary} />
                </View>
              </View>
              
              <ThemedText style={[styles.modalTitle, { fontFamily: "Cairo_700Bold", textAlign: 'center' }]}>
                طلب قطع غيار للسيارة:
              </ThemedText>
              
              <View style={[styles.modalCarInfo, { backgroundColor: theme.backgroundSecondary }]}>
                {selectedCar ? (
                  <ThemedText style={[styles.modalCarText, { fontFamily: "Cairo_600SemiBold", color: theme.primary }]}>
                    {selectedCar.makeAr} {selectedCar.modelAr} {selectedCar.year}
                  </ThemedText>
                ) : (
                  <ThemedText style={[styles.modalCarText, { fontFamily: "Cairo_400Regular", color: theme.textSecondary }]}>
                    لم يتم تحديد سيارة
                  </ThemedText>
                )}
              </View>
              
              <ThemedText style={[styles.modalSectionTitle, { fontFamily: "Cairo_700Bold" }]}>
                قطع الغيار المطلوبة:
              </ThemedText>
              
              <View style={[styles.modalPartsList, { backgroundColor: theme.backgroundSecondary }]}>
                {identifiedParts.length > 0 ? (
                  identifiedParts.map((part, index) => (
                    <View key={index} style={styles.modalPartItem}>
                      <ThemedText style={[styles.modalPartText, { fontFamily: "Cairo_400Regular" }]}>
                        {index + 1}. {part}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText style={[styles.modalPartText, { fontFamily: "Cairo_400Regular", color: theme.textSecondary, textAlign: 'center' }]}>
                    لم يتم تحديد قطع غيار
                  </ThemedText>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    position: "relative",
  },
  modalCloseButton: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    zIndex: 10,
    padding: Spacing.xs,
  },
  modalLogoContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  modalLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: Spacing.md,
  },
  modalCarInfo: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  modalCarText: {
    fontSize: 16,
    textAlign: "center",
  },
  modalSectionTitle: {
    fontSize: 16,
    textAlign: "right",
    marginBottom: Spacing.sm,
  },
  modalPartsList: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  modalPartItem: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  modalPartText: {
    fontSize: 14,
    textAlign: "right",
  },
});
