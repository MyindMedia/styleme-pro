import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  ClothingCategory,
  ClothingItem,
  Occasion,
  Season,
  saveClothingItem,
  generateId,
  CLOTHING_TYPES,
  OCCASIONS,
  SEASONS,
  POPULAR_BRANDS,
} from "@/lib/storage";

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
  { name: "Black", hex: "#0A0A0A" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Navy", hex: "#1E3A5F" },
  { name: "Gray", hex: "#6B6B6B" },
  { name: "Beige", hex: "#D4C5B5" },
  { name: "Brown", hex: "#8B4513" },
  { name: "Red", hex: "#DC2626" },
  { name: "Blue", hex: "#2563EB" },
  { name: "Green", hex: "#16A34A" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Purple", hex: "#9333EA" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Cream", hex: "#FFFDD0" },
];

export default function AddItemScreen() {
  const colors = useColors();
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<ClothingCategory>("tops");
  const [type, setType] = useState<string>("t-shirt");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState("");
  const [selectedOccasions, setSelectedOccasions] = useState<Occasion[]>(["casual"]);
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>(["all-season"]);
  const [saving, setSaving] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");

  const filteredBrands = POPULAR_BRANDS.filter((b) =>
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const pickImage = async (useCamera: boolean) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        `Please allow access to your ${useCamera ? "camera" : "photo library"} to add items.`
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const toggleOccasion = (occasion: Occasion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOccasions((prev) =>
      prev.includes(occasion)
        ? prev.filter((o) => o !== occasion)
        : [...prev, occasion]
    );
  };

  const toggleSeason = (season: Season) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSeasons((prev) =>
      prev.includes(season)
        ? prev.filter((s) => s !== season)
        : [...prev, season]
    );
  };

  const handleCategoryChange = (newCategory: ClothingCategory) => {
    setCategory(newCategory);
    // Set default type for new category
    const types = CLOTHING_TYPES[newCategory];
    if (types && types.length > 0) {
      setType(types[0].key);
    }
  };

  const handleSave = async () => {
    if (!imageUri) {
      Alert.alert("Missing Image", "Please add a photo of your item.");
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newItem: ClothingItem = {
      id: generateId(),
      imageUri,
      category,
      type,
      color: selectedColor,
      brand: brand.trim(),
      purchasePrice: parseFloat(price) || 0,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      occasions: selectedOccasions,
      seasons: selectedSeasons,
      createdAt: new Date().toISOString(),
      wearCount: 0,
    };

    await saveClothingItem(newItem);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const currentTypes = CLOTHING_TYPES[category] || [];

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialIcons name="close" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Add Item</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || !imageUri}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: colors.primary,
              opacity: saving || !imageUri ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.saveText, { color: colors.background }]}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Photo</Text>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
              <Pressable
                onPress={() => setImageUri(null)}
                style={[styles.removeImageButton, { backgroundColor: colors.error }]}
              >
                <MaterialIcons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.imagePickerRow}>
              <Pressable
                onPress={() => pickImage(true)}
                style={[styles.imagePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <MaterialIcons name="camera-alt" size={32} color={colors.primary} />
                <Text style={[styles.imagePickerText, { color: colors.foreground }]}>Camera</Text>
              </Pressable>
              <Pressable
                onPress={() => pickImage(false)}
                style={[styles.imagePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <MaterialIcons name="photo-library" size={32} color={colors.primary} />
                <Text style={[styles.imagePickerText, { color: colors.foreground }]}>Gallery</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Category Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleCategoryChange(cat.key);
                  }}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: category === cat.key ? colors.primary : colors.surface,
                      borderColor: category === cat.key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={cat.icon as any}
                    size={18}
                    color={category === cat.key ? colors.background : colors.foreground}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      { color: category === cat.key ? colors.background : colors.foreground },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Type Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeGrid}>
              {currentTypes.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setType(t.key);
                  }}
                  style={[
                    styles.typePill,
                    {
                      backgroundColor: type === t.key ? colors.primary : colors.surface,
                      borderColor: type === t.key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: type === t.key ? colors.background : colors.foreground },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Color Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <Pressable
                  key={c.name}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedColor(c.name);
                  }}
                  style={[
                    styles.colorButton,
                    {
                      backgroundColor: c.hex,
                      borderWidth: selectedColor === c.name ? 3 : 1,
                      borderColor: selectedColor === c.name ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {selectedColor === c.name && (
                    <MaterialIcons
                      name="check"
                      size={16}
                      color={c.name === "White" || c.name === "Beige" || c.name === "Cream" || c.name === "Yellow" ? "#000" : "#fff"}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Text style={[styles.colorLabel, { color: colors.muted }]}>{selectedColor}</Text>
        </View>

        {/* Brand Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Brand</Text>
          <Pressable
            onPress={() => setShowBrandPicker(true)}
            style={[styles.brandSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.brandText, { color: brand ? colors.foreground : colors.muted }]}>
              {brand || "Select or enter brand"}
            </Text>
            <MaterialIcons name="expand-more" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Occasions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Occasions</Text>
          <View style={styles.occasionGrid}>
            {OCCASIONS.map((occ) => (
              <Pressable
                key={occ.key}
                onPress={() => toggleOccasion(occ.key)}
                style={[
                  styles.occasionPill,
                  {
                    backgroundColor: selectedOccasions.includes(occ.key) ? colors.primary : colors.surface,
                    borderColor: selectedOccasions.includes(occ.key) ? colors.primary : colors.border,
                  },
                ]}
              >
                <MaterialIcons
                  name={occ.icon as any}
                  size={16}
                  color={selectedOccasions.includes(occ.key) ? colors.background : colors.foreground}
                />
                <Text
                  style={[
                    styles.occasionText,
                    { color: selectedOccasions.includes(occ.key) ? colors.background : colors.foreground },
                  ]}
                >
                  {occ.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Seasons */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Seasons</Text>
          <View style={styles.seasonGrid}>
            {SEASONS.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => toggleSeason(s.key)}
                style={[
                  styles.seasonPill,
                  {
                    backgroundColor: selectedSeasons.includes(s.key) ? colors.primary : colors.surface,
                    borderColor: selectedSeasons.includes(s.key) ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.seasonText,
                    { color: selectedSeasons.includes(s.key) ? colors.background : colors.foreground },
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Price Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Purchase Price</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="$0.00"
            placeholderTextColor={colors.muted}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>

        {/* Tags Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tags (Optional)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="favorite, vintage, gift (comma separated)"
            placeholderTextColor={colors.muted}
            value={tags}
            onChangeText={setTags}
            returnKeyType="done"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Brand Picker Modal */}
      <Modal
        visible={showBrandPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBrandPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowBrandPicker(false)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Brand</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="search" size={20} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search or enter custom brand"
              placeholderTextColor={colors.muted}
              value={brandSearch}
              onChangeText={setBrandSearch}
              autoFocus
            />
          </View>

          {brandSearch && !filteredBrands.includes(brandSearch) && (
            <Pressable
              onPress={() => {
                setBrand(brandSearch);
                setShowBrandPicker(false);
                setBrandSearch("");
              }}
              style={[styles.customBrandButton, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="add" size={18} color={colors.background} />
              <Text style={[styles.customBrandText, { color: colors.background }]}>
                Use "{brandSearch}"
              </Text>
            </Pressable>
          )}

          <FlatList
            data={filteredBrands}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setBrand(item === "Other" ? "" : item);
                  setShowBrandPicker(false);
                  setBrandSearch("");
                }}
                style={[styles.brandItem, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.brandItemText, { color: colors.foreground }]}>{item}</Text>
                {brand === item && (
                  <MaterialIcons name="check" size={20} color={colors.primary} />
                )}
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  imageContainer: {
    position: "relative",
    alignSelf: "center",
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  imagePickerButton: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: "500",
  },
  categoryGrid: {
    flexDirection: "row",
    gap: 8,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  typeGrid: {
    flexDirection: "row",
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 13,
    fontWeight: "500",
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorLabel: {
    fontSize: 13,
    marginTop: 8,
  },
  brandSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  brandText: {
    fontSize: 16,
  },
  occasionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  occasionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  occasionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  seasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  seasonPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  seasonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  customBrandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  customBrandText: {
    fontSize: 15,
    fontWeight: "600",
  },
  brandItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  brandItemText: {
    fontSize: 16,
  },
});
