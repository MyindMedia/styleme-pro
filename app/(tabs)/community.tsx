import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { CommunityPost, getCommunityPosts, getStyleOfTheDay } from "@/lib/storage";

const { width } = Dimensions.get("window");

// Sample community posts for demo
const SAMPLE_POSTS: CommunityPost[] = [
  {
    id: "demo-1",
    userId: "user-1",
    userName: "Sarah M.",
    userAvatar: undefined,
    imageUri: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
    itemIds: [],
    mood: "old-money",
    likes: 234,
    isStyleOfTheDay: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    userId: "user-2",
    userName: "Alex K.",
    userAvatar: undefined,
    imageUri: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400",
    itemIds: [],
    mood: "streetwear",
    likes: 189,
    isStyleOfTheDay: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "demo-3",
    userId: "user-3",
    userName: "Jordan T.",
    userAvatar: undefined,
    imageUri: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400",
    itemIds: [],
    mood: "casual",
    likes: 156,
    isStyleOfTheDay: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "demo-4",
    userId: "user-4",
    userName: "Morgan L.",
    userAvatar: undefined,
    imageUri: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400",
    itemIds: [],
    mood: "corporate",
    likes: 142,
    isStyleOfTheDay: false,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "demo-5",
    userId: "user-5",
    userName: "Casey R.",
    userAvatar: undefined,
    imageUri: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400",
    itemIds: [],
    mood: "date-night",
    likes: 198,
    isStyleOfTheDay: false,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "demo-6",
    userId: "user-6",
    userName: "Riley P.",
    userAvatar: undefined,
    imageUri: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400",
    itemIds: [],
    mood: "athleisure",
    likes: 167,
    isStyleOfTheDay: false,
    createdAt: new Date(Date.now() - 18000000).toISOString(),
  },
];

const MOOD_COLORS: Record<string, string> = {
  "old-money": "#D4AF37",
  streetwear: "#FF6B6B",
  corporate: "#4A5568",
  casual: "#48BB78",
  "date-night": "#ED64A6",
  athleisure: "#4299E1",
};

export default function CommunityScreen() {
  const colors = useColors();
  const [posts, setPosts] = useState<CommunityPost[]>(SAMPLE_POSTS);
  const [styleOfTheDay, setStyleOfTheDay] = useState<CommunityPost | null>(
    SAMPLE_POSTS.find((p) => p.isStyleOfTheDay) || null
  );
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  const loadPosts = useCallback(async () => {
    const [userPosts, sotd] = await Promise.all([
      getCommunityPosts(),
      getStyleOfTheDay(),
    ]);
    
    // Merge user posts with sample posts
    const allPosts = [...userPosts, ...SAMPLE_POSTS];
    setPosts(allPosts);
    setStyleOfTheDay(sotd || SAMPLE_POSTS.find((p) => p.isStyleOfTheDay) || null);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, [loadPosts]);

  const handleLike = (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleSave = (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSavedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const feedPosts = posts.filter((p) => !p.isStyleOfTheDay);

  const renderPost = ({ item, index }: { item: CommunityPost; index: number }) => {
    const isLiked = likedPosts.has(item.id);
    const isSaved = savedPosts.has(item.id);
    const isLeftColumn = index % 2 === 0;
    const imageHeight = isLeftColumn ? 220 : 180;

    return (
      <View
        style={[
          styles.postCard,
          { backgroundColor: colors.surface, width: (width - 40) / 2 },
        ]}
      >
        <Image
          source={{ uri: item.imageUri }}
          style={[styles.postImage, { height: imageHeight }]}
          contentFit="cover"
          transition={200}
        />
        
        {item.mood && (
          <View
            style={[
              styles.moodBadge,
              { backgroundColor: MOOD_COLORS[item.mood] || colors.primary },
            ]}
          >
            <Text style={styles.moodBadgeText}>
              {item.mood.replace("-", " ")}
            </Text>
          </View>
        )}

        <View style={styles.postFooter}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
              <Text style={styles.avatarText}>
                {item.userName.charAt(0)}
              </Text>
            </View>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {item.userName}
            </Text>
          </View>

          <View style={styles.postActions}>
            <Pressable
              onPress={() => handleLike(item.id)}
              style={styles.actionButton}
            >
              <MaterialIcons
                name={isLiked ? "favorite" : "favorite-border"}
                size={18}
                color={isLiked ? "#EF4444" : colors.muted}
              />
              <Text style={[styles.actionCount, { color: colors.muted }]}>
                {item.likes + (isLiked ? 1 : 0)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSave(item.id)}
              style={styles.actionButton}
            >
              <MaterialIcons
                name={isSaved ? "bookmark" : "bookmark-border"}
                size={18}
                color={isSaved ? colors.primary : colors.muted}
              />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Community</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Get inspired by the community
          </Text>
        </View>

        {/* Style of the Day */}
        {styleOfTheDay && (
          <View style={styles.sotdSection}>
            <View style={styles.sotdHeader}>
              <MaterialIcons name="workspace-premium" size={20} color="#D4AF37" />
              <Text style={[styles.sotdTitle, { color: colors.foreground }]}>
                Style of the Day
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.sotdCard,
                { opacity: pressed ? 0.95 : 1 },
              ]}
            >
              <Image
                source={{ uri: styleOfTheDay.imageUri }}
                style={styles.sotdImage}
                contentFit="cover"
                transition={200}
              />
              <View style={[styles.sotdOverlay, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
                <View style={styles.sotdUserRow}>
                  <View style={[styles.sotdAvatar, { backgroundColor: "#fff" }]}>
                    <Text style={styles.sotdAvatarText}>
                      {styleOfTheDay.userName.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.sotdUserName}>{styleOfTheDay.userName}</Text>
                    <Text style={styles.sotdMood}>
                      {styleOfTheDay.mood?.replace("-", " ") || "Featured Look"}
                    </Text>
                  </View>
                </View>
                <View style={styles.sotdStats}>
                  <MaterialIcons name="favorite" size={16} color="#fff" />
                  <Text style={styles.sotdLikes}>{styleOfTheDay.likes}</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* Community Feed */}
        <View style={styles.feedSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Latest Looks
          </Text>
          <View style={styles.masonryContainer}>
            <View style={styles.masonryColumn}>
              {feedPosts
                .filter((_, i) => i % 2 === 0)
                .map((post, index) => (
                  <View key={post.id}>{renderPost({ item: post, index: index * 2 })}</View>
                ))}
            </View>
            <View style={styles.masonryColumn}>
              {feedPosts
                .filter((_, i) => i % 2 === 1)
                .map((post, index) => (
                  <View key={post.id}>{renderPost({ item: post, index: index * 2 + 1 })}</View>
                ))}
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  sotdSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sotdHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sotdTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sotdCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  sotdImage: {
    width: "100%",
    height: 280,
  },
  sotdOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sotdUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sotdAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sotdAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  sotdUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  sotdMood: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textTransform: "capitalize",
  },
  sotdStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sotdLikes: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  feedSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  masonryContainer: {
    flexDirection: "row",
    gap: 8,
  },
  masonryColumn: {
    flex: 1,
    gap: 8,
  },
  postCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  postImage: {
    width: "100%",
  },
  moodBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  postFooter: {
    padding: 10,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  userName: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: "500",
  },
});
