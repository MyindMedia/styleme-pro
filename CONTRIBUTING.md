# Contributing to FitCheck

Thank you for your interest in contributing to FitCheck! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Style Guidelines](#code-style-guidelines)
4. [Commit Message Convention](#commit-message-convention)
5. [Pull Request Process](#pull-request-process)
6. [Testing Guidelines](#testing-guidelines)
7. [Project Structure](#project-structure)

---

## Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18.0+ |
| pnpm | 9.0+ |
| Git | 2.0+ |
| Expo Go | Latest (for mobile testing) |

### Initial Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/styleme-pro.git
cd styleme-pro

# 3. Add upstream remote
git remote add upstream https://github.com/MyindMedia/styleme-pro.git

# 4. Install dependencies
pnpm install

# 5. Copy environment variables
cp .env.example .env.local

# 6. Start development server
pnpm dev
```

---

## Development Workflow

### Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/weather-outfits` |
| Bug Fix | `fix/description` | `fix/image-upload-crash` |
| Refactor | `refactor/description` | `refactor/storage-layer` |
| Documentation | `docs/description` | `docs/api-endpoints` |
| Chore | `chore/description` | `chore/update-deps` |

### Workflow Steps

1. **Sync with upstream** before starting new work:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** following the code style guidelines below.

4. **Run checks** before committing:
   ```bash
   pnpm check    # TypeScript type checking
   pnpm lint     # ESLint
   pnpm test     # Run tests
   ```

5. **Commit your changes** using conventional commits.

6. **Push and create a Pull Request**.

---

## Code Style Guidelines

### TypeScript

We use TypeScript for type safety. Follow these guidelines:

```typescript
// ✅ DO: Use explicit types for function parameters and returns
function calculateCostPerWear(price: number, wearCount: number): number {
  return wearCount > 0 ? price / wearCount : price;
}

// ❌ DON'T: Use `any` type
function processItem(item: any) { ... }

// ✅ DO: Use interfaces for object shapes
interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
}

// ✅ DO: Use type unions for constrained values
type ClothingCategory = "tops" | "bottoms" | "shoes" | "accessories";
```

### React Native / Expo

```tsx
// ✅ DO: Use functional components with hooks
export default function MyScreen() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  
  return (
    <ScreenContainer>
      {/* content */}
    </ScreenContainer>
  );
}

// ✅ DO: Always wrap screens with ScreenContainer
import { ScreenContainer } from "@/components/screen-container";

// ✅ DO: Use FlatList for lists, never ScrollView with .map()
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemCard item={item} />}
/>

// ❌ DON'T: Use ScrollView with .map() for lists
<ScrollView>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</ScrollView>
```

### Styling with NativeWind

```tsx
// ✅ DO: Use Tailwind classes via className
<View className="flex-1 p-4 bg-background">
  <Text className="text-lg font-semibold text-foreground">Title</Text>
</View>

// ✅ DO: Use theme tokens (bg-background, text-foreground, etc.)
// These automatically adapt to dark/light mode

// ✅ DO: Use StyleSheet.create() for complex or reusable styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});

// ❌ DON'T: Use inline style objects (causes re-renders)
<View style={{ flex: 1, padding: 16 }}>

// ❌ DON'T: Use className on Pressable (use style prop instead)
<Pressable className="p-4">  // Won't work!
<Pressable style={styles.button}>  // Correct
```

### File Organization

```
// ✅ DO: One component per file
// components/item-card.tsx
export function ItemCard({ item }: ItemCardProps) { ... }

// ✅ DO: Co-locate related files
app/
  item/
    [id].tsx        # Item detail screen
    edit.tsx        # Edit item screen (if needed)

// ✅ DO: Use barrel exports for shared utilities
// lib/index.ts
export * from "./storage";
export * from "./utils";
```

### Imports

```typescript
// ✅ DO: Use path aliases
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { ClothingItem } from "@/lib/storage";

// ❌ DON'T: Use relative paths for deep imports
import { ScreenContainer } from "../../../components/screen-container";

// ✅ DO: Order imports consistently
// 1. React/React Native
import { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";

// 2. External packages
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

// 3. Internal imports (components, hooks, utils)
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

// 4. Types
import type { ClothingItem } from "@/lib/storage";
```

### Haptics & Feedback

```typescript
// ✅ DO: Add haptic feedback for user interactions
import * as Haptics from "expo-haptics";

// Light tap for buttons
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Success notification
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// ✅ DO: Check platform before using haptics
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
```

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, no logic change) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Examples

```bash
# Feature
feat(closet): add category filter to home screen

# Bug fix
fix(add-item): resolve image picker crash on iOS 17

# Documentation
docs(readme): update installation instructions

# Refactor
refactor(storage): migrate from AsyncStorage to MMKV
```

---

## Pull Request Process

### Before Submitting

1. **Ensure all checks pass**:
   ```bash
   pnpm check    # No TypeScript errors
   pnpm lint     # No ESLint warnings
   pnpm test     # All tests pass
   ```

2. **Update documentation** if you've changed APIs or added features.

3. **Add/update tests** for new functionality.

4. **Update info.md changelog** with your changes.

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have added tests for my changes
- [ ] All new and existing tests pass
- [ ] I have updated the documentation
```

### Review Process

1. At least one maintainer must approve the PR.
2. All CI checks must pass.
3. No merge conflicts with `main`.
4. Squash and merge is preferred for clean history.

---

## Testing Guidelines

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test tests/storage.test.ts
```

### Writing Tests

```typescript
// tests/storage.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { saveClothingItem, getClothingItems } from "@/lib/storage";

describe("Storage", () => {
  beforeEach(() => {
    // Clear storage before each test
  });

  it("should save and retrieve clothing items", async () => {
    const item = {
      id: "test-1",
      name: "Test Shirt",
      category: "tops",
    };
    
    await saveClothingItem(item);
    const items = await getClothingItems();
    
    expect(items).toContainEqual(item);
  });
});
```

### Test Coverage

We aim for meaningful test coverage on:
- Storage/data layer functions
- API endpoints (server/routers.ts)
- Complex business logic
- Utility functions

---

## Project Structure

For detailed project structure, see [info.md](./info.md).

### Key Files to Know

| File | Purpose |
|------|---------|
| `app/(tabs)/_layout.tsx` | Tab bar configuration |
| `lib/storage.ts` | Data types and AsyncStorage helpers |
| `server/routers.ts` | API endpoints |
| `theme.config.js` | Color palette (single source of truth) |
| `app.config.ts` | Expo configuration |

---

## Questions?

If you have questions or need help:

1. Check existing [GitHub Issues](https://github.com/MyindMedia/styleme-pro/issues)
2. Open a new issue with the `question` label
3. Reach out to maintainers

Thank you for contributing to FitCheck!
