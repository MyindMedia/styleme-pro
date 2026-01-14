import {
  ClothingItem,
  WearLog,
  ClothingCategory,
  getClothingItems,
  getWearLogs,
  calculateCostPerWear,
  SEASON_WEIGHTS,
  SEASONS,
  OCCASIONS,
} from "./storage";

export interface AnalyticsSummary {
  totalItems: number;
  totalValue: number;
  avgCostPerWear: number;
  mostWornItems: ClothingItem[];
  leastWornItems: ClothingItem[];
  categoryBreakdown: {
    labels: string[];
    data: number[];
    colors: string[];
  };
  colorBreakdown: {
    labels: string[];
    data: number[];
    colors: string[];
  };
  valueByCategory: {
    labels: string[];
    data: number[];
    colors: string[];
  };
  topBrands: {
    name: string;
    count: number;
  }[];
  monthlySpend: number; // Avg spend per month (based on creation date)
}

const CHART_COLORS = [
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

// Helper to generate color palette
function generateColors(count: number): string[] {
  return Array(count).fill(0).map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [items, logs] = await Promise.all([
    getClothingItems(),
    getWearLogs(),
  ]);

  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  
  // Avg Cost Per Wear
  // Filter out items with 0 wear count to avoid skewing (or treat as purchase price)
  // Here we consider "active" wardrobe
  const itemsWithWears = items.filter(i => i.wearCount > 0);
  const avgCostPerWear = itemsWithWears.length > 0 
    ? itemsWithWears.reduce((sum, item) => sum + calculateCostPerWear(item), 0) / itemsWithWears.length
    : 0;

  // Most/Least Worn
  const sortedByWear = [...items].sort((a, b) => b.wearCount - a.wearCount);
  const mostWornItems = sortedByWear.slice(0, 5);
  // Least worn: items older than 30 days with 0 wears, or lowest wear count
  const leastWornItems = sortedByWear.reverse().slice(0, 5);

  // Category Breakdown
  const catCounts: Record<string, number> = {};
  items.forEach(item => {
    const cat = item.category.charAt(0).toUpperCase() + item.category.slice(1);
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });
  
  const catLabels = Object.keys(catCounts);
  const catData = Object.values(catCounts);

  // Color Breakdown
  const colorCounts: Record<string, number> = {};
  items.forEach(item => {
    // Normalize color (simple grouping)
    const color = item.color.trim();
    if (color) {
        const c = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
        colorCounts[c] = (colorCounts[c] || 0) + 1;
    }
  });

  // Sort colors by count and take top 6, group others
  const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
  const topColors = sortedColors.slice(0, 6);
  const otherColorsCount = sortedColors.slice(6).reduce((sum, [, count]) => sum + count, 0);
  
  if (otherColorsCount > 0) {
    topColors.push(["Others", otherColorsCount]);
  }

  const colorLabels = topColors.map(([label]) => label);
  const colorData = topColors.map(([, count]) => count);

  // Value by Category
  const valueByCat: Record<string, number> = {};
  items.forEach(item => {
    const cat = item.category.charAt(0).toUpperCase() + item.category.slice(1);
    valueByCat[cat] = (valueByCat[cat] || 0) + (item.purchasePrice || 0);
  });
  
  const valLabels = Object.keys(valueByCat);
  const valData = Object.values(valueByCat);

  // Top Brands
  const brandCounts: Record<string, number> = {};
  items.forEach(item => {
    if (item.brand && item.brand !== "Other") {
        brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
    }
  });
  const topBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Monthly Spend Estimate (Average over last 12 months)
  // This is a rough estimate based on createdAt
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  const itemsLastYear = items.filter(i => new Date(i.createdAt) > oneYearAgo);
  const spendLastYear = itemsLastYear.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);
  const monthlySpend = spendLastYear / 12;

  return {
    totalItems,
    totalValue,
    avgCostPerWear,
    mostWornItems,
    leastWornItems,
    categoryBreakdown: {
      labels: catLabels,
      data: catData,
      colors: generateColors(catLabels.length),
    },
    colorBreakdown: {
      labels: colorLabels,
      data: colorData,
      colors: generateColors(colorLabels.length),
    },
    valueByCategory: {
      labels: valLabels,
      data: valData,
      colors: generateColors(valLabels.length),
    },
    topBrands,
    monthlySpend,
  };
}
