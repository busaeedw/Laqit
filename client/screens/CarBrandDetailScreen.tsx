import React, { useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CarBrandDetail">;

const BRAND_INITIALS: Record<string, string> = {
  Toyota: "T", Honda: "H", Nissan: "N", Hyundai: "HY", Kia: "K",
  Renault: "R", "Mercedes-Benz": "MB", BMW: "B", Lexus: "L",
  Chevrolet: "C", Ford: "F", GMC: "G", Audi: "A", Mitsubishi: "M",
  Cadillac: "C", "Land Rover": "LR", Jeep: "J", Infiniti: "I",
  Volkswagen: "VW", Mazda: "MZ", Dodge: "D", RAM: "R", Suzuki: "S",
  MG: "MG", Porsche: "P", Volvo: "V", Lincoln: "LN",
  Genesis: "GN", Subaru: "SB", Isuzu: "IZ",
  BYD: "BYD", Geely: "GL", Chery: "CH", Haval: "HV",
  Changan: "CA", JETOUR: "JT", GAC: "GAC", Exeed: "EX",
};

const BRAND_COLORS: Record<string, string> = {
  Toyota: "#EB0A1E", Honda: "#CC0000", Nissan: "#C3002F",
  Hyundai: "#002C5F", Kia: "#05141F", Renault: "#EFDF00",
  "Mercedes-Benz": "#00A19C", BMW: "#0066B2", Lexus: "#1A1A1A",
  Chevrolet: "#C8A84B", Ford: "#003478", GMC: "#CC0000",
  Audi: "#BB0A30", Mitsubishi: "#E4022D", Cadillac: "#284376",
  "Land Rover": "#005A2B", Jeep: "#3C3C3B", Infiniti: "#1F1F1F",
  Volkswagen: "#001E50", Mazda: "#910A2D", Dodge: "#CC0000",
  RAM: "#CC0000", Suzuki: "#CD1518", MG: "#C8102E",
  Porsche: "#D5001C", Volvo: "#003057", Lincoln: "#1A1A1A",
  Genesis: "#1A1A2E", Subaru: "#003399", Isuzu: "#CC0000",
  BYD: "#1DB954", Geely: "#003087", Chery: "#CC0000",
  Haval: "#B8172B", Changan: "#003087", JETOUR: "#E63329",
  GAC: "#003087", Exeed: "#C41230",
};

interface CarModel {
  carModelId: string;
  modelName: string;
  modelNameAr: string | null;
  modelYear?: number | null;
}

interface ModelsResponse {
  models: CarModel[];
}

export default function CarBrandDetailScreen({ route }: Props) {
  const { make } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const brandColor = BRAND_COLORS[make.makeName] ?? theme.primary;
  const initials = BRAND_INITIALS[make.makeName] ?? make.makeName.slice(0, 2).toUpperCase();

  const { data: modelsData, isLoading: modelsLoading } = useQuery<ModelsResponse>({
    queryKey: ["/api/car-models", make.makeId],
    queryFn: async () => {
      const { getApiUrl } = await import("@/lib/query-client");
      const url = new URL(`/api/car-models/${make.makeId}`, getApiUrl());
      const res = await fetch(url.toString());
      if (!res.ok) return { models: [] };
      return res.json();
    },
  });

  const handlePhone = useCallback(() => {
    if (!make.agent?.phone) return;
    Linking.openURL(`tel:${make.agent.phone}`).catch(() => {});
  }, [make.agent?.phone]);

  const handleWebsite = useCallback(() => {
    if (!make.agent?.website) return;
    const url = make.agent.website.startsWith("http")
      ? make.agent.website
      : `https://${make.agent.website}`;
    Linking.openURL(url).catch(() => {});
  }, [make.agent?.website]);

  const models = modelsData?.models ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand Hero */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={[styles.hero, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.heroAvatar, { backgroundColor: brandColor + "18" }]}>
            <ThemedText style={[styles.heroInitials, { color: brandColor, fontFamily: "Cairo_700Bold" }]}>
              {initials}
            </ThemedText>
          </View>
          <ThemedText style={[styles.heroNameAr, { fontFamily: "Cairo_700Bold" }]}>
            {make.nameAr ?? make.makeName}
          </ThemedText>
          <ThemedText style={[styles.heroNameEn, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            {make.makeName}
          </ThemedText>
          <View style={[styles.modelCountBadge, { backgroundColor: brandColor + "18" }]}>
            <ThemedText style={[styles.modelCountText, { color: brandColor, fontFamily: "Cairo_600SemiBold" }]}>
              {models.length > 0 ? `${models.length} موديل` : "—"}
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      {/* Agent / Distributor Card */}
      {make.agent ? (
        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Cairo_600SemiBold" }]}>
              الوكيل الرسمي
            </ThemedText>

            {/* Agent Names */}
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: brandColor + "15" }]}>
                <Feather name="briefcase" size={16} color={brandColor} />
              </View>
              <View style={styles.infoText}>
                <ThemedText style={[styles.infoMain, { fontFamily: "Cairo_600SemiBold" }]}>
                  {make.agent.agentNameAr ?? make.agent.agentNameEn}
                </ThemedText>
                {make.agent.agentNameAr ? (
                  <ThemedText style={[styles.infoSub, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                    {make.agent.agentNameEn}
                  </ThemedText>
                ) : null}
              </View>
            </View>

            {/* HQ City */}
            {make.agent.headquartersCity ? (
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: brandColor + "15" }]}>
                  <Feather name="map-pin" size={16} color={brandColor} />
                </View>
                <View style={styles.infoText}>
                  <ThemedText style={[styles.infoMain, { fontFamily: "Cairo_600SemiBold" }]}>
                    {make.agent.headquartersCity}
                  </ThemedText>
                  <ThemedText style={[styles.infoSub, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                    المقر الرئيسي
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {/* Phone */}
            {make.agent.phone ? (
              <Pressable
                onPress={handlePhone}
                style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.7 }]}
                testID="button-agent-phone"
              >
                <View style={[styles.iconBox, { backgroundColor: brandColor + "15" }]}>
                  <Feather name="phone" size={16} color={brandColor} />
                </View>
                <View style={styles.infoText}>
                  <ThemedText style={[styles.infoMain, styles.tappable, { color: brandColor, fontFamily: "Cairo_600SemiBold" }]}>
                    {make.agent.phone}
                  </ThemedText>
                  <ThemedText style={[styles.infoSub, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                    اضغط للاتصال
                  </ThemedText>
                </View>
                <Feather name="chevron-left" size={16} color={theme.textSecondary} />
              </Pressable>
            ) : null}

            {/* Website */}
            {make.agent.website ? (
              <Pressable
                onPress={handleWebsite}
                style={({ pressed }) => [styles.infoRow, { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]}
                testID="button-agent-website"
              >
                <View style={[styles.iconBox, { backgroundColor: brandColor + "15" }]}>
                  <Feather name="globe" size={16} color={brandColor} />
                </View>
                <View style={styles.infoText}>
                  <ThemedText style={[styles.infoMain, styles.tappable, { color: brandColor, fontFamily: "Cairo_600SemiBold" }]}>
                    {make.agent.website}
                  </ThemedText>
                  <ThemedText style={[styles.infoSub, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                    اضغط لفتح الموقع
                  </ThemedText>
                </View>
                <Feather name="chevron-left" size={16} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      {/* Models List */}
      <Animated.View entering={FadeInDown.duration(400).delay(160)}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Cairo_600SemiBold" }]}>
            الموديلات المتاحة
          </ThemedText>

          {modelsLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
          ) : models.length === 0 ? (
            <ThemedText style={[styles.emptyModels, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              لا توجد موديلات مسجلة
            </ThemedText>
          ) : (
            <View style={styles.modelGrid}>
              {models.map((model, idx) => (
                <View
                  key={model.carModelId}
                  style={[
                    styles.modelChip,
                    {
                      backgroundColor: brandColor + "12",
                      borderColor: brandColor + "30",
                    },
                    idx === models.length - 1 && styles.modelChipLast,
                  ]}
                  testID={`model-chip-${model.carModelId}`}
                >
                  <ThemedText style={[styles.modelChipText, { color: theme.text, fontFamily: "Cairo_600SemiBold" }]}>
                    {model.modelNameAr ?? model.modelName}
                  </ThemedText>
                  <ThemedText style={[styles.modelChipSub, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                    {model.modelName}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  hero: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  heroInitials: {
    fontSize: 26,
    letterSpacing: 1,
  },
  heroNameAr: {
    fontSize: 22,
    textAlign: "center",
  },
  heroNameEn: {
    fontSize: 14,
    textAlign: "center",
  },
  modelCountBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
  },
  modelCountText: {
    fontSize: 13,
  },
  card: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 12,
    textAlign: "right",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.07)",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  infoMain: {
    fontSize: 15,
    textAlign: "right",
  },
  infoSub: {
    fontSize: 12,
    textAlign: "right",
  },
  tappable: {
    textDecorationLine: "underline",
  },
  loader: {
    marginVertical: Spacing.lg,
  },
  emptyModels: {
    textAlign: "center",
    fontSize: 14,
    paddingVertical: Spacing.lg,
  },
  modelGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  modelChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    alignItems: "center",
  },
  modelChipText: {
    fontSize: 13,
    textAlign: "center",
  },
  modelChipSub: {
    fontSize: 11,
    textAlign: "center",
  },
  modelChipLast: {},
});
