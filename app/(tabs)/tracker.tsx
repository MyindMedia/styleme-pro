import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  ClothingItem,
  WearLog,
  getClothingItems,
  getWearLogs,
  saveWearLog,
  getClosetStats,
  calculateCostPerWear,
  generateId,
} from "@/lib/storage";

const { width } = Dimensions.get("window");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface DayData {
  date: Date;
  day: number;
  hasLog: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
}

export default function TrackerScreen() {
  const colors = useColors();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    const [items, logs, closetStats] = await Promise.all([
      getClothingItems(),
      getWearLogs(),
      getClosetStats(),
    ]);
    setClosetItems(items);
    setWearLogs(logs);
    setStats(closetStats);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDaysInMonth = (): DayData[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const today = new Date();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: DayData[] = [];
    
    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        day: date.getDate(),
        hasLog: wearLogs.some((log) => log.date.startsWith(date.toISOString().slice(0, 10))),
        isToday: false,
        isCurrentMonth: false,
      });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().slice(0, 10);
      days.push({
        date,
        day: i,
        hasLog: wearLogs.some((log) => log.date.startsWith(dateStr)),
        isToday: dateStr === today.toISOString().slice(0, 10),
        isCurrentMonth: true,
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        day: i,
        hasLog: false,
        isToday: false,
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleLogToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItems([]);
    setShowLogModal(true);
  };

  const toggleItemSelection = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSaveLog = async () => {
    if (selectedItems.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newLog: WearLog = {
      id: generateId(),
      date: new Date().toISOString(),
      itemIds: selectedItems,
      sharedToCommunity: false,
    };

    await saveWearLog(newLog);
    await loadData();
    setShowLogModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const days = getDaysInMonth();

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Fit Tracker</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Track what you wear
          </Text>
        </View>

        {/* Calendar */}
        <View style={[styles.calendarCard, { backgroundColor: colors.surface }]}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={handlePrevMonth} style={styles.navButton}>
              <MaterialIcons name="chevron-left" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.monthTitle, { color: colors.foreground }]}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.navButton}>
              <MaterialIcons name="chevron-right" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {DAYS.map((day) => (
              <Text key={day} style={[styles.weekDay, { color: colors.muted }]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => (
              <View
                key={index}
                style={[
                  styles.dayCell,
                  day.isToday && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: day.isToday
                        ? colors.background
                        : day.isCurrentMonth
                        ? colors.foreground
                        : colors.muted,
                    },
                  ]}
                >
                  {day.day}
                </Text>
                {day.hasLog && (
                  <View
                    style={[
                      styles.logDot,
                      { backgroundColor: day.isToday ? colors.background : colors.success },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Log Today Button */}
        <Pressable
          onPress={handleLogToday}
          style={({ pressed }) => [
            styles.logButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <MaterialIcons name="add" size={20} color={colors.background} />
          <Text style={[styles.logButtonText, { color: colors.background }]}>
            Log Today's Outfit
          </Text>
        </Pressable>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Your Stats
            </Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="checkroom" size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {stats.totalItems}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Total Items</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="event" size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {stats.totalWearLogs}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Outfits Logged</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="attach-money" size={24} color={colors.success} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  ${stats.totalValue.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Closet Value</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="warning" size={24} color={colors.warning} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {stats.unwornItems.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Unworn (90d)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Most Worn Item */}
        {stats?.mostWornItem && (
          <View style={styles.mostWornSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Most Worn Item
            </Text>
            <View style={[styles.mostWornCard, { backgroundColor: colors.surface }]}>
              <Image
                source={{ uri: stats.mostWornItem.imageUri }}
                style={styles.mostWornImage}
                contentFit="cover"
              />
              <View style={styles.mostWornInfo}>
                <Text style={[styles.mostWornBrand, { color: colors.foreground }]}>
                  {stats.mostWornItem.brand || "Unknown Brand"}
                </Text>
                <Text style={[styles.mostWornStats, { color: colors.muted }]}>
                  Worn {stats.mostWornItem.wearCount} times
                </Text>
                <Text style={[styles.mostWornCPW, { color: colors.success }]}>
                  ${calculateCostPerWear(stats.mostWornItem).toFixed(2)} per wear
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Log Modal */}
      <Modal
        visible={showLogModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowLogModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Log Today's Outfit
            </Text>
            <Pressable
              onPress={handleSaveLog}
              disabled={selectedItems.length === 0}
              style={{ opacity: selectedItems.length === 0 ? 0.5 : 1 }}
            >
              <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
            </Pressable>
          </View>

          <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
            Select the items you wore today
          </Text>

          <FlatList
            data={closetItems}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalGrid}
            columnWrapperStyle={styles.modalRow}
            renderItem={({ item }) => {
              const isSelected = selectedItems.includes(item.id);
              return (
                <Pressable
                  onPress={() => toggleItemSelection(item.id)}
                  style={[
                    styles.modalItem,
                    isSelected && { borderColor: colors.primary, borderWidth: 3 },
                  ]}
                >
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.modalItemImage}
                    contentFit="cover"
                  />
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <MaterialIcons name="check" size={14} color={colors.background} />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  calendarCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navButton: {
    padding: 4,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: (width - 64) / 7,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  logDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  logButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  mostWornSection: {
    paddingHorizontal: 16,
  },
  mostWornCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  mostWornImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  mostWornInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  mostWornBrand: {
    fontSize: 16,
    fontWeight: "600",
  },
  mostWornStats: {
    fontSize: 14,
  },
  mostWornCPW: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalSave: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },
  modalGrid: {
    padding: 16,
  },
  modalRow: {
    gap: 8,
    marginBottom: 8,
  },
  modalItem: {
    width: (width - 48) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  modalItemImage: {
    width: "100%",
    height: "100%",
  },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
