import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ExpertScreenRouteProp = RouteProp<RootStackParamList, "Expert">;

interface Expert {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  distance: string;
  available: boolean;
}

const mockExperts: Expert[] = [
  {
    id: "1",
    name: "ورشة الأمان للسيارات",
    specialty: "كهرباء وإلكترونيات",
    rating: 4.8,
    reviews: 234,
    distance: "2.5 كم",
    available: true,
  },
  {
    id: "2",
    name: "مركز النجم الذهبي",
    specialty: "ميكانيكا عامة",
    rating: 4.6,
    reviews: 189,
    distance: "3.2 كم",
    available: true,
  },
  {
    id: "3",
    name: "ورشة التميز",
    specialty: "هيكل وبودي",
    rating: 4.9,
    reviews: 312,
    distance: "4.1 كم",
    available: false,
  },
];

export default function ExpertScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<ExpertScreenRouteProp>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const partName = route.params?.partName;
  const [message, setMessage] = useState(
    partName ? `أحتاج مساعدة في تركيب: ${partName}` : ""
  );

  const handleCallExpert = (expert: Expert) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL("tel:+966500000000");
  };

  const handleWhatsApp = (expert: Expert) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const whatsappMessage = encodeURIComponent(message || "أحتاج مساعدة في قطع السيارة");
    Linking.openURL(`https://wa.me/966500000000?text=${whatsappMessage}`);
  };

  const renderExpert = (expert: Expert, index: number) => (
    <Animated.View
      key={expert.id}
      entering={FadeInDown.duration(400).delay(100 + index * 100)}
    >
      <View style={[styles.expertCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.expertHeader}>
          <View style={[styles.expertAvatar, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="tool" size={24} color={theme.primary} />
          </View>
          <View style={styles.expertInfo}>
            <ThemedText style={[styles.expertName, { fontFamily: "Cairo_700Bold" }]}>
              {expert.name}
            </ThemedText>
            <ThemedText style={[styles.expertSpecialty, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {expert.specialty}
            </ThemedText>
            <View style={styles.expertMeta}>
              <View style={styles.ratingContainer}>
                <Feather name="star" size={14} color={theme.accentYellow} />
                <ThemedText style={[styles.ratingText, { fontFamily: "Cairo_600SemiBold" }]}>
                  {expert.rating}
                </ThemedText>
                <ThemedText style={[styles.reviewsText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                  ({expert.reviews})
                </ThemedText>
              </View>
              <View style={styles.distanceContainer}>
                <Feather name="map-pin" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.distanceText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                  {expert.distance}
                </ThemedText>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.availabilityBadge,
              { backgroundColor: expert.available ? theme.success + "20" : theme.error + "20" },
            ]}
          >
            <View
              style={[
                styles.availabilityDot,
                { backgroundColor: expert.available ? theme.success : theme.error },
              ]}
            />
            <ThemedText
              style={[
                styles.availabilityText,
                { color: expert.available ? theme.success : theme.error, fontFamily: "Cairo_600SemiBold" },
              ]}
            >
              {expert.available ? "متاح" : "مشغول"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.expertActions}>
          <Pressable
            onPress={() => handleCallExpert(expert)}
            style={({ pressed }) => [
              styles.actionButton,
              { 
                backgroundColor: theme.success + "15",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="phone" size={18} color={theme.success} />
            <ThemedText style={[styles.actionButtonText, { color: theme.success, fontFamily: "Cairo_600SemiBold" }]}>
              اتصال
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleWhatsApp(expert)}
            style={({ pressed }) => [
              styles.actionButton,
              { 
                backgroundColor: "#25D366" + "20",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="message-circle" size={18} color="#25D366" />
            <ThemedText style={[styles.actionButtonText, { color: "#25D366", fontFamily: "Cairo_600SemiBold" }]}>
              واتساب
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

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
        <View style={[styles.infoCard, { backgroundColor: theme.primary + "10" }]}>
          <Feather name="info" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoTitle, { fontFamily: "Cairo_700Bold" }]}>
              تواصل مع خبراء معتمدين
            </ThemedText>
            <ThemedText style={[styles.infoText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              اختر أحد الخبراء المتخصصين للحصول على مساعدة في تركيب أو صيانة قطع سيارتك
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      {partName && (
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <View style={styles.partInfo}>
            <ThemedText style={[styles.partLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              القطعة المطلوبة:
            </ThemedText>
            <View style={[styles.partBadge, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="box" size={16} color={theme.primary} />
              <ThemedText style={[styles.partName, { fontFamily: "Cairo_600SemiBold" }]}>
                {partName}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={styles.messageSection}>
          <ThemedText style={[styles.messageLabel, { fontFamily: "Cairo_600SemiBold" }]}>
            رسالتك للخبير (اختياري)
          </ThemedText>
          <TextInput
            style={[
              styles.messageInput,
              { 
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                fontFamily: "Cairo_400Regular",
              },
            ]}
            placeholder="اكتب وصفاً للمشكلة أو ما تحتاجه..."
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            textAlign="right"
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(150)}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Cairo_700Bold" }]}>
            خبراء قريبون منك
          </ThemedText>
        </View>
      </Animated.View>

      <View style={styles.expertsList}>
        {mockExperts.map((expert, index) => renderExpert(expert, index))}
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(500)}>
        <View style={[styles.helpCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="help-circle" size={24} color={theme.textSecondary} />
          <View style={styles.helpContent}>
            <ThemedText style={[styles.helpTitle, { fontFamily: "Cairo_600SemiBold" }]}>
              لم تجد ما تبحث عنه؟
            </ThemedText>
            <ThemedText style={[styles.helpText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              تواصل معنا وسنساعدك في إيجاد الخبير المناسب
            </ThemedText>
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
  infoCard: {
    flexDirection: "row-reverse",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  infoTitle: {
    fontSize: 15,
    textAlign: "right",
  },
  infoText: {
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
  },
  partInfo: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  partLabel: {
    fontSize: 13,
    textAlign: "right",
  },
  partBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-end",
  },
  partName: {
    fontSize: 14,
  },
  messageSection: {
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  messageLabel: {
    fontSize: 14,
    textAlign: "right",
  },
  messageInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    textAlign: "right",
  },
  expertsList: {
    gap: Spacing.md,
  },
  expertCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  expertHeader: {
    flexDirection: "row-reverse",
    gap: Spacing.md,
  },
  expertAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  expertInfo: {
    flex: 1,
    gap: 2,
  },
  expertName: {
    fontSize: 16,
    textAlign: "right",
  },
  expertSpecialty: {
    fontSize: 13,
    textAlign: "right",
  },
  expertMeta: {
    flexDirection: "row-reverse",
    gap: Spacing.md,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
  },
  reviewsText: {
    fontSize: 12,
  },
  distanceContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
  },
  availabilityBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    fontSize: 11,
  },
  expertActions: {
    flexDirection: "row-reverse",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionButtonText: {
    fontSize: 14,
  },
  helpCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  helpContent: {
    flex: 1,
    gap: 2,
  },
  helpTitle: {
    fontSize: 14,
    textAlign: "right",
  },
  helpText: {
    fontSize: 12,
    textAlign: "right",
  },
});
