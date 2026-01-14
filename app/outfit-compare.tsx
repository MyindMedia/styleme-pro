import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { ClothingItem, WearLog, getClothingItems, getWearLogs } from "@/lib/storage";

const { width: _width } = Dimensions.get("window");
const SELFIE_STORAGE_KEY = "fitcheck_outfit_selfies";

interface OutfitSelfie {
  id: string;
  imageUri: string;
  wearLogId?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

async function getSelfies(): Promise<OutfitSelfie[]> {
  try {
    const data = await AsyncStorage.getItem(SELFIE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export default function OutfitCompareScreen() {
  const colors = useColors();
  const router = useRouter();

  const [selfies, setSelfies] = useState<OutfitSelfie[]>([]);
  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [leftSelfie, setLeftSelfie] = useState<OutfitSelfie | null>(null);
  const [rightSelfie, setRightSelfie] = useState<OutfitSelfie | null>(null);
  const [showPicker, setShowPicker] = useState<"left" | "right" | null>(null);

  const loadData = useCallback(async () => {
    const [selfieData, logs, items] = await Promise.all([
      getSelfies(),
      getWearLogs(),
      getClothingItems(),
    ]);
    setSelfies(selfieData);
    setWearLogs(logs);
    setClosetItems(items);

    // Auto-select first two selfies if available
    if (selfieData.length >= 2) {
      setLeftSelfie(selfieData[0]);
      setRightSelfie(selfieData[1]);
    } else if (selfieData.length === 1) {
      setLeftSelfie(selfieData[0]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getOutfitForSelfie = (selfie: OutfitSelfie | null) => {
    if (!selfie?.wearLogId) return null;
    const log = wearLogs.find(l => l.id === selfie.wearLogId);
    if (!log) return null;
    return closetItems.filter(item => log.itemIds.includes(item.id));
  };

  const handleSelectSelfie = (selfie: OutfitSelfie) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (showPicker === "left") {
      setLeftSelfie(selfie);
    } else {
      setRightSelfie(selfie);
    }
    setShowPicker(null);
  };

  const handleSwap = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const temp = leftSelfie;
    setLeftSelfie(rightSelfie);
    setRightSelfie(temp);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysBetween = () => {
    if (!leftSelfie || !rightSelfie) return null;
    const left = new Date(leftSelfie.date);
    const right = new Date(rightSelfie.date);
    const diff = Math.abs(left.getTime() - right.getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const leftOutfit = getOutfitForSelfie(leftSelfie);
  const rightOutfit = getOutfitForSelfie(rightSelfie);
  const daysBetween = getDaysBetween();

  const renderCompareSlot = (
    selfie: OutfitSelfie | null,
    outfit: ClothingItem[] | null,
    side: "left" | "right"
  ) => (
    <View style={styles.compareSlot}>
      {selfie ? (
        <>
          <Pressable
            onPress={() => setShowPicker(side)}
            style={({ pressed }) => [
              styles.selfieContainer,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Image
              source={{ uri: selfie.imageUri }}
              style={styles.selfieImage}
              contentFit="cover"
            />
            <View style={[styles.dateOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
              <Text style={styles.dateText}>{formatDate(selfie.date)}</Text>
            </View>
            <View style={[styles.changeButton, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="swap-horiz" size={16} color={colors.foreground} />
            </View>
          </Pressable>

          {outfit && outfit.length > 0 && (
            <View style={styles.outfitPreview}>
              <Text style={[styles.outfitLabel, { color: colors.muted }]}>
                {outfit.length} items
              </Text>
              <View style={styles.outfitThumbs}>
                {outfit.slice(0, 4).map(item => (
                  <Image
                    key={item.id}
                    source={{ uri: item.imageUri }}
                    style={styles.outfitThumb}
                    contentFit="cover"
                  />
                ))}
              </View>
            </View>
          )}
        </>
      ) : (
        <Pressable
          onPress={() => setShowPicker(side)}
          style={[styles.emptySlot, { backgroundColor: colors.surface }]}
        >
          <MaterialIcons name="add-photo-alternate" size={40} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Select Selfie
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Compare Outfits
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {selfies.length < 2 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="compare" size={64} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Need More Selfies
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Take at least 2 outfit selfies to compare your style evolution
            </Text>
            <Pressable
              onPress={() => router.push("/selfie-capture" as any)}
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="add-a-photo" size={20} color={colors.background} />
              <Text style={[styles.emptyButtonText, { color: colors.background }]}>
                Take Selfie
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Compare View */}
            <View style={styles.compareContainer}>
              {renderCompareSlot(leftSelfie, leftOutfit, "left")}
              
              {/* Swap Button */}
              <Pressable
                onPress={handleSwap}
                style={[styles.swapButton, { backgroundColor: colors.primary }]}
              >
                <MaterialIcons name="swap-horiz" size={24} color={colors.background} />
              </Pressable>
              
              {renderCompareSlot(rightSelfie, rightOutfit, "right")}
            </View>

            {/* Time Difference */}
            {daysBetween !== null && (
              <View style={[styles.timeDiff, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="schedule" size={18} color={colors.primary} />
                <Text style={[styles.timeDiffText, { color: colors.foreground }]}>
                  {daysBetween === 0
                    ? "Same day"
                    : daysBetween === 1
                    ? "1 day apart"
                    : `${daysBetween} days apart`}
                </Text>
              </View>
            )}

            {/* Comparison Insights */}
            {leftOutfit && rightOutfit && (
              <View style={styles.insightsSection}>
                <Text style={[styles.insightsTitle, { color: colors.foreground }]}>
                  Style Insights
                </Text>

                {/* Shared Items */}
                {(() => {
                  const sharedItems = leftOutfit.filter(item =>
                    rightOutfit.some(r => r.id === item.id)
                  );
                  if (sharedItems.length > 0) {
                    return (
                      <View style={[styles.insightCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.insightHeader}>
                          <MaterialIcons name="link" size={20} color={colors.primary} />
                          <Text style={[styles.insightLabel, { color: colors.foreground }]}>
                            Shared Items ({sharedItems.length})
                          </Text>
                        </View>
                        <View style={styles.sharedItems}>
                          {sharedItems.map(item => (
                            <View key={item.id} style={styles.sharedItem}>
                              <Image
                                source={{ uri: item.imageUri }}
                                style={styles.sharedItemImage}
                                contentFit="cover"
                              />
                              <Text
                                style={[styles.sharedItemName, { color: colors.muted }]}
                                numberOfLines={1}
                              >
                                {item.brand || item.type}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Category Comparison */}
                <View style={[styles.insightCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.insightHeader}>
                    <MaterialIcons name="category" size={20} color={colors.primary} />
                    <Text style={[styles.insightLabel, { color: colors.foreground }]}>
                      Categories
                    </Text>
                  </View>
                  <View style={styles.categoryComparison}>
                    <View style={styles.categoryColumn}>
                      <Text style={[styles.categoryDate, { color: colors.muted }]}>
                        {leftSelfie && formatDate(leftSelfie.date)}
                      </Text>
                      {leftOutfit.map(item => (
                        <Text key={item.id} style={[styles.categoryItem, { color: colors.foreground }]}>
                          • {item.type}
                        </Text>
                      ))}
                    </View>
                    <View style={[styles.categoryDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.categoryColumn}>
                      <Text style={[styles.categoryDate, { color: colors.muted }]}>
                        {rightSelfie && formatDate(rightSelfie.date)}
                      </Text>
                      {rightOutfit.map(item => (
                        <Text key={item.id} style={[styles.categoryItem, { color: colors.foreground }]}>
                          • {item.type}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Total Value */}
                <View style={[styles.insightCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.insightHeader}>
                    <MaterialIcons name="attach-money" size={20} color={colors.success} />
                    <Text style={[styles.insightLabel, { color: colors.foreground }]}>
                      Outfit Value
                    </Text>
                  </View>
                  <View style={styles.valueComparison}>
                    <View style={styles.valueColumn}>
                      <Text style={[styles.valueAmount, { color: colors.foreground }]}>
                        ${leftOutfit.reduce((sum, item) => sum + (item.purchasePrice || 0), 0).toFixed(0)}
                      </Text>
                      <Text style={[styles.valueLabel, { color: colors.muted }]}>
                        {leftOutfit.length} items
                      </Text>
                    </View>
                    <Text style={[styles.vsText, { color: colors.muted }]}>vs</Text>
                    <View style={styles.valueColumn}>
                      <Text style={[styles.valueAmount, { color: colors.foreground }]}>
                        ${rightOutfit.reduce((sum, item) => sum + (item.purchasePrice || 0), 0).toFixed(0)}
                      </Text>
                      <Text style={[styles.valueLabel, { color: colors.muted }]}>
                        {rightOutfit.length} items
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Browse More */}
            <Pressable
              onPress={() => router.push("/selfie-gallery" as any)}
              style={[styles.browseButton, { borderColor: colors.border }]}
            >
              <MaterialIcons name="photo-library" size={20} color={colors.foreground} />
              <Text style={[styles.browseButtonText, { color: colors.foreground }]}>
                Browse All Selfies
              </Text>
            </Pressable>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Selfie Picker Modal */}
      <Modal
        visible={showPicker !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowPicker(null)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Select Selfie
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={selfies}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.pickerGrid}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectSelfie(item)}
                style={({ pressed }) => [
                  styles.pickerItem,
                  { opacity: pressed ? 0.8 : 1 },
                  (item.id === leftSelfie?.id || item.id === rightSelfie?.id) && {
                    borderWidth: 3,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.pickerImage}
                  contentFit="cover"
                />
                <View style={[styles.pickerDate, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                  <Text style={styles.pickerDateText}>
                    {new Date(item.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  compareContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  compareSlot: {
    flex: 1,
  },
  selfieContainer: {
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  selfieImage: {
    width: "100%",
    height: "100%",
  },
  dateOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  dateText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  changeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 16,
  },
  emptySlot: {
    aspectRatio: 3 / 4,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  swapButton: {
    position: "absolute",
    left: "50%",
    top: "40%",
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  outfitPreview: {
    marginTop: 8,
  },
  outfitLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  outfitThumbs: {
    flexDirection: "row",
    gap: 4,
  },
  outfitThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  timeDiff: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  timeDiffText: {
    fontSize: 14,
    fontWeight: "500",
  },
  insightsSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  insightCard: {
    padding: 16,
    borderRadius: 16,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  sharedItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sharedItem: {
    alignItems: "center",
    width: 60,
  },
  sharedItemImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  sharedItemName: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },
  categoryComparison: {
    flexDirection: "row",
  },
  categoryColumn: {
    flex: 1,
  },
  categoryDate: {
    fontSize: 11,
    marginBottom: 8,
  },
  categoryItem: {
    fontSize: 13,
    marginBottom: 4,
  },
  categoryDivider: {
    width: 1,
    marginHorizontal: 12,
  },
  valueComparison: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  valueColumn: {
    alignItems: "center",
  },
  valueAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
  valueLabel: {
    fontSize: 12,
  },
  vsText: {
    fontSize: 14,
    fontWeight: "600",
  },
  browseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  pickerGrid: {
    padding: 8,
  },
  pickerItem: {
    flex: 1 / 3,
    aspectRatio: 3 / 4,
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  pickerImage: {
    width: "100%",
    height: "100%",
  },
  pickerDate: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
  },
  pickerDateText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
