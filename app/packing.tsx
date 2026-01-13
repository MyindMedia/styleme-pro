import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  Trip,
  TripType,
  ClimateType,
  PackingList,
  PackingItem,
  getTrips,
  saveTrip,
  deleteTrip,
  getPackingListForTrip,
  savePackingList,
  togglePackingItemPacked,
  generatePackingSuggestions,
  getClothingItems,
  generateId,
  ClothingItem,
} from "@/lib/storage";

const TRIP_TYPES: { key: TripType; label: string; icon: string }[] = [
  { key: "vacation", label: "Vacation", icon: "beach-access" },
  { key: "business", label: "Business", icon: "business-center" },
  { key: "adventure", label: "Adventure", icon: "terrain" },
  { key: "beach", label: "Beach", icon: "pool" },
  { key: "city", label: "City Break", icon: "location-city" },
  { key: "wedding", label: "Wedding", icon: "celebration" },
  { key: "other", label: "Other", icon: "luggage" },
];

const CLIMATES: { key: ClimateType; label: string }[] = [
  { key: "tropical", label: "Tropical (Hot & Humid)" },
  { key: "desert", label: "Desert (Hot & Dry)" },
  { key: "temperate", label: "Temperate (Mild)" },
  { key: "cold", label: "Cold" },
  { key: "rainy", label: "Rainy" },
  { key: "mixed", label: "Mixed/Variable" },
];

