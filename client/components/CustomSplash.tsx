import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
const splashIcon = require("../../assets/images/splash-icon.png");

interface CustomSplashProps {
  visible: boolean;
}

export function CustomSplash({ visible }: CustomSplashProps) {
  console.log("CustomSplash render visible=", visible);
  const { theme, isDark } = useTheme();

  if (!visible) {
    console.log("CustomSplash: not visible, returning null");
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#1B1B1E" : "#F5F7FA" },
      ]}
    >
      <View style={styles.content}>
        <Image source={splashIcon} style={styles.logo} resizeMode="contain" />
        <ThemedText
          style={[
            styles.title,
            { fontFamily: "Cairo_700Bold", color: theme.text },
          ]}
        >
          لاقط قطع السيارات
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: Spacing.xl,
  },
  logo: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
  },
});
