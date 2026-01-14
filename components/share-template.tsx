import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { ClothingItem, WearLog, MoodTag } from "@/lib/storage";

interface ShareTemplateProps {
  items: ClothingItem[];
  log?: WearLog;
  moodTags?: { tag: MoodTag; emoji: string; label: string }[];
}

export function ShareTemplate({ items, log, moodTags }: ShareTemplateProps) {
  const colors = useColors();
  const date = log ? new Date(log.date) : new Date();
  
  // Format date: "Monday, Oct 24"
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>FITCHECK</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        <View style={styles.logoCircle}>
          <MaterialIcons name="checkroom" size={24} color="white" />
        </View>
      </View>

      {/* Main Image (First item or collage) */}
      <View style={styles.mainImageContainer}>
        {log?.imageUri ? (
          <Image source={{ uri: log.imageUri }} style={styles.mainImage} contentFit="cover" />
        ) : (
          <View style={styles.gridContainer}>
            {items.slice(0, 4).map((item, i) => (
              <Image 
                key={item.id} 
                source={{ uri: item.imageUri }} 
                style={[
                  styles.gridImage, 
                  items.length === 1 && { width: "100%", height: "100%" }
                ]} 
                contentFit="cover" 
              />
            ))}
          </View>
        )}
      </View>

      {/* Moods */}
      {log?.moodTags && log.moodTags.length > 0 && (
        <View style={styles.moodsContainer}>
          {log.moodTags.slice(0, 3).map(tag => {
            const mood = moodTags?.find(m => m.tag === tag);
            return (
              <View key={tag} style={styles.moodBadge}>
                <Text style={styles.moodEmoji}>{mood?.emoji}</Text>
                <Text style={styles.moodText}>{mood?.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Item List */}
      <View style={styles.itemsList}>
        <Text style={styles.wearingLabel}>WEARING</Text>
        {items.slice(0, 3).map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.bullet} />
            <Text style={styles.itemText} numberOfLines={1}>
              <Text style={{ fontWeight: "700" }}>{item.brand || "Unknown"}</Text> {item.type}
            </Text>
          </View>
        ))}
        {items.length > 3 && (
          <Text style={styles.moreText}>+ {items.length - 3} more items</Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Styled with FitCheck App</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 1080 / 3, // Scaled down for preview, will capture at higher res
    height: 1920 / 3,
    padding: 24,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  brand: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#111827",
  },
  date: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 4,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  mainImageContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    marginBottom: 24,
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  gridContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridImage: {
    width: "50%",
    height: "50%",
  },
  moodsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  itemsList: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  wearingLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#111827",
  },
  itemText: {
    fontSize: 14,
    color: "#1F2937",
  },
  moreText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 14,
    fontStyle: "italic",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
