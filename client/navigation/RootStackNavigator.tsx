import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import CameraScreen from "@/screens/CameraScreen";
import CarSelectionScreen from "@/screens/CarSelectionScreen";
import AnalysisScreen from "@/screens/AnalysisScreen";
import ResultsScreen from "@/screens/ResultsScreen";
import CartScreen from "@/screens/CartScreen";
import PricingScreen from "@/screens/PricingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CarInfo = {
  make: string;
  makeAr: string;
  model: string;
  modelAr: string;
  year: string;
};

export type DetectedPart = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  boundingBox: { x: number; y: number; width: number; height: number };
};

export type RootStackParamList = {
  Main: undefined;
  Camera: { carInfo?: CarInfo } | undefined;
  CarSelection: { onSelect?: (car: CarInfo) => void } | undefined;
  Analysis: { imageUri: string; carInfo?: CarInfo };
  Results: { imageUri: string; carInfo: CarInfo; parts: DetectedPart[] };
  Cart: undefined;
  Pricing: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ 
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="CarSelection"
        component={CarSelectionScreen}
        options={{
          presentation: "modal",
          headerTitle: "اختر السيارة",
        }}
      />
      <Stack.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{ 
          headerShown: false,
          presentation: "fullScreenModal",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{
          headerTitle: "نتائج الفحص",
        }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{
          presentation: "modal",
          headerTitle: "السلة",
        }}
      />
      <Stack.Screen
        name="Pricing"
        component={PricingScreen}
        options={{
          headerTitle: "الباقات والأسعار",
        }}
      />
    </Stack.Navigator>
  );
}
