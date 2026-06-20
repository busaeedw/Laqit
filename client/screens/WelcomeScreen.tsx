import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  SlideInRight,
  SlideInLeft,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { loadItem, storeItem } from "@/lib/secureStorage";

const { width: screenWidth } = Dimensions.get("window");

const ONBOARDING_KEY = "laqit_has_seen_onboarding";

interface Slide {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  color: string;
}

const slides: Slide[] = [
  {
    id: "scan",
    icon: "camera",
    title: "صور سيارتك",
    subtitle: "التقط صور للضرر المرئي وسجل سيارتك بخطوات بسيطة",
    color: "#1E74F2",
  },
  {
    id: "ai",
    icon: "cpu",
    title: "تحديد ذكي للقطع",
    subtitle: "الذكاء الاصطناعي يحدد القطع الخارجية والداخلية ويُرسلها للموردين",
    color: "#10B981",
  },
  {
    id: "quotes",
    icon: "message-circle",
    title: "عروض أسعار فورية",
    subtitle: "احصل على عروض أسعار من موردين موثوقين عبر الواتساب",
    color: "#F59E0B",
  },
];

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const [index, setIndex] = useState(0);
  const [checking, setChecking] = useState(true);
  const directionRef = useRef<"next" | "prev">("next");

  useEffect(() => {
    (async () => {
      try {
        const seen = await loadItem(ONBOARDING_KEY);
        if (seen === "true") {
          navigation.replace("Main");
        } else {
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    })();
  }, []);

  const finish = async () => {
    try {
      await storeItem(ONBOARDING_KEY, "true");
    } catch {}
    navigation.replace("Main");
  };

  const goNext = () => {
    if (index < slides.length - 1) {
      directionRef.current = "next";
      setIndex((i) => i + 1);
    } else {
      finish();
    }
  };

  const goPrev = () => {
    if (index > 0) {
      directionRef.current = "prev";
      setIndex((i) => i - 1);
    }
  };

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const EnterAnimation = directionRef.current === "next" ? SlideInRight : SlideInLeft;

  if (checking) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={{ paddingTop: insets.top + Spacing.lg }} />

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {slides.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === index ? slide.color : theme.backgroundSecondary,
                width: i === index ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Slide content */}
      <Animated.View
        key={slide.id}
        entering={EnterAnimation.duration(400)}
        style={styles.slideContent}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: slide.color + "15" },
          ]}
        >
          <Feather name={slide.icon} size={48} color={slide.color} />
        </View>
        <ThemedText
          style={[
            styles.slideTitle,
            { fontFamily: "Cairo_700Bold", color: theme.text },
          ]}
        >
          {slide.title}
        </ThemedText>
        <ThemedText
          style={[
            styles.slideSubtitle,
            { fontFamily: "Cairo_400Regular", color: theme.textSecondary },
          ]}
        >
          {slide.subtitle}
        </ThemedText>
      </Animated.View>

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable onPress={goPrev} disabled={index === 0} style={styles.navButton}>
          <ThemedText
            style={[
              styles.navButtonText,
              {
                color: index === 0 ? theme.backgroundSecondary : theme.textSecondary,
                fontFamily: "Cairo_600SemiBold",
              },
            ]}
          >
            السابق
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: slide.color,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <ThemedText
            style={[
              styles.actionButtonText,
              { fontFamily: "Cairo_700Bold", color: "#FFFFFF" },
            ]}
          >
            {isLast ? "ابدأ" : "التالي"}
          </ThemedText>
          <Feather
            name={isLast ? "arrow-right" : "arrow-left"}
            size={18}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  slideContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  slideTitle: {
    fontSize: 24,
    textAlign: "center",
  },
  slideSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 300,
  },
  bottomBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  navButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  navButtonText: {
    fontSize: 15,
  },
  actionButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionButtonText: {
    fontSize: 16,
  },
});
