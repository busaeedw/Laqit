import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  Pressable,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useCart } from "@/context/CartContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList, DetectedPart } from "@/navigation/RootStackNavigator";

type ResultsScreenRouteProp = RouteProp<RootStackParamList, "Results">;

const { width: screenWidth } = Dimensions.get("window");
const imageWidth = screenWidth - Spacing.lg * 2;

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const { theme } = useTheme();
  
  const getConfidenceConfig = () => {
    if (confidence >= 90) return { label: "دقة عالية جداً", color: theme.success };
    if (confidence >= 75) return { label: "دقة عالية", color: "#22C55E" };
    if (confidence >= 60) return { label: "دقة متوسطة", color: theme.warning };
    return { label: "دقة منخفضة", color: theme.error };
  };

  const config = getConfidenceConfig();

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: config.color + "20" }]}>
      <View style={[styles.confidenceDot, { backgroundColor: config.color }]} />
      <ThemedText style={[styles.confidenceText, { color: config.color, fontFamily: "Cairo_600SemiBold" }]}>
        {confidence}% - {config.label}
      </ThemedText>
    </View>
  );
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ResultsScreenRouteProp>();
  const { theme } = useTheme();
  const { addItem, itemCount } = useCart();

  const { imageUri, carInfo, parts } = route.params;
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const handleAddToCart = (part: DetectedPart) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem({
      id: part.id,
      name: part.name,
      nameAr: part.nameAr,
      price: part.price,
    });
  };

  const handleViewCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Cart");
  };

  const handleConnectExpert = (partName?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Expert", { partName });
  };

  const renderBoundingBoxes = () => (
    <View style={StyleSheet.absoluteFill}>
      {parts.map((part) => (
        <Pressable
          key={part.id}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedPart(selectedPart === part.id ? null : part.id);
          }}
          style={[
            styles.boundingBox,
            {
              left: part.boundingBox.x * imageWidth,
              top: part.boundingBox.y * (imageWidth * 0.75),
              width: part.boundingBox.width * imageWidth,
              height: part.boundingBox.height * (imageWidth * 0.75),
              borderColor: selectedPart === part.id ? theme.accent : theme.primary,
              backgroundColor: selectedPart === part.id ? theme.accent + "20" : theme.primary + "10",
            },
          ]}
        >
          {selectedPart === part.id && (
            <View style={[styles.partLabel, { backgroundColor: theme.accent }]}>
              <ThemedText style={[styles.partLabelText, { fontFamily: "Cairo_600SemiBold" }]}>
                {part.nameAr}
              </ThemedText>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Animated.View entering={FadeIn.duration(500)}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          {renderBoundingBoxes()}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <View style={[styles.carInfoCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.carBadge, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="truck" size={20} color={theme.primary} />
          </View>
          <View style={styles.carInfoContent}>
            <ThemedText style={[styles.carInfoLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              تم التعرف على السيارة
            </ThemedText>
            <ThemedText style={[styles.carInfoValue, { fontFamily: "Cairo_700Bold" }]}>
              {carInfo.makeAr} {carInfo.modelAr}
            </ThemedText>
            <ThemedText style={[styles.carInfoYear, { color: theme.textSecondary, fontFamily: "Cairo_600SemiBold" }]}>
              موديل {carInfo.year}
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
        <Pressable
          onPress={() => handleConnectExpert()}
          style={({ pressed }) => [
            styles.expertCard,
            { 
              backgroundColor: theme.warning + "15",
              borderColor: theme.warning + "30",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.expertIcon, { backgroundColor: theme.warning + "20" }]}>
            <Feather name="users" size={24} color={theme.warning} />
          </View>
          <View style={styles.expertContent}>
            <ThemedText style={[styles.expertTitle, { fontFamily: "Cairo_700Bold" }]}>
              هل تحتاج مساعدة احترافية؟
            </ThemedText>
            <ThemedText style={[styles.expertSubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              تواصل مع خبير بضغطة واحدة
            </ThemedText>
          </View>
          <Feather name="chevron-left" size={20} color={theme.warning} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
            القطع المكتشفة ({parts.length})
          </ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            اضغط على الصورة لتحديد القطعة
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );

  const renderPartItem = ({ item, index }: { item: DetectedPart; index: number }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(300 + index * 100)}>
      <Pressable
        onPress={() => setSelectedPart(selectedPart === item.id ? null : item.id)}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <View
          style={[
            styles.partCard,
            { 
              backgroundColor: theme.backgroundDefault,
              borderColor: selectedPart === item.id ? theme.primary : "transparent",
              borderWidth: selectedPart === item.id ? 2 : 0,
            },
          ]}
        >
          <View style={styles.partCardHeader}>
            <View style={styles.partCardContent}>
              <View style={[styles.partIcon, { backgroundColor: theme.primary + "15" }]}>
                <Feather name="box" size={24} color={theme.primary} />
              </View>
              <View style={styles.partInfo}>
                <ThemedText style={[styles.partName, { fontFamily: "Cairo_700Bold" }]}>
                  {item.nameAr}
                </ThemedText>
                <ThemedText style={[styles.partEnglishName, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                  {item.name}
                </ThemedText>
              </View>
            </View>
            <ConfidenceBadge confidence={item.confidence} />
          </View>

          <View style={[styles.partDivider, { backgroundColor: theme.border }]} />

          <View style={styles.partDetails}>
            <View style={styles.partDetailRow}>
              <Feather name="info" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.partDetailLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                الوصف:
              </ThemedText>
              <ThemedText style={[styles.partDetailValue, { fontFamily: "Cairo_400Regular" }]}>
                {item.descriptionAr}
              </ThemedText>
            </View>
            <View style={styles.partDetailRow}>
              <Feather name="tool" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.partDetailLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                الاستخدام:
              </ThemedText>
              <ThemedText style={[styles.partDetailValue, { fontFamily: "Cairo_400Regular" }]}>
                {item.primaryUseAr}
              </ThemedText>
            </View>
          </View>

          <View style={styles.partFooter}>
            <View style={styles.partPriceRow}>
              <ThemedText style={[styles.partPrice, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
                {item.price} ريال
              </ThemedText>
              <ThemedText style={[styles.partPriceLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                السعر التقديري
              </ThemedText>
            </View>
            <View style={styles.partActions}>
              <Pressable
                onPress={() => handleConnectExpert(item.nameAr)}
                style={({ pressed }) => [
                  styles.expertButton,
                  { 
                    backgroundColor: theme.warning + "15",
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                <Feather name="phone" size={16} color={theme.warning} />
              </Pressable>
              <Pressable
                onPress={() => handleAddToCart(item)}
                style={({ pressed }) => [
                  styles.addButton,
                  { 
                    backgroundColor: theme.primary,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
                <ThemedText style={[styles.addButtonText, { fontFamily: "Cairo_600SemiBold" }]}>
                  القطع المتاحة
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={parts}
        keyExtractor={(item) => item.id}
        renderItem={renderPartItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingHorizontal: Spacing.lg,
          paddingBottom: itemCount > 0 ? 100 : Spacing.xl,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />

      {itemCount > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.cartBar,
            { 
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          <View style={styles.cartInfo}>
            <View style={[styles.cartBadge, { backgroundColor: theme.primary }]}>
              <ThemedText style={[styles.cartBadgeText, { fontFamily: "Cairo_700Bold" }]}>
                {itemCount}
              </ThemedText>
            </View>
            <ThemedText style={[styles.cartText, { fontFamily: "Cairo_600SemiBold" }]}>
              قطع في السلة
            </ThemedText>
          </View>
          <Pressable
            onPress={handleViewCart}
            style={({ pressed }) => [
              styles.viewCartButton,
              { 
                backgroundColor: theme.primary,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <ThemedText style={[styles.viewCartButtonText, { fontFamily: "Cairo_700Bold" }]}>
              عرض السلة
            </ThemedText>
            <Feather name="shopping-cart" size={18} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContent: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  imageContainer: {
    width: imageWidth,
    height: imageWidth * 0.75,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  boundingBox: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: BorderRadius.xs,
  },
  partLabel: {
    position: "absolute",
    top: -28,
    right: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  partLabelText: {
    color: "#FFFFFF",
    fontSize: 11,
  },
  carInfoCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  carBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  carInfoContent: {
    flex: 1,
    gap: 2,
  },
  carInfoLabel: {
    fontSize: 12,
    textAlign: "right",
  },
  carInfoValue: {
    fontSize: 18,
    textAlign: "right",
  },
  carInfoYear: {
    fontSize: 14,
    textAlign: "right",
  },
  expertCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  expertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  expertContent: {
    flex: 1,
    gap: 2,
  },
  expertTitle: {
    fontSize: 15,
    textAlign: "right",
  },
  expertSubtitle: {
    fontSize: 13,
    textAlign: "right",
  },
  sectionHeader: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    textAlign: "right",
  },
  sectionSubtitle: {
    fontSize: 13,
    textAlign: "right",
  },
  partCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  partCardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  partCardContent: {
    flexDirection: "row-reverse",
    gap: Spacing.md,
    flex: 1,
  },
  partIcon: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  partInfo: {
    flex: 1,
    gap: 2,
  },
  partName: {
    fontSize: 16,
    textAlign: "right",
  },
  partEnglishName: {
    fontSize: 12,
    textAlign: "right",
  },
  confidenceBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 11,
  },
  partDivider: {
    height: 1,
  },
  partDetails: {
    gap: Spacing.sm,
  },
  partDetailRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  partDetailLabel: {
    fontSize: 13,
  },
  partDetailValue: {
    flex: 1,
    fontSize: 13,
    textAlign: "right",
  },
  partFooter: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  partPriceRow: {
    gap: 2,
  },
  partPrice: {
    fontSize: 18,
    textAlign: "right",
  },
  partPriceLabel: {
    fontSize: 11,
    textAlign: "right",
  },
  partActions: {
    flexDirection: "row-reverse",
    gap: Spacing.sm,
  },
  expertButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  cartInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cartBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  cartText: {
    fontSize: 15,
  },
  viewCartButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  viewCartButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
});
