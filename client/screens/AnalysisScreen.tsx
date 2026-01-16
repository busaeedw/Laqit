import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList, CarInfo, DetectedPart } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type AnalysisScreenRouteProp = RouteProp<RootStackParamList, "Analysis">;

const statusMessages = [
  "جاري تحليل الصورة...",
  "جاري التعرف على السيارة...",
  "جاري اكتشاف القطع...",
  "جاري استخراج المعلومات...",
];

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<AnalysisScreenRouteProp>();
  const { theme } = useTheme();

  const { imageUri, carInfo } = route.params;
  const [status, setStatus] = useState(statusMessages[0]);
  const [statusIndex, setStatusIndex] = useState(0);

  const scanLineY = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(250, { duration: 2000, easing: Easing.linear }),
      -1,
      true
    );

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => {
        const next = (prev + 1) % statusMessages.length;
        setStatus(statusMessages[next]);
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const analyzeImage = async () => {
      try {
        let base64Image = "";
        
        if (imageUri.startsWith("data:")) {
          base64Image = imageUri;
        } else {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 1024 } }],
            { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
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
          body: JSON.stringify({
            imageUri: base64Image,
            carInfo,
          }),
        });

        const data = await response.json();
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const detectedCarInfo: CarInfo = data.carInfo || carInfo || {
          make: "Unknown",
          makeAr: "غير معروف",
          model: "Unknown",
          modelAr: "غير معروف",
          year: "---",
        };

        const detectedParts: DetectedPart[] = (data.parts || []).map((part: any, index: number) => ({
          id: part.id || String(index + 1),
          name: part.name || "Unknown Part",
          nameAr: part.nameAr || "قطعة غير معروفة",
          description: part.description || "",
          descriptionAr: part.descriptionAr || "",
          primaryUse: part.primaryUse || "",
          primaryUseAr: part.primaryUseAr || "",
          price: part.price || 0,
          confidence: part.confidence || 75,
          boundingBox: part.boundingBox || { x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
        }));

        navigation.replace("Results", {
          imageUri,
          carInfo: detectedCarInfo,
          parts: detectedParts.length > 0 ? detectedParts : [{
            id: "1",
            name: "Analysis in progress",
            nameAr: "جاري التحليل",
            description: "Please try again",
            descriptionAr: "يرجى المحاولة مرة أخرى",
            primaryUse: "",
            primaryUseAr: "",
            price: 0,
            confidence: 0,
            boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
          }],
        });
      } catch (error) {
        console.error("Analysis failed:", error);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        const fallbackCarInfo: CarInfo = carInfo || {
          make: "Unknown",
          makeAr: "غير معروف",
          model: "Unknown",
          modelAr: "غير معروف",
          year: "---",
        };

        navigation.replace("Results", {
          imageUri,
          carInfo: fallbackCarInfo,
          parts: [{
            id: "1",
            name: "Analysis failed",
            nameAr: "فشل التحليل",
            description: "Please try again with a clearer image",
            descriptionAr: "يرجى المحاولة مرة أخرى بصورة أوضح",
            primaryUse: "",
            primaryUseAr: "",
            price: 0,
            confidence: 0,
            boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
          }],
        });
      }
    };

    const timer = setTimeout(analyzeImage, 2000);
    return () => clearTimeout(timer);
  }, [imageUri, carInfo, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.xl }]}>
        <Animated.View entering={FadeIn.duration(500)} style={pulseStyle}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <View style={styles.scanOverlay}>
              <Animated.View style={[styles.scanLine, scanLineStyle, { backgroundColor: theme.primary }]} />
              <View style={styles.scanCorners}>
                <View style={[styles.corner, styles.cornerTL, { borderColor: theme.primary }]} />
                <View style={[styles.corner, styles.cornerTR, { borderColor: theme.primary }]} />
                <View style={[styles.corner, styles.cornerBL, { borderColor: theme.primary }]} />
                <View style={[styles.corner, styles.cornerBR, { borderColor: theme.primary }]} />
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[styles.statusText, { fontFamily: "Cairo_600SemiBold" }]}>
            {status}
          </ThemedText>
          <View style={styles.progressDots}>
            {statusMessages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: index <= statusIndex ? theme.primary : theme.backgroundSecondary },
                ]}
              />
            ))}
          </View>
        </View>

        {carInfo && (
          <Animated.View entering={FadeIn.delay(300)} style={[styles.carInfoCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={[styles.carInfoLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              السيارة المحددة
            </ThemedText>
            <ThemedText style={[styles.carInfoValue, { fontFamily: "Cairo_700Bold" }]}>
              {carInfo.makeAr} {carInfo.modelAr} {carInfo.year}
            </ThemedText>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing["3xl"],
  },
  imageContainer: {
    width: 280,
    height: 280,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-start",
  },
  scanLine: {
    height: 2,
    width: "100%",
    opacity: 0.8,
    shadowColor: "#1E74F2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  scanCorners: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerTR: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 8,
  },
  statusContainer: {
    alignItems: "center",
    gap: Spacing.md,
  },
  statusText: {
    fontSize: 18,
    textAlign: "center",
  },
  progressDots: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  carInfoCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  carInfoLabel: {
    fontSize: 13,
  },
  carInfoValue: {
    fontSize: 16,
  },
});
