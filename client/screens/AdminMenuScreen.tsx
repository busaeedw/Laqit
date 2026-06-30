import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type AdminRoute =
  | "AdminInspections"
  | "AdminCustomers"
  | "VendorMakes"
  | "AdminDeliveryFailures";

interface AdminAction {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
  target: AdminRoute;
  destructive?: boolean;
}

const ADMIN_ACTIONS: AdminAction[] = [
  {
    id: "admin-orders",
    icon: "clipboard",
    label: "جميع الطلبات",
    description: "استعرض جميع طلبات الفحص في المنصة",
    target: "AdminInspections",
  },
  {
    id: "admin-customers",
    icon: "users",
    label: "إدارة المستخدمين",
    description: "إدارة حسابات العملاء والصلاحيات",
    target: "AdminCustomers",
  },
  {
    id: "admin-vendor-makes",
    icon: "settings",
    label: "إدارة ماركات الموردين",
    description: "حدد ماركات السيارات التي يبيعها كل مورد",
    target: "VendorMakes",
  },
  {
    id: "admin-delivery-failures",
    icon: "alert-triangle",
    label: "إخفاقات الإرسال",
    description: "تابع رسائل البث الفاشلة للموردين",
    target: "AdminDeliveryFailures",
    destructive: true,
  },
];

export default function AdminMenuScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();

  const handlePress = (target: AdminRoute) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(target);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.menuSection, { backgroundColor: theme.backgroundDefault }]}>
        {ADMIN_ACTIONS.map((action, index) => (
          <React.Fragment key={action.id}>
            <Animated.View entering={FadeInDown.duration(400).delay(60 * index)}>
              <Pressable
                testID={`button-${action.id}`}
                onPress={() => handlePress(action.target)}
                style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[
                      styles.menuIcon,
                      {
                        backgroundColor:
                          (action.destructive ? theme.error : theme.primary) + "15",
                      },
                    ]}
                  >
                    <Feather
                      name={action.icon}
                      size={18}
                      color={action.destructive ? theme.error : theme.primary}
                    />
                  </View>
                  <View style={styles.menuItemText}>
                    <ThemedText style={[styles.menuLabel, { fontFamily: "Cairo_600SemiBold" }]}>
                      {action.label}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.menuDescription,
                        { color: theme.textSecondary, fontFamily: "Cairo_400Regular" },
                      ]}
                    >
                      {action.description}
                    </ThemedText>
                  </View>
                </View>
                <Feather name="chevron-left" size={18} color={theme.textSecondary} />
              </Pressable>
            </Animated.View>
            {index < ADMIN_ACTIONS.length - 1 ? (
              <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menuSection: {
    borderRadius: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  menuItemLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.md,
  },
  menuItemText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    textAlign: "right",
  },
  menuDescription: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 2,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.md,
  },
});
