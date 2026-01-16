import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList, CarInfo } from "@/navigation/RootStackNavigator";

type SelectionStep = "make" | "model" | "year";

interface CarMake {
  id: string;
  name: string;
  nameAr: string;
}

interface CarModel {
  id: string;
  makeId: string;
  name: string;
  nameAr: string;
}

const carMakes: CarMake[] = [
  { id: "toyota", name: "Toyota", nameAr: "تويوتا" },
  { id: "honda", name: "Honda", nameAr: "هوندا" },
  { id: "nissan", name: "Nissan", nameAr: "نيسان" },
  { id: "hyundai", name: "Hyundai", nameAr: "هيونداي" },
  { id: "kia", name: "Kia", nameAr: "كيا" },
  { id: "mercedes", name: "Mercedes-Benz", nameAr: "مرسيدس بنز" },
  { id: "bmw", name: "BMW", nameAr: "بي إم دبليو" },
  { id: "lexus", name: "Lexus", nameAr: "لكزس" },
  { id: "chevrolet", name: "Chevrolet", nameAr: "شيفروليه" },
  { id: "ford", name: "Ford", nameAr: "فورد" },
  { id: "gmc", name: "GMC", nameAr: "جي إم سي" },
  { id: "audi", name: "Audi", nameAr: "أودي" },
];

const carModels: CarModel[] = [
  { id: "camry", makeId: "toyota", name: "Camry", nameAr: "كامري" },
  { id: "corolla", makeId: "toyota", name: "Corolla", nameAr: "كورولا" },
  { id: "landcruiser", makeId: "toyota", name: "Land Cruiser", nameAr: "لاند كروزر" },
  { id: "hilux", makeId: "toyota", name: "Hilux", nameAr: "هايلكس" },
  { id: "rav4", makeId: "toyota", name: "RAV4", nameAr: "راف فور" },
  { id: "accord", makeId: "honda", name: "Accord", nameAr: "أكورد" },
  { id: "civic", makeId: "honda", name: "Civic", nameAr: "سيفيك" },
  { id: "crv", makeId: "honda", name: "CR-V", nameAr: "سي آر في" },
  { id: "altima", makeId: "nissan", name: "Altima", nameAr: "ألتيما" },
  { id: "patrol", makeId: "nissan", name: "Patrol", nameAr: "باترول" },
  { id: "elantra", makeId: "hyundai", name: "Elantra", nameAr: "إلنترا" },
  { id: "sonata", makeId: "hyundai", name: "Sonata", nameAr: "سوناتا" },
  { id: "tucson", makeId: "hyundai", name: "Tucson", nameAr: "توسان" },
  { id: "optima", makeId: "kia", name: "Optima", nameAr: "أوبتيما" },
  { id: "sportage", makeId: "kia", name: "Sportage", nameAr: "سبورتاج" },
  { id: "eclass", makeId: "mercedes", name: "E-Class", nameAr: "الفئة E" },
  { id: "sclass", makeId: "mercedes", name: "S-Class", nameAr: "الفئة S" },
  { id: "series3", makeId: "bmw", name: "3 Series", nameAr: "الفئة 3" },
  { id: "series5", makeId: "bmw", name: "5 Series", nameAr: "الفئة 5" },
  { id: "x5", makeId: "bmw", name: "X5", nameAr: "إكس 5" },
  { id: "es", makeId: "lexus", name: "ES", nameAr: "إي إس" },
  { id: "lx", makeId: "lexus", name: "LX", nameAr: "إل إكس" },
  { id: "tahoe", makeId: "chevrolet", name: "Tahoe", nameAr: "تاهو" },
  { id: "silverado", makeId: "chevrolet", name: "Silverado", nameAr: "سيلفرادو" },
  { id: "expedition", makeId: "ford", name: "Expedition", nameAr: "إكسبدشن" },
  { id: "yukon", makeId: "gmc", name: "Yukon", nameAr: "يوكن" },
  { id: "a4", makeId: "audi", name: "A4", nameAr: "أيه 4" },
  { id: "q7", makeId: "audi", name: "Q7", nameAr: "كيو 7" },
];

const years = Array.from({ length: 25 }, (_, i) => (2025 - i).toString());

