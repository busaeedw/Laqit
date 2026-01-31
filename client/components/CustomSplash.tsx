import React from "react";
import { View, Image, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
const splashIcon = require("../../assets/images/splash-icon.png");

interface CustomSplashProps {
  visible: boolean;
}

export function CustomSplash({ visible }: CustomSplashProps) {
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(500)}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
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
