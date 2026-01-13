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
  Dimensions,
  Alert,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  WishlistItem,
  WishlistBlend,
  ClothingCategory,
  Occasion,
  Season,
  getWishlistItems,
  saveWishlistItem,
  deleteWishlistItem,
  toggleWishlistPriority,
  calculateWishlistBlend,
  getBlendScoreLabel,
  generateId,
  CLOTHING_TYPES,
  OCCASIONS,
  SEASONS,
  POPULAR_BRANDS,
  ClothingItem,
} from "@/lib/storage";

const { width } = Dimensions.get("window");

const CATEGORIES: { key: ClothingCategory; label: string; icon: string }[] = [
  { key: "tops", label: "Tops", icon: "checkroom" },
  { key: "bottoms", label: "Bottoms", icon: "straighten" },
  { key: "dresses", label: "Dresses", icon: "dry-cleaning" },
  { key: "outerwear", label: "Outerwear", icon: "ac-unit" },
  { key: "shoes", label: "Shoes", icon: "ice-skating" },
  { key: "accessories", label: "Accessories", icon: "watch" },
  { key: "swimwear", label: "Swimwear", icon: "pool" },
];

const COLORS = [
  "Black", "White", "Gray", "Navy", "Blue", "Red", "Pink", "Green",
  "Brown", "Beige", "Cream", "Tan", "Burgundy", "Purple", "Gold", "Silver",
];

