import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface AgentInfo {
  agentNameEn: string;
  agentNameAr: string | null;
  website: string | null;
  phone: string | null;
  headquartersCity: string | null;
}

interface CarMake {
  makeId: string;
  makeName: string;
  nameAr: string | null;
  agent: AgentInfo | null;
}

interface ApiResponse {
  makes: CarMake[];
}

const BRAND_COLORS: Record<string, string> = {
  Toyota: "#EB0A1E",
  Honda: "#CC0000",
  Nissan: "#C3002F",
  Hyundai: "#002C5F",
  Kia: "#05141F",
  Renault: "#FFCC00",
  "Mercedes-Benz": "#00ADEF",
  BMW: "#0066B1",
  Lexus: "#1A1A1A",
  Chevrolet: "#D4AF37",
  Ford: "#003099",
  GMC: "#1E3A5F",
  Audi: "#BB0A30",
  Mitsubishi: "#E60012",
  Cadillac: "#1A3A5C",
  "Land Rover": "#005A2B",
  Jeep: "#2C6E3F",
  Infiniti: "#1A1A2E",
  Volkswagen: "#001E50",
  Mazda: "#910A2D",
  Dodge: "#D40000",
  RAM: "#1E3A5F",
  Suzuki: "#0A4CA1",
  MG: "#C8102E",
  Porsche: "#D5001C",
  Volvo: "#003057",
  Lincoln: "#2B3A52",
  Genesis: "#1A1A2E",
  Subaru: "#1A3A7C",
  Isuzu: "#CC0000",
};

function AgentCard({ make, index }: { make: CarMake; index: number }) {
  const { theme } = useTheme();
  const agent = make.agent!;
  const brandColor = BRAND_COLORS[make.makeName] ?? theme.primary;
  const initials = (make.nameAr ?? make.makeName).slice(0, 2);

  const openPhone = () => {
    if (!agent.phone) return;
    Linking.openURL(`tel:${agent.phone}`).catch(() => {});
  };

  const openWebsite = () => {
    if (!agent.website) return;
    const url = agent.website.startsWith("http") ? agent.website : `https://${agent.website}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
        testID={`card-agent-${make.makeId}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitles}>
            <ThemedText style={[styles.agentName, { fontFamily: "Cairo_700Bold" }]}>
              {agent.agentNameAr ?? agent.agentNameEn}
            </ThemedText>
            {agent.agentNameAr ? (
              <ThemedText style={[styles.agentNameEn, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                {agent.agentNameEn}
              </ThemedText>
            ) : null}
          </View>
          <View style={[styles.brandBadge, { backgroundColor: brandColor + "18" }]}>
            <ThemedText style={[styles.brandInitials, { color: brandColor, fontFamily: "Cairo_700Bold" }]}>
              {initials}
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Feather name="tag" size={14} color={theme.textSecondary} style={styles.infoIcon} />
          <ThemedText style={[styles.infoText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            {make.nameAr ?? make.makeName}
            {make.nameAr ? `  ·  ${make.makeName}` : ""}
          </ThemedText>
        </View>

        {agent.headquartersCity ? (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={14} color={theme.textSecondary} style={styles.infoIcon} />
            <ThemedText style={[styles.infoText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {agent.headquartersCity}
            </ThemedText>
          </View>
        ) : null}

        {agent.phone || agent.website ? (
          <View style={styles.actionsRow}>
            {agent.phone ? (
              <Pressable
                onPress={openPhone}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: theme.primary + "15", opacity: pressed ? 0.7 : 1 },
                ]}
                testID={`button-call-${make.makeId}`}
              >
                <Feather name="phone" size={14} color={theme.primary} />
                <ThemedText style={[styles.actionText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                  {agent.phone}
                </ThemedText>
              </Pressable>
            ) : null}
            {agent.website ? (
              <Pressable
                onPress={openWebsite}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: theme.primary + "15", opacity: pressed ? 0.7 : 1 },
                ]}
                testID={`button-website-${make.makeId}`}
              >
                <Feather name="globe" size={14} color={theme.primary} />
                <ThemedText
                  style={[styles.actionText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}
                  numberOfLines={1}
                >
                  الموقع الإلكتروني
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function EmptyState() {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyState}>
      <Feather name="users" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}>
        لا توجد بيانات وكلاء
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
        لم يتم إضافة معلومات الوكلاء بعد
      </ThemedText>
    </View>
  );
}

export default function CarAgentsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["/api/car-makes"],
    staleTime: 0,
  });

  const agents = useMemo(
    () => (data?.makes ?? []).filter((m) => m.agent !== null),
    [data]
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="wifi-off" size={40} color={theme.textSecondary} />
        <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold", marginTop: Spacing.md }]}>
          تعذر تحميل البيانات
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={agents}
        keyExtractor={(item) => item.makeId}
        renderItem={({ item, index }) => <AgentCard make={item} index={index} />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListHeaderComponent={
          agents.length > 0 ? (
            <ThemedText style={[styles.headerLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
              {agents.length} وكيل معتمد في المملكة العربية السعودية
            </ThemedText>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  list: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  headerLabel: {
    fontSize: 13,
    textAlign: "right",
    marginBottom: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  cardTitles: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  agentName: {
    fontSize: 16,
    textAlign: "right",
  },
  agentNameEn: {
    fontSize: 12,
    textAlign: "right",
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  brandInitials: {
    fontSize: 14,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
  },
  infoIcon: {
    marginLeft: Spacing.xs,
  },
  infoText: {
    fontSize: 13,
    textAlign: "right",
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
  },
  actionText: {
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
