import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useCart, CartItem } from "@/context/CartContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();

  const handleCheckout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearCart();
    navigation.goBack();
  };

  const handleUpdateQuantity = (id: string, delta: number, currentQty: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQuantity(id, currentQty + delta);
  };

  const handleRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeItem(id);
  };

  const renderEmptyState = () => (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="shopping-cart" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { fontFamily: "Cairo_700Bold" }]}>
        السلة فارغة
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
        أضف قطع غيار لسيارتك لإتمام الطلب
      </ThemedText>
      <Button onPress={() => navigation.goBack()} style={styles.continueButton}>
        متابعة التسوق
      </Button>
    </Animated.View>
  );

  const renderItem = ({ item, index }: { item: CartItem; index: number }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(100 * index)}>
      <View style={[styles.cartItem, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemIcon, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="box" size={20} color={theme.primary} />
          </View>
          <View style={styles.itemInfo}>
            <ThemedText style={[styles.itemName, { fontFamily: "Cairo_700Bold" }]}>
              {item.nameAr}
            </ThemedText>
            <ThemedText style={[styles.itemPrice, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
              {item.price} ريال
            </ThemedText>
          </View>
          <Pressable
            onPress={() => handleRemove(item.id)}
            style={[styles.removeButton, { backgroundColor: theme.error + "15" }]}
          >
            <Feather name="trash-2" size={16} color={theme.error} />
          </Pressable>
        </View>
        <View style={styles.quantityRow}>
          <View style={styles.quantityControls}>
            <Pressable
              onPress={() => handleUpdateQuantity(item.id, -1, item.quantity)}
              style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="minus" size={18} color={theme.text} />
            </Pressable>
            <ThemedText style={[styles.quantityText, { fontFamily: "Cairo_700Bold" }]}>
              {item.quantity}
            </ThemedText>
            <Pressable
              onPress={() => handleUpdateQuantity(item.id, 1, item.quantity)}
              style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="plus" size={18} color={theme.text} />
            </Pressable>
          </View>
          <ThemedText style={[styles.itemTotal, { fontFamily: "Cairo_700Bold" }]}>
            {item.price * item.quantity} ريال
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingHorizontal: Spacing.lg,
          paddingBottom: 180,
        }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />

      <View
        style={[
          styles.summaryContainer,
          { 
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            المجموع الفرعي
          </ThemedText>
          <ThemedText style={[styles.summaryValue, { fontFamily: "Cairo_600SemiBold" }]}>
            {total} ريال
          </ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
            الشحن
          </ThemedText>
          <ThemedText style={[styles.summaryValue, { color: theme.success, fontFamily: "Cairo_600SemiBold" }]}>
            مجاني
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryRow}>
          <ThemedText style={[styles.totalLabel, { fontFamily: "Cairo_700Bold" }]}>
            الإجمالي
          </ThemedText>
          <ThemedText style={[styles.totalValue, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
            {total} ريال
          </ThemedText>
        </View>
        <Button onPress={handleCheckout} style={styles.checkoutButton}>
          إتمام الطلب
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing["3xl"],
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  continueButton: {
    width: "100%",
    marginTop: Spacing.lg,
  },
  cartItem: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  itemHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.md,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    textAlign: "right",
  },
  itemPrice: {
    fontSize: 14,
    textAlign: "right",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantityControls: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.md,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 16,
    minWidth: 24,
    textAlign: "center",
  },
  itemTotal: {
    fontSize: 16,
  },
  summaryContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 18,
  },
  checkoutButton: {
    marginTop: Spacing.sm,
  },
});
