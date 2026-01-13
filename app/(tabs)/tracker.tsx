import { useState, useEffect, useCallback, useRef } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  ClothingItem,
  WearLog,
  MoodTag,
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

const MOOD_TAGS: { tag: MoodTag; emoji: string; label: string }[] = [
  { tag: "confident", emoji: "💪", label: "Confident" },
  { tag: "comfortable", emoji: "😌", label: "Comfortable" },
  { tag: "stylish", emoji: "✨", label: "Stylish" },
  { tag: "casual", emoji: "👕", label: "Casual" },
  { tag: "professional", emoji: "💼", label: "Professional" },
  { tag: "creative", emoji: "🎨", label: "Creative" },
  { tag: "cozy", emoji: "🧣", label: "Cozy" },
  { tag: "bold", emoji: "🔥", label: "Bold" },
  { tag: "minimal", emoji: "⚪", label: "Minimal" },
  { tag: "elegant", emoji: "👗", label: "Elegant" },
];

interface DayData {
  date: Date;
  dateStr: string;
  day: number;
  hasLog: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  log?: WearLog;
  items?: ClothingItem[];
}

// Calculate streak from wear logs
function calculateStreak(logs: WearLog[]): { current: number; longest: number } {
  if (logs.length === 0) return { current: 0, longest: 0 };

  // Sort logs by date descending
  const sortedDates = [...new Set(logs.map(l => l.date.slice(0, 10)))]
    .sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) return { current: 0, longest: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Check if streak is active (logged today or yesterday)
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate streaks
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);
    const prevDate = i > 0 ? new Date(sortedDates[i - 1]) : null;

    if (i === 0) {
      tempStreak = 1;
    } else if (prevDate) {
      const diffDays = Math.round((prevDate.getTime() - currentDate.getTime()) / 86400000);
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const curr = new Date(sortedDates[i]);
      const prev = new Date(sortedDates[i - 1]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { current: currentStreak, longest: longestStreak };
}

export default function TrackerScreen() {
  const colors = useColors();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"calendar" | "grid">("calendar");
  const outfitCollageRef = useRef<View>(null);

  // New state for notes and mood
  const [logNotes, setLogNotes] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<MoodTag[]>([]);
  const [logRating, setLogRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [logOccasion, setLogOccasion] = useState("");

  // Comparison state
  const [compareOutfits, setCompareOutfits] = useState<DayData[]>([]);

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

  const streak = calculateStreak(wearLogs);

  const getItemsForLog = (log: WearLog): ClothingItem[] => {
    return log.itemIds
      .map((id) => closetItems.find((item) => item.id === id))
      .filter((item): item is ClothingItem => item !== undefined);
  };

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
      const dateStr = date.toISOString().slice(0, 10);
      const log = wearLogs.find((l) => l.date.startsWith(dateStr));
      days.push({
        date,
        dateStr,
        day: date.getDate(),
        hasLog: !!log,
        isToday: false,
        isCurrentMonth: false,
        log,
        items: log ? getItemsForLog(log) : undefined,
      });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().slice(0, 10);
      const log = wearLogs.find((l) => l.date.startsWith(dateStr));
      days.push({
        date,
        dateStr,
        day: i,
        hasLog: !!log,
        isToday: dateStr === today.toISOString().slice(0, 10),
        isCurrentMonth: true,
        log,
        items: log ? getItemsForLog(log) : undefined,
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      const dateStr = date.toISOString().slice(0, 10);
      days.push({
        date,
        dateStr,
        day: i,
        hasLog: false,
        isToday: false,
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayPress = (day: DayData) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (day.hasLog) {
      setSelectedDay(day);
      setShowDayModal(true);
    } else if (day.isCurrentMonth) {
      // Allow logging for past days in current month
      resetLogForm();
      setShowLogModal(true);
    }
  };

  const handleLogToday = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    resetLogForm();
    setShowLogModal(true);
  };

  const resetLogForm = () => {
    setSelectedItems([]);
    setLogNotes("");
    setSelectedMoods([]);
    setLogRating(null);
    setLogOccasion("");
  };

  const toggleItemSelection = (itemId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleMoodTag = (tag: MoodTag) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedMoods((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveLog = async () => {
    if (selectedItems.length === 0) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const newLog: WearLog = {
      id: generateId(),
      date: new Date().toISOString(),
      itemIds: selectedItems,
      sharedToCommunity: false,
      notes: logNotes || undefined,
      moodTags: selectedMoods.length > 0 ? selectedMoods : undefined,
      rating: logRating || undefined,
      occasion: logOccasion || undefined,
    };

    await saveWearLog(newLog);
    await loadData();
    setShowLogModal(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleShareOutfit = async () => {
    if (!selectedDay?.items || selectedDay.items.length === 0) return;

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Sharing not available", "Sharing is not available on this device.");
        return;
      }

      if (outfitCollageRef.current) {
        const uri = await captureRef(outfitCollageRef.current, {
          format: "png",
          quality: 1,
        });

        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share your outfit",
        });
      }
    } catch (error) {
      console.error("Error sharing outfit:", error);
      Alert.alert("Error", "Failed to share outfit. Please try again.");
    }
  };

  const handleSaveToGallery = async () => {
    if (!selectedDay?.items || selectedDay.items.length === 0) return;

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant access to save photos to your gallery.");
        return;
      }

      if (outfitCollageRef.current) {
        const uri = await captureRef(outfitCollageRef.current, {
          format: "png",
          quality: 1,
        });

        await MediaLibrary.saveToLibraryAsync(uri);
        
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Saved!", "Outfit saved to your photo gallery.");
      }
    } catch (error) {
      console.error("Error saving to gallery:", error);
      Alert.alert("Error", "Failed to save outfit. Please try again.");
    }
  };

  const handleAddToCompare = (day: DayData) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (compareOutfits.length < 2 && !compareOutfits.find(d => d.dateStr === day.dateStr)) {
      setCompareOutfits([...compareOutfits, day]);
      if (compareOutfits.length === 1) {
        setShowDayModal(false);
        setShowCompareModal(true);
      }
    }
  };

  const handleClearCompare = () => {
    setCompareOutfits([]);
    setShowCompareModal(false);
  };

  const days = getDaysInMonth();
  const logsThisMonth = days.filter((d) => d.isCurrentMonth && d.hasLog).length;

  // Grid view data - logs with outfit photos
  const monthLogs = days
    .filter((d) => d.isCurrentMonth && d.hasLog && d.items && d.items.length > 0)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Fit Tracker</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                {logsThisMonth} outfits logged this month
              </Text>
            </View>
            {/* View Mode Toggle */}
            <View style={[styles.viewToggle, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                onPress={() => setViewMode("calendar")}
                style={[
                  styles.viewToggleButton,
                  viewMode === "calendar" && { backgroundColor: colors.foreground },
                ]}
              >
                <MaterialIcons
                  name="calendar-today"
                  size={18}
                  color={viewMode === "calendar" ? colors.background : colors.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode("grid")}
                style={[
                  styles.viewToggleButton,
                  viewMode === "grid" && { backgroundColor: colors.foreground },
                ]}
              >
                <MaterialIcons
                  name="grid-view"
                  size={18}
                  color={viewMode === "grid" ? colors.background : colors.muted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Streak Banner */}
        <View style={[styles.streakBanner, { backgroundColor: colors.surface }]}>
          <View style={styles.streakItem}>
            <View style={[styles.streakIcon, { backgroundColor: streak.current > 0 ? colors.warning : colors.muted + "30" }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
            </View>
            <View>
              <Text style={[styles.streakValue, { color: colors.foreground }]}>{streak.current}</Text>
              <Text style={[styles.streakLabel, { color: colors.muted }]}>Day Streak</Text>
            </View>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
          <View style={styles.streakItem}>
            <View style={[styles.streakIcon, { backgroundColor: colors.primary + "30" }]}>
              <Text style={styles.streakEmoji}>🏆</Text>
            </View>
            <View>
              <Text style={[styles.streakValue, { color: colors.foreground }]}>{streak.longest}</Text>
              <Text style={[styles.streakLabel, { color: colors.muted }]}>Best Streak</Text>
            </View>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
          <View style={styles.streakItem}>
            <View style={[styles.streakIcon, { backgroundColor: colors.success + "30" }]}>
              <Text style={styles.streakEmoji}>📅</Text>
            </View>
            <View>
              <Text style={[styles.streakValue, { color: colors.foreground }]}>{wearLogs.length}</Text>
              <Text style={[styles.streakLabel, { color: colors.muted }]}>Total Logs</Text>
            </View>
          </View>
        </View>

        {/* Compare Button */}
        {compareOutfits.length === 1 && (
          <View style={[styles.compareBanner, { backgroundColor: colors.primary }]}>
            <Text style={[styles.compareBannerText, { color: colors.background }]}>
              Select another outfit to compare
            </Text>
            <TouchableOpacity onPress={handleClearCompare}>
              <Text style={[styles.compareBannerCancel, { color: colors.background }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {viewMode === "calendar" ? (
          <>
            {/* Calendar View */}
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
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleDayPress(day)}
                    onLongPress={() => day.hasLog && handleAddToCompare(day)}
                    activeOpacity={0.7}
                    style={[
                      styles.dayCell,
                      day.isToday && { backgroundColor: colors.primary },
                      compareOutfits.find(d => d.dateStr === day.dateStr) && { borderColor: colors.warning, borderWidth: 2 },
                    ]}
                  >
                    {/* Show outfit thumbnail if logged */}
                    {day.hasLog && day.items && day.items.length > 0 ? (
                      <View style={styles.dayThumbnailContainer}>
                        <Image
                          source={{ uri: day.items[0].imageUri }}
                          style={[
                            styles.dayThumbnail,
                            day.isToday && { borderColor: colors.background, borderWidth: 2 },
                          ]}
                          contentFit="cover"
                        />
                        {day.items.length > 1 && (
                          <View style={[styles.itemCountBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.itemCountText}>+{day.items.length - 1}</Text>
                          </View>
                        )}
                        {/* Show mood indicator */}
                        {day.log?.moodTags && day.log.moodTags.length > 0 && (
                          <View style={styles.moodIndicator}>
                            <Text style={styles.moodIndicatorText}>
                              {MOOD_TAGS.find(m => m.tag === day.log?.moodTags?.[0])?.emoji || ""}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <>
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
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : (
          /* Grid View - Outfit Photos */
          <View style={styles.gridView}>
            {monthLogs.length === 0 ? (
              <View style={[styles.emptyGrid, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="photo-library" size={48} color={colors.muted} />
                <Text style={[styles.emptyGridText, { color: colors.muted }]}>
                  No outfits logged this month
                </Text>
                <Text style={[styles.emptyGridSubtext, { color: colors.muted }]}>
                  Start logging to see your style history
                </Text>
              </View>
            ) : (
              <View style={styles.outfitGrid}>
                {monthLogs.map((day) => (
                  <TouchableOpacity
                    key={day.dateStr}
                    onPress={() => {
                      setSelectedDay(day);
                      setShowDayModal(true);
                    }}
                    onLongPress={() => handleAddToCompare(day)}
                    style={[
                      styles.outfitGridItem, 
                      { backgroundColor: colors.surface },
                      compareOutfits.find(d => d.dateStr === day.dateStr) && { borderColor: colors.warning, borderWidth: 2 },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.outfitGridImages}>
                      {day.items?.slice(0, 4).map((item, i) => (
                        <Image
                          key={item.id}
                          source={{ uri: item.imageUri }}
                          style={[
                            styles.outfitGridImage,
                            day.items && day.items.length === 1 && styles.outfitGridImageFull,
                          ]}
                          contentFit="cover"
                        />
                      ))}
                    </View>
                    <View style={styles.outfitGridInfo}>
                      <View style={styles.outfitGridHeader}>
                        <Text style={[styles.outfitGridDate, { color: colors.foreground }]}>
                          {day.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </Text>
                        {day.log?.rating && (
                          <View style={styles.ratingBadge}>
                            <Text style={styles.ratingText}>{"⭐".repeat(day.log.rating)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.outfitGridCount, { color: colors.muted }]}>
                        {day.items?.length} items
                        {day.log?.moodTags && day.log.moodTags.length > 0 && 
                          ` • ${day.log.moodTags.map(t => MOOD_TAGS.find(m => m.tag === t)?.emoji).join("")}`
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Log Today Button */}
        <Pressable
          onPress={handleLogToday}
          style={({ pressed }) => [
            styles.logButton,
            {
              backgroundColor: colors.foreground,
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

      {/* Day Detail Modal with Sharing */}
      <Modal
        visible={showDayModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowDayModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {selectedDay?.date.toLocaleDateString("en-US", { 
                weekday: "long", 
                month: "long", 
                day: "numeric" 
              })}
            </Text>
            <TouchableOpacity onPress={() => selectedDay && handleAddToCompare(selectedDay)}>
              <MaterialIcons name="compare" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.dayModalContent}>
            {/* Mood Tags Display */}
            {selectedDay?.log?.moodTags && selectedDay.log.moodTags.length > 0 && (
              <View style={styles.logMoodDisplay}>
                {selectedDay.log.moodTags.map(tag => {
                  const mood = MOOD_TAGS.find(m => m.tag === tag);
                  return (
                    <View key={tag} style={[styles.moodTagDisplay, { backgroundColor: colors.surface }]}>
                      <Text style={styles.moodTagEmoji}>{mood?.emoji}</Text>
                      <Text style={[styles.moodTagLabel, { color: colors.foreground }]}>{mood?.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Rating Display */}
            {selectedDay?.log?.rating && (
              <View style={styles.ratingDisplay}>
                <Text style={styles.ratingStars}>{"⭐".repeat(selectedDay.log.rating)}</Text>
              </View>
            )}

            {/* Notes Display */}
            {selectedDay?.log?.notes && (
              <View style={[styles.notesDisplay, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="notes" size={16} color={colors.muted} />
                <Text style={[styles.notesText, { color: colors.foreground }]}>
                  {selectedDay.log.notes}
                </Text>
              </View>
            )}

            {/* Occasion Display */}
            {selectedDay?.log?.occasion && (
              <View style={[styles.occasionDisplay, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="event" size={16} color={colors.muted} />
                <Text style={[styles.occasionText, { color: colors.foreground }]}>
                  {selectedDay.log.occasion}
                </Text>
              </View>
            )}

            {/* Outfit Collage - Capturable for sharing */}
            <View
              ref={outfitCollageRef}
              style={[styles.outfitCollage, { backgroundColor: colors.surface }]}
              collapsable={false}
            >
              <View style={styles.collageHeader}>
                <Text style={[styles.collageTitle, { color: colors.foreground }]}>
                  Today's Fit
                </Text>
                <Text style={[styles.collageDate, { color: colors.muted }]}>
                  {selectedDay?.date.toLocaleDateString("en-US", { 
                    month: "short", 
                    day: "numeric",
                    year: "numeric"
                  })}
                </Text>
              </View>
              <View style={styles.collageGrid}>
                {selectedDay?.items?.map((item) => (
                  <View key={item.id} style={styles.collageItem}>
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.collageItemImage}
                      contentFit="cover"
                    />
                    <Text 
                      style={[styles.collageItemBrand, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.brand || item.type}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.collageBranding}>
                <Text style={[styles.collageBrandText, { color: colors.muted }]}>
                  FitCheck
                </Text>
              </View>
            </View>

            {/* Share Actions */}
            <View style={styles.shareActions}>
              <TouchableOpacity
                onPress={handleShareOutfit}
                style={[styles.shareButton, { backgroundColor: colors.foreground }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="share" size={20} color={colors.background} />
                <Text style={[styles.shareButtonText, { color: colors.background }]}>
                  Share Outfit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveToGallery}
                style={[styles.saveButton, { borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="save-alt" size={20} color={colors.foreground} />
                <Text style={[styles.saveButtonText, { color: colors.foreground }]}>
                  Save to Gallery
                </Text>
              </TouchableOpacity>
            </View>

            {/* Item Details */}
            <View style={styles.itemDetails}>
              <Text style={[styles.itemDetailsTitle, { color: colors.foreground }]}>
                Items Worn ({selectedDay?.items?.length || 0})
              </Text>
              {selectedDay?.items?.map((item) => (
                <View 
                  key={item.id} 
                  style={[styles.itemDetailRow, { backgroundColor: colors.surface }]}
                >
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.itemDetailImage}
                    contentFit="cover"
                  />
                  <View style={styles.itemDetailInfo}>
                    <Text style={[styles.itemDetailBrand, { color: colors.foreground }]}>
                      {item.brand || "Unknown Brand"}
                    </Text>
                    <Text style={[styles.itemDetailType, { color: colors.muted }]}>
                      {item.type} - {item.color}
                    </Text>
                    <Text style={[styles.itemDetailCPW, { color: colors.success }]}>
                      ${calculateCostPerWear(item).toFixed(2)} per wear
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Log Modal with Notes and Mood */}
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

          <ScrollView>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              Select the items you wore today ({selectedItems.length} selected)
            </Text>

            {/* Item Selection Grid */}
            <View style={styles.itemSelectionGrid}>
              {closetItems.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
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
              })}
            </View>

            {/* Mood Tags Section */}
            <View style={styles.logSection}>
              <Text style={[styles.logSectionTitle, { color: colors.foreground }]}>
                How did you feel? (optional)
              </Text>
              <View style={styles.moodTagsGrid}>
                {MOOD_TAGS.map((mood) => {
                  const isSelected = selectedMoods.includes(mood.tag);
                  return (
                    <TouchableOpacity
                      key={mood.tag}
                      onPress={() => toggleMoodTag(mood.tag)}
                      style={[
                        styles.moodTagButton,
                        { backgroundColor: isSelected ? colors.primary : colors.surface },
                      ]}
                    >
                      <Text style={styles.moodTagButtonEmoji}>{mood.emoji}</Text>
                      <Text style={[
                        styles.moodTagButtonLabel,
                        { color: isSelected ? colors.background : colors.foreground },
                      ]}>
                        {mood.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Rating Section */}
            <View style={styles.logSection}>
              <Text style={[styles.logSectionTitle, { color: colors.foreground }]}>
                Rate this outfit (optional)
              </Text>
              <View style={styles.ratingButtons}>
                {([1, 2, 3, 4, 5] as const).map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    onPress={() => setLogRating(logRating === rating ? null : rating)}
                    style={[
                      styles.ratingButton,
                      { backgroundColor: logRating && logRating >= rating ? colors.warning : colors.surface },
                    ]}
                  >
                    <Text style={styles.ratingButtonText}>⭐</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Occasion Input */}
            <View style={styles.logSection}>
              <Text style={[styles.logSectionTitle, { color: colors.foreground }]}>
                Occasion (optional)
              </Text>
              <TextInput
                value={logOccasion}
                onChangeText={setLogOccasion}
                placeholder="e.g., Work meeting, Date night, Casual Friday"
                placeholderTextColor={colors.muted}
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />
            </View>

            {/* Notes Input */}
            <View style={styles.logSection}>
              <Text style={[styles.logSectionTitle, { color: colors.foreground }]}>
                Notes (optional)
              </Text>
              <TextInput
                value={logNotes}
                onChangeText={setLogNotes}
                placeholder="How did this outfit work out? Any thoughts?"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                style={[styles.textInputMulti, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Compare Modal */}
      <Modal
        visible={showCompareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClearCompare}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={handleClearCompare}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Compare Outfits
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.compareContent}>
            <View style={styles.compareGrid}>
              {compareOutfits.map((day, index) => (
                <View key={day.dateStr} style={styles.compareColumn}>
                  <Text style={[styles.compareDate, { color: colors.foreground }]}>
                    {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                  
                  {/* Mood Tags */}
                  {day.log?.moodTags && day.log.moodTags.length > 0 && (
                    <View style={styles.compareMoods}>
                      {day.log.moodTags.slice(0, 3).map(tag => (
                        <Text key={tag} style={styles.compareMoodEmoji}>
                          {MOOD_TAGS.find(m => m.tag === tag)?.emoji}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Rating */}
                  {day.log?.rating && (
                    <Text style={styles.compareRating}>{"⭐".repeat(day.log.rating)}</Text>
                  )}

                  {/* Items */}
                  <View style={[styles.compareItems, { backgroundColor: colors.surface }]}>
                    {day.items?.map((item) => (
                      <View key={item.id} style={styles.compareItem}>
                        <Image
                          source={{ uri: item.imageUri }}
                          style={styles.compareItemImage}
                          contentFit="cover"
                        />
                        <Text 
                          style={[styles.compareItemBrand, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          {item.brand || item.type}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Notes */}
                  {day.log?.notes && (
                    <Text style={[styles.compareNotes, { color: colors.muted }]} numberOfLines={2}>
                      "{day.log.notes}"
                    </Text>
                  )}
                </View>
              ))}

              {compareOutfits.length < 2 && (
                <View style={[styles.compareColumn, styles.compareEmpty]}>
                  <MaterialIcons name="add-circle-outline" size={48} color={colors.muted} />
                  <Text style={[styles.compareEmptyText, { color: colors.muted }]}>
                    Long-press another outfit to compare
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  viewToggle: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 4,
  },
  viewToggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  streakBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  streakItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  streakIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  streakEmoji: {
    fontSize: 20,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  streakLabel: {
    fontSize: 11,
  },
  streakDivider: {
    width: 1,
    height: 40,
  },
  compareBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compareBannerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  compareBannerCancel: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
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
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dayThumbnailContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: "hidden",
  },
  dayThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  itemCountBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCountText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  moodIndicator: {
    position: "absolute",
    top: -4,
    left: -4,
  },
  moodIndicatorText: {
    fontSize: 10,
  },
  logDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  gridView: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emptyGrid: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyGridText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyGridSubtext: {
    fontSize: 14,
  },
  outfitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  outfitGridItem: {
    width: (width - 44) / 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  outfitGridImages: {
    flexDirection: "row",
    flexWrap: "wrap",
    height: 120,
  },
  outfitGridImage: {
    width: "50%",
    height: 60,
  },
  outfitGridImageFull: {
    width: "100%",
    height: 120,
  },
  outfitGridInfo: {
    padding: 10,
  },
  outfitGridHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  outfitGridDate: {
    fontSize: 13,
    fontWeight: "600",
  },
  ratingBadge: {
    flexDirection: "row",
  },
  ratingText: {
    fontSize: 10,
  },
  outfitGridCount: {
    fontSize: 12,
    marginTop: 2,
  },
  logButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 30,
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
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
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
    marginBottom: 24,
  },
  mostWornCard: {
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
  },
  mostWornImage: {
    width: 100,
    height: 100,
  },
  mostWornInfo: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  mostWornBrand: {
    fontSize: 16,
    fontWeight: "600",
  },
  mostWornStats: {
    fontSize: 14,
    marginTop: 4,
  },
  mostWornCPW: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemSelectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
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
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  logSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  moodTagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moodTagButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  moodTagButtonEmoji: {
    fontSize: 16,
  },
  moodTagButtonLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  ratingButtons: {
    flexDirection: "row",
    gap: 8,
  },
  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingButtonText: {
    fontSize: 20,
  },
  textInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textInputMulti: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: "top",
  },
  dayModalContent: {
    padding: 16,
  },
  logMoodDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  moodTagDisplay: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  moodTagEmoji: {
    fontSize: 14,
  },
  moodTagLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  ratingDisplay: {
    marginBottom: 12,
  },
  ratingStars: {
    fontSize: 18,
  },
  notesDisplay: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    fontStyle: "italic",
  },
  occasionDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  occasionText: {
    fontSize: 14,
  },
  outfitCollage: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  collageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  collageTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  collageDate: {
    fontSize: 13,
  },
  collageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  collageItem: {
    width: (width - 80) / 2,
    alignItems: "center",
  },
  collageItemImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },
  collageItemBrand: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
  },
  collageBranding: {
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  collageBrandText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
  },
  shareActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemDetails: {
    gap: 12,
  },
  itemDetailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemDetailRow: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
  },
  itemDetailImage: {
    width: 80,
    height: 80,
  },
  itemDetailInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  itemDetailBrand: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemDetailType: {
    fontSize: 13,
    marginTop: 2,
  },
  itemDetailCPW: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  compareContent: {
    padding: 16,
  },
  compareGrid: {
    flexDirection: "row",
    gap: 16,
  },
  compareColumn: {
    flex: 1,
    alignItems: "center",
  },
  compareEmpty: {
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  compareEmptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  compareDate: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  compareMoods: {
    flexDirection: "row",
    marginBottom: 4,
  },
  compareMoodEmoji: {
    fontSize: 16,
  },
  compareRating: {
    fontSize: 12,
    marginBottom: 8,
  },
  compareItems: {
    width: "100%",
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  compareItem: {
    alignItems: "center",
  },
  compareItemImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
  },
  compareItemBrand: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  compareNotes: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
});
