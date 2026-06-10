import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

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
  modelCount?: number;
}

interface ApiResponse {
  makes: CarMake[];
}

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

function BrandAvatar({ name, color }: { name: string; color: string }) {
  const initials = BRAND_INITIALS[name] ?? name.slice(0, 2).toUpperCase();
  return (
    <View style={[styles.avatar, { backgroundColor: color + "15" }]}>
      <ThemedText style={[styles.avatarText, { color, fontFamily: "Cairo_700Bold" }]}>
        {initials}
      </ThemedText>
    </View>
  );
}

type NavProp = NativeStackNavigationProp<RootStackParamList, "CarBrands">;

export default function CarBrandsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();

  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["/api/car-makes"],
  });

  const { data: modelsData } = useQuery<{ models: { makeId: string }[] }>({
    queryKey: ["/api/car-models-count"],
    queryFn: async () => {
      const { getApiUrl } = await import("@/lib/query-client");
      const url = new URL("/api/car-models/counts", getApiUrl());
      const res = await fetch(url.toString());
      if (!res.ok) return { models: [] };
      return res.json();
    },
  });

  const modelCountByMake = useMemo(() => {
    const counts: Record<string, number> = {};
    if (modelsData?.models) {
      modelsData.models.forEach((m: { makeId: string }) => {
        counts[m.makeId] = (counts[m.makeId] ?? 0) + 1;
      });
    }
    return counts;
  }, [modelsData]);

  const filtered = useMemo(() => {
    const makes = data?.makes ?? [];
    if (!search.trim()) return makes;
    const q = search.trim().toLowerCase();
    return makes.filter(
      (m) =>
        m.makeName.toLowerCase().includes(q) ||
        (m.nameAr ?? "").includes(search.trim()) ||
        (m.agent?.agentNameAr ?? "").includes(search.trim()) ||
        (m.agent?.agentNameEn ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const handleRowPress = useCallback(
    (item: CarMake) => {
      navigation.navigate("CarBrandDetail", {
        make: {
          makeId: item.makeId,
          makeName: item.makeName,
          nameAr: item.nameAr ?? null,
          agent: item.agent
            ? {
                agentNameEn: item.agent.agentNameEn,
                agentNameAr: item.agent.agentNameAr ?? null,
                website: item.agent.website ?? null,
                phone: item.agent.phone ?? null,
                headquartersCity: item.agent.headquartersCity ?? null,
              }
            : null,
        },
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CarMake; index: number }) => {
      const color = BRAND_COLORS[item.makeName] ?? theme.primary;
      const count = modelCountByMake[item.makeId];
      return (
        <Animated.View entering={FadeInDown.duration(400).delay(index * 30)}>
          <Pressable
            onPress={() => handleRowPress(item)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: theme.backgroundDefault },
              pressed && { opacity: 0.75 },
            ]}
            testID={`brand-row-${item.makeId}`}
          >
            <BrandAvatar name={item.makeName} color={color} />
            <View style={styles.rowText}>
              <ThemedText style={[styles.nameAr, { fontFamily: "Cairo_700Bold" }]}>
                {item.nameAr ?? item.makeName}
              </ThemedText>
              <ThemedText
                style={[styles.nameEn, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}
              >
                {item.makeName}
              </ThemedText>
              {item.agent?.agentNameAr ? (
                <ThemedText
                  style={[styles.agentName, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}
                  testID={`agent-name-${item.makeId}`}
                >
                  {item.agent.agentNameAr}
                </ThemedText>
              ) : null}
              {item.agent?.website ? (
                <ThemedText style={[styles.websiteLink, { color, fontFamily: "Cairo_400Regular" }]}>
                  {item.agent.website}
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.rowEnd}>
              {count !== undefined ? (
                <View style={[styles.countBadge, { backgroundColor: color + "15" }]}>
                  <ThemedText style={[styles.countText, { color, fontFamily: "Cairo_600SemiBold" }]}>
                    {count}
                  </ThemedText>
                  <ThemedText style={[styles.countLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                    موديل
                  </ThemedText>
                </View>
              ) : null}
              <Feather name="chevron-left" size={16} color={theme.textSecondary} />
            </View>
          </Pressable>
        </Animated.View>
      );
    },
    [theme, modelCountByMake, handleRowPress]
  );

  const headerComponent = useMemo(
    () => (
      <View style={styles.listHeader}>
        <ThemedText style={[styles.countSummary, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
          {filtered.length} ماركة متاحة في المملكة العربية السعودية
        </ThemedText>
      </View>
    ),
    [filtered.length, theme]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.searchBar, { paddingTop: headerHeight + Spacing.md }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text, fontFamily: "Cairo_400Regular" }]}
            placeholder="بحث بالعربي أو الإنجليزي..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
            testID="input-brand-search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.makeId}
          renderItem={renderItem}
          ListHeaderComponent={headerComponent}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: Spacing.lg,
  },
  listHeader: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  countSummary: {
    fontSize: 13,
    textAlign: "right",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  rowText: {
    flex: 1,
    gap: 2,
    alignItems: "flex-end",
  },
  nameAr: {
    fontSize: 16,
    textAlign: "right",
  },
  nameEn: {
    fontSize: 13,
    textAlign: "right",
  },
  agentName: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 1,
  },
  websiteLink: {
    fontSize: 11,
    textAlign: "right",
    textDecorationLine: "underline",
  },
  rowEnd: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  countBadge: {
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    minWidth: 44,
  },
  countText: {
    fontSize: 16,
    lineHeight: 20,
  },
  countLabel: {
    fontSize: 10,
    lineHeight: 14,
  },
  separator: {
    height: Spacing.sm,
  },
});
