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
  ActivityIndicator,
  Linking,
  Switch,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClothingCategory,
  ClothingItem,
  GarmentMeasurements,
  Occasion,
  Season,
  saveClothingItem,
  generateId,
  CLOTHING_TYPES,
  OCCASIONS,
  SEASONS,
  POPULAR_BRANDS,
} from "@/lib/storage";

type RecognitionStep = "input" | "analyzing" | "review" | "manual" | "searching";

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
  const { isPro } = useAuth();

  // Recognition flow state
  const [step, setStep] = useState<RecognitionStep>("input");
  const [productUrl, setProductUrl] = useState("");
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [recognitionConfidence, setRecognitionConfidence] = useState<number>(0);

  // Item state
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Scraped product details
  const [fabric, setFabric] = useState("");
  const [measurements, setMeasurements] = useState<GarmentMeasurements | null>(null);
  const [scrapedProductUrl, setScrapedProductUrl] = useState<string | null>(null);
  const [fit, setFit] = useState<"slim" | "regular" | "relaxed" | "oversized" | null>(null);
  const [size, setSize] = useState("");
  const [removeBackground, setRemoveBackground] = useState(true);
  const [processingBackground, setProcessingBackground] = useState(false);
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);

  // tRPC mutations
  const recognizeFromImage = trpc.clothing.recognizeFromImage.useMutation();
  const recognizeFromUrl = trpc.clothing.recognizeFromUrl.useMutation();
  const reverseImageSearch = trpc.clothing.reverseImageSearch.useMutation();
  const removeBackgroundMutation = trpc.imageProcessing.removeBackground.useMutation();

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
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setOriginalImageUri(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Start AI recognition and background removal
      analyzeImage(uri);
    }
  };

  const processBackgroundRemoval = async (uri: string) => {
    if (!removeBackground) return;

    try {
      setProcessingBackground(true);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      const result = await removeBackgroundMutation.mutateAsync({
        imageBase64: base64,
        mimeType: "image/jpeg",
        type: "product",
      });

      if (result.success && result.processedImageBase64) {
        const tempPath = `${FileSystem.cacheDirectory}processed_${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(tempPath, result.processedImageBase64, {
          encoding: "base64",
        });
        setImageUri(tempPath);
      }
    } catch (error) {
      console.error("Background removal failed:", error);
      // Fallback to original image silently
    } finally {
      setProcessingBackground(false);
    }
  };

  const analyzeImage = async (uri: string) => {
    setStep("analyzing");
    setRecognitionError(null);

    // Start background removal in parallel if enabled
    if (removeBackground) {
      processBackgroundRemoval(uri);
    }

    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      const result = await recognizeFromImage.mutateAsync({
        imageBase64: base64,
        mimeType: "image/jpeg",
      });

      if (result.success && result.item) {
        // Apply recognized values
        applyRecognizedItem(result.item);
        setRecognitionConfidence(result.item.confidence || 0.8);
        setStep("review");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setRecognitionError(result.error || "Could not recognize item");
        setStep("manual");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.error("Recognition error:", error);
      setRecognitionError("Recognition failed. Please enter details manually.");
      setStep("manual");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const analyzeUrl = async () => {
    if (!productUrl.trim()) {
      Alert.alert("Missing URL", "Please enter a product URL.");
      return;
    }

    setStep("analyzing");
    setRecognitionError(null);

    try {
      const result = await recognizeFromUrl.mutateAsync({
        productUrl: productUrl.trim(),
      });

      if (result.success && result.item) {
        // Apply recognized values
        applyRecognizedItem(result.item);

        // If there's an image URL, set it
        if (result.item.imageUrl) {
          setImageUri(result.item.imageUrl);
        }

        setRecognitionConfidence(0.9); // URL scraping is usually accurate
        setStep("review");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Check if there are suggestions for the user
        const suggestions = (result as any).suggestions as string[] | undefined;
        let errorMessage = result.error || "Could not extract product details";

        // If it's a protected site, show a more helpful alert
        if ((result as any).protectedSite || suggestions) {
          Alert.alert(
            "Protected Website",
            errorMessage,
            [
              { text: "Enter Manually", onPress: () => setStep("manual") },
              {
                text: "Upload Screenshot",
                onPress: () => {
                  setProductUrl("");
                  setStep("input");
                }
              },
            ]
          );
          setRecognitionError(null);
          return;
        }

        setRecognitionError(errorMessage);
        setStep("manual");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.error("URL scraping error:", error);
      setRecognitionError("Could not fetch product details. Please enter manually.");
      setStep("manual");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const searchOnlineForItem = async () => {
    if (!imageUri) return;

    setStep("searching");
    setSearchResults([]);

    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: "base64",
      });

      // Build item description from current state
      const itemDescription = `${brand ? brand + " " : ""}${selectedColor} ${type} ${category}`.trim();

      const result = await reverseImageSearch.mutateAsync({
        imageBase64: base64,
        mimeType: "image/jpeg",
        itemDescription,
      });

      if (result.success && result.matches && result.matches.length > 0) {
        setSearchResults(result.matches);
        setSearchQuery(result.searchQuery || itemDescription);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setSearchResults([]);
        setSearchQuery(result.searchQuery || itemDescription);
        Alert.alert("No Results", "No matching products found online. Try adding more details about the item.");
      }

      setStep("review");
    } catch (error) {
      console.error("Reverse image search error:", error);
      Alert.alert("Search Failed", "Could not search for this item online. Please try again.");
      setStep("review");
    }
  };

  const applyRecognizedItem = (item: any) => {
    // Map category
    const categoryMap: Record<string, ClothingCategory> = {
      tops: "tops",
      bottoms: "bottoms",
      shoes: "shoes",
      accessories: "accessories",
      outerwear: "outerwear",
      dresses: "dresses",
    };
    
    if (item.category && categoryMap[item.category.toLowerCase()]) {
      setCategory(categoryMap[item.category.toLowerCase()]);
    }

    // Set type
    if (item.type) {
      setType(item.type.toLowerCase().replace(/\s+/g, "-"));
    }

    // Set color
    if (item.color) {
      const matchedColor = COLORS.find(
        (c) => c.name.toLowerCase() === item.color.toLowerCase()
      );
      if (matchedColor) {
        setSelectedColor(matchedColor.name);
      }
    }

    // Set brand
    if (item.brand && item.brand !== "Unknown") {
      setBrand(item.brand);
    }

    // Set price
    if (item.price || item.estimatedPrice) {
      setPrice(String(item.price || item.estimatedPrice));
    }

    // Set occasions
    if (item.occasions && Array.isArray(item.occasions)) {
      const validOccasions = item.occasions.filter((o: string) =>
        OCCASIONS.some((occ) => occ.key === o.toLowerCase())
      ) as Occasion[];
      if (validOccasions.length > 0) {
        setSelectedOccasions(validOccasions);
      }
    }

    // Set seasons
    if (item.seasons && Array.isArray(item.seasons)) {
      const validSeasons = item.seasons.filter((s: string) =>
        SEASONS.some((sea) => sea.key === s.toLowerCase())
      ) as Season[];
      if (validSeasons.length > 0) {
        setSelectedSeasons(validSeasons);
      }
    }

    // Set material/fabric
    if (item.material) {
      setFabric(item.material);
    }

    // Set measurements if available
    if (item.measurements) {
      setMeasurements(item.measurements);
    }

    // Set fit type
    if (item.fit) {
      const validFits = ["slim", "regular", "relaxed", "oversized"];
      if (validFits.includes(item.fit.toLowerCase())) {
        setFit(item.fit.toLowerCase() as "slim" | "regular" | "relaxed" | "oversized");
      }
    }

    // Set size label
    if (item.sizeLabel) {
      setSize(item.sizeLabel);
    }

    // Set product URL
    if (item.productUrl) {
      setScrapedProductUrl(item.productUrl);
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
      // Scraped/enhanced fields
      fabric: fabric.trim() || undefined,
      size: size.trim() || undefined,
      productUrl: scrapedProductUrl || undefined,
      measurements: measurements ? {
        ...measurements,
        fit: fit || undefined,
        sizeLabel: size.trim() || undefined,
      } : undefined,
    };

    await saveClothingItem(newItem);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const currentTypes = CLOTHING_TYPES[category] || [];

  // Render input step (choose method)
  const renderInputStep = () => (
    <View style={styles.inputStepContainer}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Add New Item</Text>
      <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
        Choose how you want to add your clothing item
      </Text>

      {/* Camera/Gallery Option */}
      <View style={styles.optionSection}>
        <Text style={[styles.optionLabel, { color: colors.foreground }]}>
          Scan with Camera
        </Text>
        <Text style={[styles.optionDescription, { color: colors.muted }]}>
          Take a photo and AI will identify the item
        </Text>
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
      </View>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.muted }]}>OR</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* URL Option */}
      <View style={styles.optionSection}>
        <Text style={[styles.optionLabel, { color: colors.foreground }]}>
          Paste Product Link
        </Text>
        <Text style={[styles.optionDescription, { color: colors.muted }]}>
          Enter a URL from any online store
        </Text>
        <View style={[styles.urlInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="link" size={20} color={colors.muted} />
          <TextInput
            style={[styles.urlInput, { color: colors.foreground }]}
            placeholder="https://store.com/product..."
            placeholderTextColor={colors.muted}
            value={productUrl}
            onChangeText={setProductUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
        <Pressable
          onPress={analyzeUrl}
          disabled={!productUrl.trim()}
          style={[
            styles.fetchButton,
            {
              backgroundColor: productUrl.trim() ? colors.primary : colors.surface,
              opacity: productUrl.trim() ? 1 : 0.5,
            },
          ]}
        >
          <MaterialIcons name="download" size={18} color={productUrl.trim() ? colors.background : colors.muted} />
          <Text style={[styles.fetchButtonText, { color: productUrl.trim() ? colors.background : colors.muted }]}>
            Fetch Details
          </Text>
        </Pressable>
      </View>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.muted }]}>OR</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Manual Option */}
      <Pressable
        onPress={() => setStep("manual")}
        style={[styles.manualButton, { borderColor: colors.border }]}
      >
        <MaterialIcons name="edit" size={20} color={colors.foreground} />
        <Text style={[styles.manualButtonText, { color: colors.foreground }]}>
          Enter Details Manually
        </Text>
      </Pressable>
    </View>
  );

  // Render analyzing step
  const renderAnalyzingStep = () => (
    <View style={styles.analyzingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.analyzingText, { color: colors.foreground }]}>
        Analyzing your item...
      </Text>
      <Text style={[styles.analyzingSubtext, { color: colors.muted }]}>
        AI is identifying brand, category, and details
      </Text>
    </View>
  );

  // Render searching step
  const renderSearchingStep = () => (
    <View style={styles.analyzingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.analyzingText, { color: colors.foreground }]}>
        Searching online...
      </Text>
      <Text style={[styles.analyzingSubtext, { color: colors.muted }]}>
        Finding matching products from stores
      </Text>
    </View>
  );

  // Render search results section
  const renderSearchResults = () => {
    if (searchResults.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Found Online ({searchResults.length} matches)
        </Text>
        {searchQuery && (
          <Text style={[styles.searchQueryText, { color: colors.muted }]}>
            {`Search: "${searchQuery}"`}
          </Text>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.searchResultsScroll}>
          <View style={styles.searchResultsRow}>
            {searchResults.map((result, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  if (result.url) {
                    Alert.alert(
                      result.name || "Product",
                      `${result.store || "Store"}\n${result.price || ""}\n\nWhat would you like to do?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Open Link",
                          onPress: () => Linking.openURL(result.url)
                        },
                        // Only show "Use Price" if it looks like a real price (contains numbers)
                        ...(result.price && /\d/.test(result.price) ? [{
                          text: "Use Price",
                          onPress: () => {
                            const priceValue = result.price?.replace(/[^0-9.]/g, "");
                            if (priceValue) setPrice(priceValue);
                            if (result.brand) setBrand(result.brand);
                          }
                        }] : [])
                      ]
                    );
                  }
                }}
                style={[styles.searchResultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {result.imageUrl && (
                  <Image source={{ uri: result.imageUrl }} style={styles.searchResultImage} contentFit="cover" />
                )}
                <View style={styles.searchResultInfo}>
                  <Text style={[styles.searchResultName, { color: colors.foreground }]} numberOfLines={2}>
                    {result.name || "Product"}
                  </Text>
                  <Text style={[styles.searchResultStore, { color: colors.muted }]} numberOfLines={1}>
                    {result.store || "Store"}
                  </Text>
                  {result.price && (
                    <Text style={[styles.searchResultPrice, { color: colors.primary }]}>
                      {result.price}
                    </Text>
                  )}
                  {result.similarity && (
                    <View style={[styles.similarityBadge, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.similarityText, { color: colors.primary }]}>
                        {result.similarity}% match
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Render review step (after recognition)
  const renderReviewStep = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Recognition Result Banner */}
      <View style={[styles.recognitionBanner, { backgroundColor: colors.success + "20" }]}>
        <MaterialIcons name="auto-awesome" size={20} color={colors.success} />
        <View style={styles.recognitionBannerText}>
          <Text style={[styles.recognitionTitle, { color: colors.success }]}>
            Item Recognized!
          </Text>
          <Text style={[styles.recognitionSubtitle, { color: colors.muted }]}>
            {Math.round(recognitionConfidence * 100)}% confidence • Review and adjust if needed
          </Text>
        </View>
      </View>

      {/* Search Online Button */}
      <Pressable
        onPress={searchOnlineForItem}
        disabled={reverseImageSearch.isPending}
        style={[
          styles.searchOnlineButton,
          {
            backgroundColor: colors.primary + "15",
            borderColor: colors.primary,
            opacity: reverseImageSearch.isPending ? 0.5 : 1,
          },
        ]}
      >
        <MaterialIcons name="search" size={20} color={colors.primary} />
        <Text style={[styles.searchOnlineText, { color: colors.primary }]}>
          {reverseImageSearch.isPending ? "Searching..." : "Search for this item online"}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
      </Pressable>

      {/* Search Results */}
      {renderSearchResults()}

      {renderItemForm()}
    </ScrollView>
  );

  // Render manual entry step
  const renderManualStep = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {recognitionError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.warning + "20" }]}>
          <MaterialIcons name="info-outline" size={20} color={colors.warning} />
          <Text style={[styles.errorText, { color: colors.warning }]}>
            {recognitionError}
          </Text>
        </View>
      )}

      {/* Image Picker if no image yet */}
      {!imageUri && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Photo</Text>
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
        </View>
      )}

      {renderItemForm()}
    </ScrollView>
  );

  // Common item form (used in review and manual steps)
  const renderItemForm = () => (
    <>
      {/* Image Preview */}
      {imageUri && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Photo</Text>
          <View style={styles.imageContainer}>
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="contain" />
              {processingBackground && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
            </View>
            <Pressable
              onPress={() => {
                setImageUri(null);
                setOriginalImageUri(null);
                setStep("input");
              }}
              style={[styles.removeImageButton, { backgroundColor: colors.error }]}
            >
              <MaterialIcons name="close" size={16} color="#fff" />
            </Pressable>
          </View>
          
          {originalImageUri && (
            <View style={styles.bgRemovalToggle}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.bgRemovalText, { color: colors.foreground }]}>Remove Background</Text>
                    {!isPro && (
                        <View style={{ backgroundColor: "#FFD700", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: "bold", color: "black" }}>PRO</Text>
                        </View>
                    )}
                </View>
                {!isPro && <Text style={{ fontSize: 11, color: colors.muted }}>Upgrade to enable AI removal</Text>}
              </View>
              <Switch
                value={removeBackground}
                onValueChange={(val) => {
                  if (val && !isPro) {
                    router.push("/paywall" as any);
                    return;
                  }
                  setRemoveBackground(val);
                  if (val) {
                    processBackgroundRemoval(originalImageUri);
                  } else {
                    setImageUri(originalImageUri);
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          )}
        </View>
      )}

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
    </>
  );

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} showWatermark={true}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (step === "input" || step === "analyzing") {
              router.back();
            } else {
              setStep("input");
              setRecognitionError(null);
            }
          }}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialIcons 
            name={step === "input" || step === "analyzing" ? "close" : "arrow-back"} 
            size={24} 
            color={colors.foreground} 
          />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {step === "input" ? "Add Item" : step === "analyzing" ? "Analyzing..." : "Item Details"}
        </Text>
        {(step === "review" || step === "manual") ? (
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
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {step === "input" && renderInputStep()}
      {step === "analyzing" && renderAnalyzingStep()}
      {step === "searching" && renderSearchingStep()}
      {step === "review" && renderReviewStep()}
      {step === "manual" && renderManualStep()}

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
                {`Use "${brandSearch}"`}
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
  // Input step styles
  inputStepContainer: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  optionSection: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  imagePickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  imagePickerButton: {
    flex: 1,
    height: 100,
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
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: "500",
  },
  urlInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  urlInput: {
    flex: 1,
    fontSize: 15,
  },
  fetchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 22,
    gap: 8,
  },
  fetchButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  manualButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  manualButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  // Analyzing step styles
  analyzingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  analyzingText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 24,
  },
  analyzingSubtext: {
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },
  // Recognition banner
  recognitionBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  recognitionBannerText: {
    flex: 1,
  },
  recognitionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  recognitionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  // Form styles
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
  // Modal styles
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
  // Search online styles
  searchOnlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  searchOnlineText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 12,
  },
  searchQueryText: {
    fontSize: 13,
    marginBottom: 12,
  },
  searchResultsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  searchResultsRow: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 16,
  },
  searchResultCard: {
    width: 160,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchResultImage: {
    width: 160,
    height: 120,
  },
  searchResultInfo: {
    padding: 10,
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  searchResultStore: {
    fontSize: 12,
    marginBottom: 4,
  },
  searchResultPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  similarityBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  similarityText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
