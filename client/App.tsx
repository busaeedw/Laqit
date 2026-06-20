import React, { useEffect, useState } from "react";
import { StyleSheet, I18nManager } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from "@expo-google-fonts/cairo";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import { CustomSplash } from "@/components/CustomSplash";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  console.log("App render", { fontsLoaded, fontError: !!fontError, showSplash });

  useEffect(() => {
    console.log("App effect", { fontsLoaded, fontError: !!fontError });
    if (fontsLoaded || fontError) {
      console.log("Firing timer");
      SplashScreen.hideAsync().catch(() => {});
      const timer = setTimeout(() => {
        console.log("Timer fired, hiding splash");
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    console.log("Fonts not loaded yet, showing splash");
    return (
      <CustomSplash visible={true} />
    );
  }

  console.log("Fonts loaded, rendering app", { showSplash });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <CartProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={styles.root}>
                <KeyboardProvider>
                  <NavigationContainer>
                    <RootStackNavigator />
                  </NavigationContainer>
                  {showSplash && <CustomSplash visible={showSplash} />}
                  <StatusBar style="auto" />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </CartProvider>
        </UserProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
