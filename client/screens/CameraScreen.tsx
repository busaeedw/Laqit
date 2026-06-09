import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { getApiUrl, authHeaders } from "@/lib/query-client";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList, CarInfo } from "@/navigation/RootStackNavigator";

type CameraScreenRouteProp = RouteProp<RootStackParamList, "Camera">;

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CameraScreenRouteProp>();
  const { theme } = useTheme();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [selectedCar, setSelectedCar] = useState<CarInfo | undefined>(route.params?.carInfo);
  const cameraRef = useRef<CameraView>(null);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleSelectCar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("CarSelection");
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      if (photo?.uri) {
        // For the "Identify Car" request from step 1, call AI to identify
        if (route.params?.onSelectCar) {
          try {
            // Convert image to base64
            const manipulatedImage = await ImageManipulator.manipulateAsync(
              photo.uri,
              [{ resize: { width: 800 } }],
              { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.7 }
            );
            
            if (manipulatedImage.base64) {
              const base64Image = `data:image/jpeg;base64,${manipulatedImage.base64}`;
              
              // Call AI car identification API
              const response = await fetch(new URL("/api/identify-car", getApiUrl()).href, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ imageUri: base64Image }),
              });

              if (response.ok) {
                const result = await response.json();
                route.params.onSelectCar({
                  make: result.make,
                  makeAr: result.makeAr,
                  model: result.model,
                  modelAr: result.modelAr,
                  year: result.year
                });
              }
            }
          } catch (error) {
            console.error("Failed to identify car:", error);
          }
          navigation.goBack();
        } else if (route.params?.onAnalyzeParts) {
          // For step 2 with callback, analyze parts and return to home
          route.params.onAnalyzeParts(photo.uri);
          navigation.goBack();
        } else {
          // For step 2 without callback, go to full parts analysis
          navigation.navigate("Analysis", {
            imageUri: photo.uri,
            carInfo: selectedCar,
          });
        }
      }
    } catch (error) {
      console.error("Failed to take photo:", error);
      Alert.alert("خطأ", "فشل في التقاط الصورة");
    }
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      if (route.params?.onSelectCar) {
        // For step 1, call AI to identify car and return
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: 800 } }],
            { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.7 }
          );
          
          if (manipulatedImage.base64) {
            const base64Image = `data:image/jpeg;base64,${manipulatedImage.base64}`;
            
            const response = await fetch(new URL("/api/identify-car", getApiUrl()).href, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ imageUri: base64Image }),
            });

            if (response.ok) {
              const carResult = await response.json();
              route.params.onSelectCar({
                make: carResult.make,
                makeAr: carResult.makeAr,
                model: carResult.model,
                modelAr: carResult.modelAr,
                year: carResult.year
              });
            }
          }
        } catch (error) {
          console.error("Failed to identify car:", error);
        }
        navigation.goBack();
      } else if (route.params?.onAnalyzeParts) {
        // For step 2 with callback, analyze parts and return to home
        route.params.onAnalyzeParts(result.assets[0].uri);
        navigation.goBack();
      } else {
        // For step 2 without callback, go to full parts analysis
        navigation.navigate("Analysis", {
          imageUri: result.assets[0].uri,
          carInfo: selectedCar,
        });
      }
    }
  };

  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashEnabled(!flashEnabled);
  };

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={[styles.loadingText, { fontFamily: "Cairo_400Regular" }]}>
            جاري التحميل...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="camera-off" size={48} color={theme.primary} />
          </View>
          <ThemedText style={[styles.permissionTitle, { fontFamily: "Cairo_700Bold" }]}>
            صلاحية الكاميرا مطلوبة
          </ThemedText>
          <ThemedText style={[styles.permissionText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            نحتاج إلى صلاحية الوصول للكاميرا لتصوير قطع السيارة والتعرف عليها
          </ThemedText>
          <Button onPress={requestPermission} style={styles.permissionButton}>
            السماح بالوصول للكاميرا
          </Button>
          <Pressable onPress={handlePickImage} style={styles.galleryLink}>
            <ThemedText style={[styles.galleryLinkText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
              أو اختر صورة من المعرض
            </ThemedText>
          </Pressable>
          <Pressable onPress={handleClose} style={styles.closeLink}>
            <ThemedText style={[styles.closeLinkText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              إغلاق
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (Platform.OS === "web") {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="smartphone" size={48} color={theme.primary} />
          </View>
          <ThemedText style={[styles.permissionTitle, { fontFamily: "Cairo_700Bold" }]}>
            استخدم التطبيق على الهاتف
          </ThemedText>
          <ThemedText style={[styles.permissionText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            لتجربة أفضل مع الكاميرا، استخدم التطبيق عبر Expo Go على هاتفك
          </ThemedText>
          <Button onPress={handlePickImage} style={styles.permissionButton}>
            اختر صورة من المعرض
          </Button>
          <Pressable onPress={handleClose} style={styles.closeLink}>
            <ThemedText style={[styles.closeLinkText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              إغلاق
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flashEnabled ? "on" : "off"}
      >
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={handleClose}
              style={[styles.topButton, { backgroundColor: "rgba(0,0,0,0.4)" }]}
            >
              <Feather name="x" size={24} color="#FFFFFF" />
            </Pressable>
            
            <Pressable
              onPress={handleSelectCar}
              style={[styles.carSelectButton, { backgroundColor: "rgba(0,0,0,0.4)" }]}
            >
              <Feather name="truck" size={18} color="#FFFFFF" />
              <ThemedText style={[styles.carSelectText, { fontFamily: "Cairo_600SemiBold" }]}>
                {selectedCar ? `${selectedCar.makeAr} ${selectedCar.modelAr}` : "اختر السيارة"}
              </ThemedText>
              <Feather name="chevron-down" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.scanFrame}>
            <View style={styles.scanCornerTL} />
            <View style={styles.scanCornerTR} />
            <View style={styles.scanCornerBL} />
            <View style={styles.scanCornerBR} />
          </View>

          <View style={styles.hintContainer}>
            <ThemedText style={[styles.hintText, { fontFamily: "Cairo_400Regular" }]}>
              وجّه الكاميرا نحو قطعة السيارة
            </ThemedText>
          </View>

          <View style={styles.bottomBar}>
            <Pressable
              onPress={handlePickImage}
              style={[styles.bottomButton, { backgroundColor: "rgba(0,0,0,0.4)" }]}
            >
              <Feather name="image" size={24} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={handleTakePhoto}
              style={({ pressed }) => [
                styles.captureButton,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <View style={styles.captureButtonInner} />
            </Pressable>

            <Pressable
              onPress={toggleFlash}
              style={[
                styles.bottomButton,
                { backgroundColor: flashEnabled ? theme.primary : "rgba(0,0,0,0.4)" },
              ]}
            >
              <Feather name={flashEnabled ? "zap" : "zap-off"} size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </Animated.View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
    gap: Spacing.lg,
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  permissionTitle: {
    fontSize: 22,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
  },
  permissionButton: {
    width: "100%",
    marginTop: Spacing.md,
  },
  galleryLink: {
    padding: Spacing.md,
  },
  galleryLinkText: {
    fontSize: 15,
  },
  closeLink: {
    padding: Spacing.md,
  },
  closeLinkText: {
    fontSize: 14,
  },
  topBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  carSelectButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  carSelectText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  scanFrame: {
    width: 280,
    height: 280,
    alignSelf: "center",
    position: "relative",
  },
  scanCornerTL: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#1E74F2",
    borderTopRightRadius: 8,
  },
  scanCornerTR: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#1E74F2",
    borderTopLeftRadius: 8,
  },
  scanCornerBL: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#1E74F2",
    borderBottomRightRadius: 8,
  },
  scanCornerBR: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#1E74F2",
    borderBottomLeftRadius: 8,
  },
  hintContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  hintText: {
    color: "#FFFFFF",
    fontSize: 15,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  bottomBar: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing["3xl"],
    paddingBottom: Spacing.xl,
  },
  bottomButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
  },
});
