import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "@/screens/HomeScreen";
import OrderScreen from "@/screens/OrderScreen";
import PricingScreen from "@/screens/PricingScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type HomeStackParamList = {
  Home: undefined;
  Order: undefined;
  Pricing: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HeaderTitle title="لاقط قطع السيارات" showLogo />,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="Order"
        component={OrderScreen}
        options={{
          headerTitle: () => <HeaderTitle title="طلب قطع غيار" />,
        }}
      />
      <Stack.Screen
        name="Pricing"
        component={PricingScreen}
        options={{
          headerTitle: () => <HeaderTitle title="الباقات" />,
        }}
      />
    </Stack.Navigator>
  );
}
