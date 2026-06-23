import React, { lazy, Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import MainTabNavigator from "@/navigation/MainTabNavigator";

const CameraScreen = lazy(() => import("@/screens/CameraScreen"));
const CarSelectionScreen = lazy(() => import("@/screens/CarSelectionScreen"));
const AnalysisScreen = lazy(() => import("@/screens/AnalysisScreen"));
const ResultsScreen = lazy(() => import("@/screens/ResultsScreen"));
const CartScreen = lazy(() => import("@/screens/CartScreen"));
const PricingScreen = lazy(() => import("@/screens/PricingScreen"));
const ExpertScreen = lazy(() => import("@/screens/ExpertScreen"));
const NewInspectionScreen = lazy(() => import("@/screens/NewInspectionScreen"));
const InspectionDetailScreen = lazy(() => import("@/screens/InspectionDetailScreen"));
const QuotesListScreen = lazy(() => import("@/screens/QuotesListScreen"));
const CarBrandsScreen = lazy(() => import("@/screens/CarBrandsScreen"));
const CarBrandDetailScreen = lazy(() => import("@/screens/CarBrandDetailScreen"));
const CarAgentsScreen = lazy(() => import("@/screens/CarAgentsScreen"));
const VendorsScreen = lazy(() => import("@/screens/VendorsScreen"));
const WelcomeScreen = lazy(() => import("@/screens/WelcomeScreen"));

function ScreenFallback() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#1E74F2" />
    </View>
  );
}

function withSuspense<T extends object>(Component: React.ComponentType<T>) {
  return function SuspenseWrapper(props: T) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

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
  primaryUse: string;
  primaryUseAr: string;
  price: number;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  category?: "external" | "internal";
  inferred?: boolean;
  condition?: string;
  conditionAr?: string;
};

export type AgentInfo = {
  agentNameEn: string;
  agentNameAr: string | null;
  website: string | null;
  phone: string | null;
  headquartersCity: string | null;
};

export type CarMakeParam = {
  makeId: string;
  makeName: string;
  nameAr: string | null;
  agent: AgentInfo | null;
};

export type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
  Camera: {
    carInfo?: CarInfo;
    onSelectCar?: (car: CarInfo) => void;
    onAnalyzeParts?: (imageUri: string) => void;
  } | undefined;
  CarSelection: { onSelect?: (car: CarInfo) => void } | undefined;
  Analysis: { imageUri: string; carInfo?: CarInfo };
  Results: { imageUri: string; carInfo: CarInfo; parts: DetectedPart[] };
  Cart: undefined;
  Pricing: undefined;
  Expert: { partName?: string } | undefined;
  NewInspection: undefined;
  InspectionDetail: { inspectionId: string };
  QuotesList: { inspectionId: string };
  CarBrands: undefined;
  CarBrandDetail: { make: CarMakeParam };
  CarAgents: undefined;
  Vendors: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Welcome"
        component={withSuspense(WelcomeScreen)}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Camera"
        component={withSuspense(CameraScreen)}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="CarSelection"
        component={withSuspense(CarSelectionScreen)}
        options={{
          presentation: "modal",
          headerTitle: "اختر السيارة",
        }}
      />
      <Stack.Screen
        name="Analysis"
        component={withSuspense(AnalysisScreen)}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Results"
        component={withSuspense(ResultsScreen)}
        options={{
          headerTitle: "نتائج الفحص",
        }}
      />
      <Stack.Screen
        name="Cart"
        component={withSuspense(CartScreen)}
        options={{
          presentation: "modal",
          headerTitle: "السلة",
        }}
      />
      <Stack.Screen
        name="Pricing"
        component={withSuspense(PricingScreen)}
        options={{
          headerTitle: "الباقات والأسعار",
        }}
      />
      <Stack.Screen
        name="Expert"
        component={withSuspense(ExpertScreen)}
        options={{
          presentation: "modal",
          headerTitle: "تواصل مع خبير",
        }}
      />
      <Stack.Screen
        name="NewInspection"
        component={withSuspense(NewInspectionScreen)}
        options={({ navigation }) => ({
          headerTitle: "طلب عرض سعر جديد",
          headerLeft: () => (
            <HeaderButton onPress={() => navigation.navigate("Main")}>
              <Feather name="x" size={22} color="#1E74F2" />
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="InspectionDetail"
        component={withSuspense(InspectionDetailScreen)}
        options={{
          headerTitle: "تفاصيل الطلب",
        }}
      />
      <Stack.Screen
        name="QuotesList"
        component={withSuspense(QuotesListScreen)}
        options={{
          headerTitle: "عروض الأسعار",
        }}
      />
      <Stack.Screen
        name="CarBrands"
        component={withSuspense(CarBrandsScreen)}
        options={{
          headerTitle: "علامات السيارات",
        }}
      />
      <Stack.Screen
        name="CarBrandDetail"
        component={withSuspense(CarBrandDetailScreen)}
        options={({ route }) => ({
          headerTitle: route.params.make.nameAr ?? route.params.make.makeName,
        })}
      />
      <Stack.Screen
        name="CarAgents"
        component={withSuspense(CarAgentsScreen)}
        options={{ headerTitle: "وكلاء السيارات" }}
      />
      <Stack.Screen
        name="Vendors"
        component={withSuspense(VendorsScreen)}
        options={{ headerTitle: "تجار قطع الغيار" }}
      />
    </Stack.Navigator>
  );
}
