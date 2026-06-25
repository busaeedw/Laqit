import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@/context/UserContext";
import { Colors, Fonts, Spacing } from "@/constants/theme";

export function OfflineBanner() {
  const { isOffline } = useUser();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  const bannerHeight = 40 + insets.top;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-bannerHeight, 0],
  });

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top, height: bannerHeight },
        { transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>لا يوجد اتصال بالإنترنت</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.error,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: Spacing.sm,
    zIndex: 9999,
  },
  text: {
    color: "#FFFFFF",
    fontFamily: Fonts.default.arabic,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
