import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import InspectionsScreen from "@/screens/InspectionsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type OrdersStackParamList = {
  Inspections: undefined;
};

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export default function OrdersStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Inspections"
        component={InspectionsScreen}
        options={{
          headerTitle: "طلباتي",
        }}
      />
    </Stack.Navigator>
  );
}
