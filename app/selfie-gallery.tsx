import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { ClothingItem, WearLog, getClothingItems, getWearLogs } from "@/lib/storage";

const { width } = Dimensions.get("window");
const SELFIE_STORAGE_KEY = "fitcheck_outfit_selfies";

interface OutfitSelfie {
  id: string;
  imageUri: string;
  wearLogId?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

interface GroupedSelfies {
  month: string;
  year: number;
  selfies: OutfitSelfie[];
}

async function getSelfies(): Promise<OutfitSelfie[]> {
  try {
    const data = await AsyncStorage.getItem(SELFIE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function deleteSelfie(id: string): Promise<void> {
  const selfies = await getSelfies();
  const filtered = selfies.filter(s => s.id !== id);
  await AsyncStorage.setItem(SELFIE_STORAGE_KEY, JSON.stringify(filtered));
}

export default function SelfieGalleryScreen() {
  const colors = useColors();
  const router = useRouter();
  
  const [selfies, setSelfies] = useState<OutfitSelfie[]>([]);
  const [groupedSelfies, setGroupedSelfies] = useState<GroupedSelfies[]>([]);
  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [selectedSelfie, setSelectedSelfie] = useState<OutfitSelfie | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");

  const loadData = useCallback(async () => {
    const [selfieData, logs, items] = await Promise.all([
      getSelfies(),
      getWearLogs(),
      getClothingItems(),
    ]);
    setSelfies(selfieData);
    setWearLogs(logs);
    setClosetItems(items);

    // Group selfies by month
    const grouped = selfieData.reduce((acc: GroupedSelfies[], selfie) => {
      const date = new Date(selfie.date);
      const month = date.toLocaleDateString("en-US", { month: "long" });
      const year = date.getFullYear();
      const key = `${month}-${year}`;
      
      const existing = acc.find(g => `${g.month}-${g.year}` === key);
      if (existing) {
        existing.selfies.push(selfie);
      } else {
        acc.push({ month, year, selfies: [selfie] });
      }
      return acc;
    }, []);

    // Sort by date descending
    grouped.forEach(g => {
      g.selfies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    grouped.sort((a, b) => {
      const dateA = new Date(`${a.month} 1, ${a.year}`);
      const dateB = new Date(`${b.month} 1, ${b.year}`);
      return dateB.getTime() - dateA.getTime();
    });

    setGroupedSelfies(grouped);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getOutfitForSelfie = (selfie: OutfitSelfie) => {
    if (!selfie.wearLogId) return null;
    const log = wearLogs.find(l => l.id === selfie.wearLogId);
    if (!log) return null;
    return closetItems.filter(item => log.itemIds.includes(item.id));
  };

  const handleSelfiePress = (selfie: OutfitSelfie) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSelfie(selfie);
    setShowDetailModal(true);
  };

  const handleDeleteSelfie = async () => {
    if (!selectedSelfie) return;

    Alert.alert(
      "Delete Selfie",
      "Are you sure you want to delete this outfit selfie?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSelfie(selectedSelfie.id);
            setShowDetailModal(false);
            setSelectedSelfie(null);
            loadData();
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const handleShareSelfie = async () => {
    if (!selectedSelfie) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Sharing not available", "Sharing is not available on this device.");
        return;
      }
      await Sharing.shareAsync(selectedSelfie.imageUri, {
        mimeType: "image/jpeg",
        dialogTitle: "Share your outfit selfie",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const renderSelfieItem = ({ item: selfie }: { item: OutfitSelfie }) => {
    const outfit = getOutfitForSelfie(selfie);
    
    return (
      <Pressable
        onPress={() => handleSelfiePress(selfie)}
        style={({ pressed }) => [
          styles.selfieItem,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Image
          source={{ uri: selfie.imageUri }}
          style={styles.selfieImage}
          contentFit="cover"
        />
        <View style={[styles.selfieOverlay, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
          <Text style={styles.selfieDate}>
            {new Date(selfie.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Text>
          {outfit && outfit.length > 0 && (
            <Text style={styles.selfieItemCount}>{outfit.length} items</Text>
          )}
        </View>
      </Pressable>
    );
  };

  const renderTimelineItem = ({ item: selfie }: { item: OutfitSelfie }) => {
    const outfit = getOutfitForSelfie(selfie);
    const date = new Date(selfie.date);
    
    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineLine}>
          <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />
        </View>
        <Pressable
          onPress={() => handleSelfiePress(selfie)}
          style={({ pressed }) => [
            styles.timelineCard,
            { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Image
            source={{ uri: selfie.imageUri }}
            style={styles.timelineImage}
            contentFit="cover"
          />
          <View style={styles.timelineContent}>
            <Text style={[styles.timelineDate, { color: colors.foreground }]}>
              {date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            {outfit && outfit.length > 0 && (
              <View style={styles.timelineOutfit}>
                {outfit.slice(0, 3).map((item, _i) => (
                  <Image
                    key={item.id}
                    source={{ uri: item.imageUri }}
                    style={styles.timelineOutfitItem}
                    contentFit="cover"
                  />
                ))}
                {outfit.length > 3 && (
                  <View style={[styles.timelineMoreItems, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.timelineMoreText, { color: colors.background }]}>
                      +{outfit.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {selfie.notes && (
              <Text style={[styles.timelineNotes, { color: colors.muted }]} numberOfLines={2}>
                {selfie.notes}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  const renderMonthSection = ({ item: group }: { item: GroupedSelfies }) => (
    <View style={styles.monthSection}>
      <Text style={[styles.monthTitle, { color: colors.foreground }]}>
        {group.month} {group.year}
      </Text>
      {viewMode === "grid" ? (
        <View style={styles.selfieGrid}>
          {group.selfies.map(selfie => (
            <View key={selfie.id} style={styles.gridItemWrapper}>
              {renderSelfieItem({ item: selfie })}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.timelineList}>
          {group.selfies.map(selfie => (
            <View key={selfie.id}>
              {renderTimelineItem({ item: selfie })}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const outfitItems = selectedSelfie ? getOutfitForSelfie(selectedSelfie) : null;

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
        <Text style={[styles.title, { color: colors.foreground }]}>Style Diary</Text>
        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => setViewMode("grid")}
            style={[
              styles.toggleButton,
              viewMode === "grid" && { backgroundColor: colors.primary },
            ]}
          >
            <MaterialIcons
              name="grid-view"
              size={20}
              color={viewMode === "grid" ? colors.background : colors.muted}
            />
          </Pressable>
          <Pressable
            onPress={() => setViewMode("timeline")}
            style={[
              styles.toggleButton,
              viewMode === "timeline" && { backgroundColor: colors.primary },
            ]}
          >
            <MaterialIcons
              name="view-timeline"
              size={20}
              color={viewMode === "timeline" ? colors.background : colors.muted}
            />
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{selfies.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Selfies</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {groupedSelfies.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Months</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {selfies.length > 0
              ? Math.round(selfies.length / Math.max(groupedSelfies.length, 1))
              : 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Avg/Month</Text>
        </View>
      </View>

      {/* Content */}
      {selfies.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="camera-alt" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No Selfies Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Start capturing your outfits to build your style diary
          </Text>
          <Pressable
            onPress={() => router.push("/selfie-capture" as any)}
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add-a-photo" size={20} color={colors.background} />
            <Text style={[styles.emptyButtonText, { color: colors.background }]}>
              Take First Selfie
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={groupedSelfies}
          keyExtractor={(item) => `${item.month}-${item.year}`}
          renderItem={renderMonthSection}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FABs */}
      {selfies.length > 0 && (
        <View style={styles.fabContainer}>
          {selfies.length >= 2 && (
            <Pressable
              onPress={() => router.push("/outfit-compare" as any)}
              style={[styles.fabSecondary, { backgroundColor: colors.surface }]}
            >
              <MaterialIcons name="compare" size={22} color={colors.foreground} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push("/selfie-capture" as any)}
            style={[styles.fab, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add-a-photo" size={24} color={colors.background} />
          </Pressable>
        </View>
      )}

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {selectedSelfie &&
                new Date(selectedSelfie.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
            </Text>
            <Pressable onPress={handleShareSelfie}>
              <MaterialIcons name="share" size={24} color={colors.primary} />
            </Pressable>
          </View>

          {selectedSelfie && (
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedSelfie.imageUri }}
                style={styles.modalImage}
                contentFit="cover"
              />

              {outfitItems && outfitItems.length > 0 && (
                <View style={styles.outfitSection}>
                  <Text style={[styles.outfitTitle, { color: colors.foreground }]}>
                    Outfit Details
                  </Text>
                  <View style={styles.outfitList}>
                    {outfitItems.map(item => (
                      <View
                        key={item.id}
                        style={[styles.outfitItem, { backgroundColor: colors.surface }]}
                      >
                        <Image
                          source={{ uri: item.imageUri }}
                          style={styles.outfitItemImage}
                          contentFit="cover"
                        />
                        <View style={styles.outfitItemInfo}>
                          <Text style={[styles.outfitItemBrand, { color: colors.foreground }]}>
                            {item.brand || "Unknown"}
                          </Text>
                          <Text style={[styles.outfitItemType, { color: colors.muted }]}>
                            {item.type}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Pressable
                onPress={handleDeleteSelfie}
                style={[styles.deleteButton, { borderColor: colors.error }]}
              >
                <MaterialIcons name="delete" size={20} color={colors.error} />
                <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                  Delete Selfie
                </Text>
              </Pressable>
            </View>
          )}
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
  viewToggle: {
    flexDirection: "row",
    gap: 4,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 8,
  },
  statsBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "100%",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  monthSection: {
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  selfieGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridItemWrapper: {
    width: (width - 48) / 3,
  },
  selfieItem: {
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  selfieImage: {
    width: "100%",
    height: "100%",
  },
  selfieOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  selfieDate: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  selfieItemCount: {
    color: "#fff",
    fontSize: 10,
    opacity: 0.8,
  },
  timelineList: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineLine: {
    width: 20,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  timelineImage: {
    width: 100,
    height: 120,
  },
  timelineContent: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  timelineOutfit: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  timelineOutfitItem: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  timelineMoreItems: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineMoreText: {
    fontSize: 11,
    fontWeight: "600",
  },
  timelineNotes: {
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
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
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    marginBottom: 16,
  },
  outfitSection: {
    marginBottom: 16,
  },
  outfitTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  outfitList: {
    gap: 8,
  },
  outfitItem: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
  },
  outfitItemImage: {
    width: 60,
    height: 60,
  },
  outfitItemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  outfitItemBrand: {
    fontSize: 14,
    fontWeight: "600",
  },
  outfitItemType: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: "auto",
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
