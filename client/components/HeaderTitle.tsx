import React from "react";
import { View, Image, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";

const logoImage = require("../../assets/images/logo-header.png");

interface HeaderTitleProps {
  title: string;
  showLogo?: boolean;
}

export function HeaderTitle({ title, showLogo = false }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      {showLogo ? (
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
      ) : null}
      <ThemedText style={styles.title}>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Cairo_700Bold",
  },
  logo: {
    width: 44,
    height: 44,
  },
});
