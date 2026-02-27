import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { useUser } from "@/context/UserContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, "QuotesList">;

export default function QuotesListScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { inspectionId } = route.params;
  const { theme } = useTheme();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const apiUrl = getApiUrl();

  const [selectedQuoteImage, setSelectedQuoteImage] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ quotes: any[] }>({
    queryKey: [`/api/laqit-inspections/${inspectionId}/quotes`],
  });

  const quotes = data?.quotes ?? [];

  const handleAccept = async (quoteId: string) => {
    Alert.alert(
      "تأكيد القبول",
      "هل تريد قبول هذا العرض؟ سيُرفض باقي العروض.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "قبول",
          onPress: async () => {
            setAccepting(quoteId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              const resp = await fetch(
                new URL(
                  `/api/laqit-inspections/${inspectionId}/quotes/${quoteId}/accept`,
                  apiUrl
                ).toString(),
                { method: "POST" }
              );
              if (resp.ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await refetch();
                queryClient.invalidateQueries({ queryKey: [`/api/laqit-inspections/${inspectionId}`] });
                navigation.navigate("InspectionDetail", { inspectionId });
              } else {
                Alert.alert("خطأ", "فشل قبول العرض");
              }
            } catch {
              Alert.alert("خطأ", "حدث خطأ في الاتصال");
            } finally {
              setAccepting(null);
            }
          },
        },
      ]
    );
  };

  const renderQuote = ({ item }: { item: any }) => {
    const isAccepted = item.status === "accepted";
    const isRejected = item.status === "rejected";

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isAccepted ? theme.success : isRejected ? theme.border : "transparent",
            borderWidth: isAccepted ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <ThemedText style={[styles.vendorName, { fontFamily: "Cairo_700Bold" }]}>
            {item.vendorName || "مورد"}
          </ThemedText>
          {isAccepted && (
            <View style={[styles.acceptedBadge, { backgroundColor: theme.success + "20" }]}>
              <Feather name="check-circle" size={13} color={theme.success} />
              <ThemedText style={[styles.acceptedText, { color: theme.success, fontFamily: "Cairo_600SemiBold" }]}>
                مقبول
              </ThemedText>
            </View>
          )}
        </View>

        {item.totalAmount ? (
          <ThemedText style={[styles.total, { color: theme.primary, fontFamily: "Cairo_700Bold" }]}>
            {Number(item.totalAmount).toLocaleString("ar-SA")} {item.currency}
          </ThemedText>
        ) : (
          <ThemedText style={[styles.unparsed, { color: theme.warning, fontFamily: "Cairo_400Regular" }]}>
            لم يتمكن النظام من استخراج الإجمالي — راجع الصورة
          </ThemedText>
        )}

        <View style={styles.cardActions}>
          {item.quoteImageUrl && (
            <Pressable
              onPress={() => setSelectedQuoteImage(item.quoteImageUrl)}
              style={[styles.viewImageBtn, { borderColor: theme.border }]}
            >
              <Feather name="image" size={15} color={theme.primary} />
              <ThemedText style={[styles.viewImageText, { color: theme.primary, fontFamily: "Cairo_600SemiBold" }]}>
                عرض الصورة
              </ThemedText>
            </Pressable>
          )}

          {!isAccepted && !isRejected && (
            <Pressable
              onPress={() => handleAccept(item.quoteId)}
              disabled={accepting === item.quoteId}
              style={[styles.acceptBtn, { backgroundColor: theme.success }]}
            >
              {accepting === item.quoteId ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={[styles.acceptBtnText, { fontFamily: "Cairo_700Bold" }]}>
                  قبول العرض
                </ThemedText>
              )}
            </Pressable>
          )}
        </View>

        <ThemedText style={[styles.dateText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
          {new Date(item.createdAt).toLocaleString("ar-SA")}
        </ThemedText>
      </View>
    );
  };

  return (
    <>
      <FlatList
        style={[styles.list, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["4xl"],
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={quotes}
        keyExtractor={(item) => item.quoteId}
        renderItem={renderQuote}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing["3xl"] }} />
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Cairo_400Regular" }]}>
                لا توجد عروض بعد
              </ThemedText>
            </View>
          ) : null
        }
      />

      {/* Quote image modal */}
      <Modal
        visible={selectedQuoteImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedQuoteImage(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedQuoteImage(null)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable
              onPress={() => setSelectedQuoteImage(null)}
              style={[styles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={22} color={theme.text} />
            </Pressable>
            {selectedQuoteImage && (
              <Image
                source={{ uri: selectedQuoteImage }}
                style={styles.quoteImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  vendorName: { fontSize: 16, textAlign: "right" },
  acceptedBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  acceptedText: { fontSize: 12 },
  total: { fontSize: 24, textAlign: "right" },
  unparsed: { fontSize: 13, textAlign: "right" },
  cardActions: { flexDirection: "row-reverse", gap: Spacing.md, alignItems: "center" },
  viewImageBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  viewImageText: { fontSize: 13 },
  acceptBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  acceptBtnText: { color: "#fff", fontSize: 14 },
  dateText: { fontSize: 12, textAlign: "right" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md, marginTop: Spacing["4xl"] },
  emptyText: { fontSize: 15, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "92%", borderRadius: BorderRadius.lg, overflow: "hidden", position: "relative" },
  closeBtn: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  quoteImage: { width: "100%", height: 500 },
});