export default function CarSelectionScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();

  const [step, setStep] = useState<SelectionStep>("make");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMake, setSelectedMake] = useState<CarMake | null>(null);
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null);

  const filteredMakes = useMemo(() => {
    if (!searchQuery) return carMakes;
    const query = searchQuery.toLowerCase();
    return carMakes.filter(
      (make) =>
        make.name.toLowerCase().includes(query) ||
        make.nameAr.includes(searchQuery)
    );
  }, [searchQuery]);

  const filteredModels = useMemo(() => {
    if (!selectedMake) return [];
    const models = carModels.filter((m) => m.makeId === selectedMake.id);
    if (!searchQuery) return models;
    const query = searchQuery.toLowerCase();
    return models.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.nameAr.includes(searchQuery)
    );
  }, [selectedMake, searchQuery]);

  const handleSelectMake = (make: CarMake) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMake(make);
    setSearchQuery("");
    setStep("model");
  };

  const handleSelectModel = (model: CarModel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedModel(model);
    setSearchQuery("");
    setStep("year");
  };

  const handleSelectYear = (year: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedMake && selectedModel) {
      const carInfo: CarInfo = {
        make: selectedMake.name,
        makeAr: selectedMake.nameAr,
        model: selectedModel.name,
        modelAr: selectedModel.nameAr,
        year,
      };
      navigation.navigate("Camera", { carInfo });
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === "model") {
      setStep("make");
      setSelectedMake(null);
    } else if (step === "year") {
      setStep("model");
      setSelectedModel(null);
    }
    setSearchQuery("");
  };

  const getTitle = () => {
    switch (step) {
      case "make":
        return "اختر الشركة المصنعة";
      case "model":
        return `اختر موديل ${selectedMake?.nameAr}`;
      case "year":
        return "اختر سنة الصنع";
    }
  };

  const renderItem = ({ item }: { item: CarMake | CarModel | string }) => {
    if (typeof item === "string") {
      return (
        <Pressable
          onPress={() => handleSelectYear(item)}
          style={({ pressed }) => [
            styles.item,
            { 
              backgroundColor: theme.backgroundDefault,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.itemText, { fontFamily: "Cairo_600SemiBold" }]}>
            {item}
          </ThemedText>
          <Feather name="chevron-left" size={20} color={theme.textSecondary} />
        </Pressable>
      );
    }

    const isModel = "makeId" in item;
    return (
      <Pressable
        onPress={() => isModel ? handleSelectModel(item as CarModel) : handleSelectMake(item as CarMake)}
        style={({ pressed }) => [
          styles.item,
          { 
            backgroundColor: theme.backgroundDefault,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={styles.itemContent}>
          <ThemedText style={[styles.itemText, { fontFamily: "Cairo_600SemiBold" }]}>
            {item.nameAr}
          </ThemedText>
          <ThemedText style={[styles.itemSubtext, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            {item.name}
          </ThemedText>
        </View>
        <Feather name="chevron-left" size={20} color={theme.textSecondary} />
      </Pressable>
    );
  };

  const getData = () => {
    switch (step) {
      case "make":
        return filteredMakes;
      case "model":
        return filteredModels;
      case "year":
        return years;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: headerHeight + Spacing.md }]}>
        {step !== "make" && (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="chevron-right" size={24} color={theme.text} />
          </Pressable>
        )}
        <ThemedText style={[styles.title, { fontFamily: "Cairo_700Bold" }]}>
          {getTitle()}
        </ThemedText>
      </View>

      {step !== "year" && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text, fontFamily: "Cairo_400Regular" }]}
              placeholder="بحث..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
          </View>
        </View>
      )}

      <FlatList
        data={getData()}
        keyExtractor={(item) => typeof item === "string" ? item : item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: 18,
    flex: 1,
    textAlign: "right",
  },
  searchContainer: {
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
    fontSize: 16,
    height: "100%",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  item: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  itemContent: {
    gap: 2,
  },
  itemText: {
    fontSize: 16,
    textAlign: "right",
  },
  itemSubtext: {
    fontSize: 13,
    textAlign: "right",
  },
  separator: {
    height: Spacing.sm,
  },
});