export default function PackingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [packingList, setPackingList] = useState<PackingList | null>(null);
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [isPro] = useState(true); // For demo purposes, set to true

  // New trip form state
  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tripType, setTripType] = useState<TripType>("vacation");
  const [climate, setClimate] = useState<ClimateType>("temperate");

  const loadData = useCallback(async () => {
    const [tripsData, itemsData] = await Promise.all([
      getTrips(),
      getClothingItems(),
    ]);
    setTrips(tripsData);
    setClosetItems(itemsData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadPackingList = useCallback(async (trip: Trip) => {
    let list = await getPackingListForTrip(trip.id);
    
    if (!list) {
      // Generate new packing list with suggestions
      const suggestions = generatePackingSuggestions(trip, closetItems);
      const items: PackingItem[] = [];
      
      suggestions.forEach((category) => {
        category.suggestions.forEach((suggestion) => {
          items.push({
            id: generateId(),
            tripId: trip.id,
            closetItemId: suggestion.closetItemId,
            name: suggestion.name,
            category: category.category.toLowerCase() as any,
            quantity: suggestion.quantity,
            isPacked: false,
            isEssential: category.category === "Documents",
          });
        });
      });

      list = {
        id: generateId(),
        tripId: trip.id,
        items,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };
      
      await savePackingList(list);
    }
    
    setPackingList(list);
  }, [closetItems]);

  const handleSelectTrip = (trip: Trip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTrip(trip);
    loadPackingList(trip);
  };

  const handleCreateTrip = async () => {
    if (!tripName || !destination || !startDate || !endDate) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    const newTrip: Trip = {
      id: generateId(),
      name: tripName,
      destination,
      startDate,
      endDate,
      tripType,
      climate,
      activities: [],
      createdAt: new Date().toISOString(),
    };

    await saveTrip(newTrip);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Reset form
    setTripName("");
    setDestination("");
    setStartDate("");
    setEndDate("");
    setTripType("vacation");
    setClimate("temperate");
    setShowCreateTrip(false);
    
    // Reload and select new trip
    await loadData();
    handleSelectTrip(newTrip);
  };

  const handleDeleteTrip = (tripId: string) => {
    Alert.alert(
      "Delete Trip",
      "Are you sure you want to delete this trip and its packing list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTrip(tripId);
            if (selectedTrip?.id === tripId) {
              setSelectedTrip(null);
              setPackingList(null);
            }
            await loadData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleTogglePacked = async (itemId: string) => {
    if (!packingList) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await togglePackingItemPacked(packingList.id, itemId);
    
    // Update local state
    setPackingList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, isPacked: !item.isPacked } : item
        ),
      };
    });
  };

  const packedCount = packingList?.items.filter((i) => i.isPacked).length || 0;
  const totalCount = packingList?.items.length || 0;
  const progress = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;

  const groupedItems = packingList?.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PackingItem[]>) || {};

  if (!isPro) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Packing List</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.proGate}>
          <MaterialIcons name="workspace-premium" size={64} color="#D4AF37" />
          <Text style={[styles.proTitle, { color: colors.foreground }]}>
            Premium Feature
          </Text>
          <Text style={[styles.proSubtitle, { color: colors.muted }]}>
            Upgrade to Pro to access smart packing lists with weather-based suggestions
          </Text>
          <Pressable style={[styles.upgradeButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.upgradeText, { color: colors.background }]}>
              Upgrade to Pro - $14.99/mo
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  if (selectedTrip && packingList) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              setSelectedTrip(null);
              setPackingList(null);
            }}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.tripTitle, { color: colors.foreground }]} numberOfLines={1}>
              {selectedTrip.name}
            </Text>
            <Text style={[styles.tripDestination, { color: colors.muted }]}>
              {selectedTrip.destination}
            </Text>
          </View>
          <Pressable onPress={() => handleDeleteTrip(selectedTrip.id)}>
            <MaterialIcons name="delete-outline" size={24} color={colors.muted} />
          </Pressable>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.foreground }]}>
              Packing Progress
            </Text>
            <Text style={[styles.progressCount, { color: colors.muted }]}>
              {packedCount}/{totalCount} items
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${progress}%` },
              ]}
            />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.listContainer}>
          {Object.entries(groupedItems).map(([category, items]) => (
            <View key={category} style={styles.categorySection}>
              <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleTogglePacked(item.id)}
                  style={[
                    styles.packingItem,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: item.isPacked ? colors.primary : "transparent",
                        borderColor: item.isPacked ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {item.isPacked && (
                      <MaterialIcons name="check" size={14} color={colors.background} />
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text
                      style={[
                        styles.itemName,
                        {
                          color: colors.foreground,
                          textDecorationLine: item.isPacked ? "line-through" : "none",
                          opacity: item.isPacked ? 0.6 : 1,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.quantity > 1 && (
                      <Text style={[styles.itemQuantity, { color: colors.muted }]}>
                        x{item.quantity}
                      </Text>
                    )}
                  </View>
                  {item.isEssential && (
                    <MaterialIcons name="priority-high" size={18} color={colors.error} />
                  )}
                </Pressable>
              ))}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Packing Lists</Text>
        <Pressable onPress={() => setShowCreateTrip(true)}>
          <MaterialIcons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="luggage" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No Trips Planned
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Create a trip to get smart packing suggestions based on weather and duration
          </Text>
          <Pressable
            onPress={() => setShowCreateTrip(true)}
            style={[styles.createButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add" size={20} color={colors.background} />
            <Text style={[styles.createButtonText, { color: colors.background }]}>
              Create Trip
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.tripList}
          renderItem={({ item }) => {
            const tripTypeInfo = TRIP_TYPES.find((t) => t.key === item.tripType);
            const startDateObj = new Date(item.startDate);
            const endDateObj = new Date(item.endDate);
            const duration = Math.ceil(
              (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <Pressable
                onPress={() => handleSelectTrip(item)}
                style={({ pressed }) => [
                  styles.tripCard,
                  { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <View style={[styles.tripIcon, { backgroundColor: colors.primary }]}>
                  <MaterialIcons
                    name={tripTypeInfo?.icon as any}
                    size={24}
                    color={colors.background}
                  />
                </View>
                <View style={styles.tripInfo}>
                  <Text style={[styles.tripName, { color: colors.foreground }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.tripMeta, { color: colors.muted }]}>
                    {item.destination} • {duration} days
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
              </Pressable>
            );
          }}
        />
      )}

      {/* Create Trip Modal */}
      <Modal
        visible={showCreateTrip}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateTrip(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCreateTrip(false)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Trip</Text>
            <Pressable onPress={handleCreateTrip}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Create</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Trip Name</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Summer Vacation 2026"
                placeholderTextColor={colors.muted}
                value={tripName}
                onChangeText={setTripName}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Destination</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Paris, France"
                placeholderTextColor={colors.muted}
                value={destination}
                onChangeText={setDestination}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formSection, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Start Date</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="2026-03-15"
                  placeholderTextColor={colors.muted}
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={[styles.formSection, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>End Date</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="2026-03-22"
                  placeholderTextColor={colors.muted}
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Trip Type</Text>
              <View style={styles.typeGrid}>
                {TRIP_TYPES.map((type) => (
                  <Pressable
                    key={type.key}
                    onPress={() => setTripType(type.key)}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: tripType === type.key ? colors.primary : colors.surface,
                        borderColor: tripType === type.key ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={type.icon as any}
                      size={16}
                      color={tripType === type.key ? colors.background : colors.foreground}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        { color: tripType === type.key ? colors.background : colors.foreground },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Climate</Text>
              <View style={styles.climateList}>
                {CLIMATES.map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={() => setClimate(c.key)}
                    style={[
                      styles.climateItem,
                      {
                        backgroundColor: climate === c.key ? colors.primary : colors.surface,
                        borderColor: climate === c.key ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.climateText,
                        { color: climate === c.key ? colors.background : colors.foreground },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  tripDestination: {
    fontSize: 13,
  },
  proGate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  proTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  proSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  upgradeButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 8,
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  tripList: {
    padding: 16,
    gap: 12,
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  tripIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    fontSize: 16,
    fontWeight: "600",
  },
  tripMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressCount: {
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  packingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    fontSize: 15,
  },
  itemQuantity: {
    fontSize: 13,
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  formInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  typeText: {
    fontSize: 13,
    fontWeight: "500",
  },
  climateList: {
    gap: 8,
  },
  climateItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  climateText: {
    fontSize: 14,
  },
});