export default function WishlistScreen() {
  const colors = useColors();
  const router = useRouter();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [blendResult, setBlendResult] = useState<WishlistBlend | null>(null);
  const [isCalculatingBlend, setIsCalculatingBlend] = useState(false);

  // Form state
  const [imageUri, setImageUri] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState<ClothingCategory>("tops");
  const [type, setType] = useState("");
  const [color, setColor] = useState("Black");
  const [selectedOccasions, setSelectedOccasions] = useState<Occasion[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([]);
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    const items = await getWishlistItems();
    setWishlistItems(items);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const resetForm = () => {
    setImageUri("");
    setName("");
    setBrand("");
    setPrice("");
    setLink("");
    setCategory("tops");
    setType("");
    setColor("Black");
    setSelectedOccasions([]);
    setSelectedSeasons([]);
    setNotes("");
  };

  const handleSaveItem = async () => {
    if (!imageUri || !name) {
      Alert.alert("Missing Info", "Please add an image and name for the item.");
      return;
    }

    const newItem: WishlistItem = {
      id: generateId(),
      imageUri,
      name,
      brand,
      price: parseFloat(price) || 0,
      link: link || undefined,
      category,
      type: type || CLOTHING_TYPES[category][0]?.key || "",
      color,
      occasions: selectedOccasions,
      seasons: selectedSeasons,
      notes: notes || undefined,
      addedAt: new Date().toISOString(),
      isPriority: false,
    };

    await saveWishlistItem(newItem);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    resetForm();
    setShowAddModal(false);
    loadData();
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      "Remove from Wishlist",
      "Are you sure you want to remove this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await deleteWishlistItem(id);
            if (selectedItem?.id === id) {
              setSelectedItem(null);
              setBlendResult(null);
            }
            loadData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleTogglePriority = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleWishlistPriority(id);
    loadData();
  };

  const handleBlendWithCloset = async (item: WishlistItem) => {
    setSelectedItem(item);
    setIsCalculatingBlend(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await calculateWishlistBlend(item);
    setBlendResult(result);
    setIsCalculatingBlend(false);
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => {
    const scoreInfo = blendResult?.wishlistItemId === item.id
      ? getBlendScoreLabel(blendResult.overallScore)
      : null;

    return (
      <Pressable
        onPress={() => handleBlendWithCloset(item)}
        style={({ pressed }) => [
          styles.itemCard,
          { backgroundColor: colors.surface, opacity: pressed ? 0.95 : 1 },
        ]}
      >
        <Image source={{ uri: item.imageUri }} style={styles.itemImage} contentFit="cover" />
        
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Pressable onPress={() => handleTogglePriority(item.id)}>
              <MaterialIcons
                name={item.isPriority ? "star" : "star-border"}
                size={20}
                color={item.isPriority ? "#D4AF37" : colors.muted}
              />
            </Pressable>
          </View>
          
          {item.brand && (
            <Text style={[styles.itemBrand, { color: colors.muted }]}>{item.brand}</Text>
          )}
          
          <View style={styles.itemFooter}>
            <Text style={[styles.itemPrice, { color: colors.primary }]}>
              ${item.price.toFixed(2)}
            </Text>
            
            {scoreInfo && (
              <View style={[styles.scoreBadge, { backgroundColor: scoreInfo.color }]}>
                <Text style={styles.scoreText}>{blendResult?.overallScore}%</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.itemActions}>
          {item.link && (
            <Pressable
              onPress={() => handleOpenLink(item.link!)}
              style={[styles.actionButton, { backgroundColor: colors.background }]}
            >
              <MaterialIcons name="open-in-new" size={16} color={colors.primary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => handleDeleteItem(item.id)}
            style={[styles.actionButton, { backgroundColor: colors.background }]}
          >
            <MaterialIcons name="delete-outline" size={16} color={colors.error} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderBlendResult = () => {
    if (!selectedItem || !blendResult) return null;

    const scoreInfo = getBlendScoreLabel(blendResult.overallScore);

    return (
      <View style={[styles.blendContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.blendHeader}>
          <Text style={[styles.blendTitle, { color: colors.foreground }]}>
            Wardrobe Blend Analysis
          </Text>
          <Pressable onPress={() => { setSelectedItem(null); setBlendResult(null); }}>
            <MaterialIcons name="close" size={24} color={colors.muted} />
          </Pressable>
        </View>

        {/* Score */}
        <View style={styles.scoreSection}>
          <View style={[styles.scoreCircle, { borderColor: scoreInfo.color }]}>
            <Text style={[styles.scoreValue, { color: scoreInfo.color }]}>
              {blendResult.overallScore}%
            </Text>
          </View>
          <Text style={[styles.scoreLabel, { color: scoreInfo.color }]}>
            {scoreInfo.label}
          </Text>
          <Text style={[styles.scoreDescription, { color: colors.muted }]}>
            This item would blend well with {blendResult.compatibleItems.length} items in your closet
          </Text>
        </View>

        {/* Compatible Items */}
        {blendResult.compatibleItems.length > 0 && (
          <View style={styles.compatibleSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Best Matches
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {blendResult.compatibleItems.slice(0, 6).map((item) => (
                <View key={item.id} style={styles.compatibleItem}>
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.compatibleImage}
                    contentFit="cover"
                  />
                  <Text style={[styles.compatibleLabel, { color: colors.muted }]} numberOfLines={1}>
                    {item.brand || item.type}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Outfit Suggestions */}
        {blendResult.outfitSuggestions.length > 0 && (
          <View style={styles.outfitsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Outfit Ideas
            </Text>
            {blendResult.outfitSuggestions.map((outfit, index) => (
              <View key={outfit.id} style={[styles.outfitCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.outfitLabel, { color: colors.foreground }]}>
                  Look {index + 1} ({outfit.score}% match)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {outfit.items.map((item, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: item.imageUri }}
                      style={styles.outfitItemImage}
                      contentFit="cover"
                    />
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Wishlist</Text>
        <Pressable onPress={() => setShowAddModal(true)}>
          <MaterialIcons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <Text style={[styles.subtitle, { color: colors.muted }]}>
        See how items blend with your wardrobe before buying
      </Text>

      {wishlistItems.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="favorite-border" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Your Wishlist is Empty
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Add items you're considering buying to see how they'll blend with your current wardrobe
          </Text>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add" size={20} color={colors.background} />
            <Text style={[styles.addButtonText, { color: colors.background }]}>
              Add Item
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={wishlistItems}
            keyExtractor={(item) => item.id}
            renderItem={renderWishlistItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />

          {/* Blend Result Panel */}
          {(selectedItem || isCalculatingBlend) && (
            <Modal
              visible={true}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => { setSelectedItem(null); setBlendResult(null); }}
            >
              <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                {isCalculatingBlend ? (
                  <View style={styles.loadingState}>
                    <MaterialIcons name="auto-awesome" size={48} color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.foreground }]}>
                      Analyzing wardrobe compatibility...
                    </Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {renderBlendResult()}
                  </ScrollView>
                )}
              </View>
            </Modal>
          )}
        </>
      )}

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add to Wishlist</Text>
            <Pressable onPress={handleSaveItem}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Image Picker */}
            <Pressable onPress={pickImage} style={[styles.imagePicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.pickedImage} contentFit="cover" />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <MaterialIcons name="add-photo-alternate" size={40} color={colors.muted} />
                  <Text style={[styles.imagePickerText, { color: colors.muted }]}>Add Photo</Text>
                </View>
              )}
            </Pressable>

            {/* Name */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g., Wool Blazer"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Brand & Price */}
            <View style={styles.formRow}>
              <View style={[styles.formSection, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Brand</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Brand name"
                  placeholderTextColor={colors.muted}
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>
              <View style={[styles.formSection, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Price</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="$0.00"
                  placeholderTextColor={colors.muted}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Link */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Link (optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="https://..."
                placeholderTextColor={colors.muted}
                value={link}
                onChangeText={setLink}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            {/* Category */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: category === cat.key ? colors.primary : colors.surface,
                        borderColor: category === cat.key ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={cat.icon as any}
                      size={16}
                      color={category === cat.key ? colors.background : colors.foreground}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        { color: category === cat.key ? colors.background : colors.foreground },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Color */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.colorPill,
                      {
                        backgroundColor: color === c ? colors.primary : colors.surface,
                        borderColor: color === c ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.colorText,
                        { color: color === c ? colors.background : colors.foreground },
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Notes */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Notes</Text>
              <TextInput
                style={[styles.formInput, styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Any notes about this item..."
                placeholderTextColor={colors.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
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
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  itemBrand: {
    fontSize: 13,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  itemActions: {
    justifyContent: "center",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
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
  imagePicker: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
    marginBottom: 20,
  },
  pickedImage: {
    width: "100%",
    height: "100%",
  },
  imagePickerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
  },
  formSection: {
    marginBottom: 16,
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
  notesInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "500",
  },
  colorPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  colorText: {
    fontSize: 13,
    fontWeight: "500",
  },
  blendContainer: {
    flex: 1,
    padding: 16,
  },
  blendHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  blendTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  scoreSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "800",
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  scoreDescription: {
    fontSize: 14,
    textAlign: "center",
  },
  compatibleSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  compatibleItem: {
    marginRight: 12,
    alignItems: "center",
  },
  compatibleImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  compatibleLabel: {
    fontSize: 11,
    marginTop: 4,
    maxWidth: 70,
    textAlign: "center",
  },
  outfitsSection: {
    marginBottom: 24,
  },
  outfitCard: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  outfitLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  outfitItemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 8,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
