# Coding Conventions

## Naming Conventions

### Files & Components
- **Functional Components**: PascalCase (`HelloWave.tsx`, `ScreenContainer.tsx`)
- **Utilities/Helpers**: kebab-case (`use-colors.ts`, `cloud-sync.ts`)
- **Hooks**: `use-` prefix (`use-colors.ts`, `use-auth.ts`)
- **Contexts**: PascalCase + `Context` suffix (`AuthContext.tsx`)
- **Screens**: kebab-case for routes (`add-item.tsx`, `oauth/callback.tsx`)

### Functions & Variables
- **React Components**: PascalCase (`export function HelloWave()`)
- **Helper Functions**: camelCase (`detectBotProtection()`)
- **Constants**: UPPER_SNAKE_CASE (`ONBOARDING_KEY`, `COOKIE_NAME`)
- **Types/Interfaces**: PascalCase (`AuthContextType`, `ClothingItem`)

### TypeScript
- **Props Interfaces**: `Props` suffix (`ScreenContainerProps`)
- **Union Types**: For discriminated unions (`ClothingCategory`)

## Code Style

### 100% Functional Components
```tsx
export default function DashboardScreen() {
  const colors = useColors();
  const { user, profile } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);

  const loadData = useCallback(async () => {
    // ...
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return <View>...</View>;
}
```

### Hook Patterns
- Custom hooks in `/hooks` directory
- Use `useCallback` for event handlers
- Proper dependency arrays

### Import Structure
```tsx
// 1. React/React Native core
import { useState, useCallback, useEffect } from "react";
import { Text, View, ScrollView } from "react-native";

// 2. Third-party libraries
import { Image } from "expo-image";
import { useRouter } from "expo-router";

// 3. Relative imports with @/ alias
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
```

### Export Patterns
```tsx
// Utilities - named exports
export function cn(...inputs: ClassValue[]) { }

// Contexts - default + named
export function AuthProvider({ children }) { }
export const AuthContext = createContext<...>();

// Screens - default export
export default function DashboardScreen() { }
```

## Styling Approach

### Primary: NativeWind (Tailwind CSS)
```tsx
<View className="flex-1 bg-background p-4">
  <Text className="text-base font-semibold text-foreground">
    Hello
  </Text>
</View>
```

### Secondary: StyleSheet (Complex Styles)
```tsx
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
});
```

### Utility Function
```tsx
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Color System
```tsx
const colors = useColors();
<View style={{ backgroundColor: colors.surface }} />
```

## Common Patterns

### Safe Area Handling
```tsx
<ScreenContainer edges={["top", "left", "right"]}>
  {/* Content */}
</ScreenContainer>
```

### Refresh Control
```tsx
const [refreshing, setRefreshing] = useState(false);
const onRefresh = useCallback(async () => {
  setRefreshing(true);
  await loadData();
  setRefreshing(false);
}, []);

<ScrollView refreshControl={
  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
}>
```

### Navigation
```tsx
const router = useRouter();
router.push("/add-item");
router.push({ pathname: "/item/[id]", params: { id: item.id } });
```

### List Rendering
```tsx
{items.map((item) => (
  <Pressable key={item.id} onPress={() => router.push(...)}>
    {/* Item content */}
  </Pressable>
))}
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```
