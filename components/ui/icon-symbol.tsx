// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for FitCheck
 */
const MAPPING = {
  // Tab icons
  "house.fill": "home",
  "hanger": "checkroom",
  "wand.and.stars": "auto-awesome",
  "calendar": "event",
  "person.2.fill": "groups",
  "person.fill": "person",
  // Action icons
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "camera.fill": "camera-alt",
  "photo.fill": "photo-library",
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "bookmark.fill": "bookmark",
  "bookmark": "bookmark-border",
  "magnifyingglass": "search",
  "slider.horizontal.3": "tune",
  "xmark": "close",
  "checkmark": "check",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "ellipsis": "more-horiz",
  "trash.fill": "delete",
  "pencil": "edit",
  "square.and.arrow.up": "share",
  "gearshape.fill": "settings",
  "tag.fill": "local-offer",
  "dollarsign.circle.fill": "attach-money",
  "chart.bar.fill": "bar-chart",
  "arrow.clockwise": "refresh",
  "sparkles": "auto-awesome",
  "tshirt.fill": "checkroom",
  "shoe.fill": "ice-skating",
  "bag.fill": "shopping-bag",
  "eyeglasses": "visibility",
  "crown.fill": "workspace-premium",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
