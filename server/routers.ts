import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Schema for clothing item recognition response
const clothingRecognitionSchema = {
  name: "clothing_recognition",
  schema: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      item: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name/title of the clothing item" },
          brand: { type: "string", description: "Brand name if identifiable, or 'Unknown'" },
          category: { 
            type: "string", 
            enum: ["tops", "bottoms", "shoes", "accessories", "outerwear", "dresses", "swimwear"],
            description: "Main category of the item"
          },
          type: { 
            type: "string", 
            description: "Specific type (e.g., t-shirt, jeans, sneakers, blazer)"
          },
          color: { type: "string", description: "Primary color of the item" },
          secondaryColor: { type: "string", description: "Secondary color if applicable" },
          pattern: { type: "string", description: "Pattern type (solid, striped, plaid, floral, etc.)" },
          material: { type: "string", description: "Estimated material (cotton, denim, leather, etc.)" },
          style: { 
            type: "string", 
            enum: ["casual", "business", "athletic", "formal", "streetwear", "loungewear"],
            description: "Style category"
          },
          occasions: {
            type: "array",
            items: { type: "string" },
            description: "Suitable occasions (work, casual, party, sport, date-night)"
          },
          seasons: {
            type: "array",
            items: { type: "string" },
            description: "Suitable seasons (spring, summer, fall, winter)"
          },
          estimatedPrice: { type: "number", description: "Estimated retail price in USD" },
          confidence: { type: "number", description: "Confidence score 0-1" }
        },
        required: ["name", "category", "type", "color", "style"]
      },
      searchSuggestions: {
        type: "array",
        items: { type: "string" },
        description: "Search terms to find this item online"
      }
    },
    required: ["success", "item"]
  },
  strict: true
};

// Schema for URL scraping response
const urlScrapingSchema = {
  name: "product_scraping",
  schema: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      item: {
        type: "object",
        properties: {
          name: { type: "string" },
          brand: { type: "string" },
          price: { type: "number" },
          currency: { type: "string" },
          color: { type: "string" },
          category: { type: "string" },
          type: { type: "string" },
          imageUrl: { type: "string" },
          productUrl: { type: "string" },
          description: { type: "string" }
        },
        required: ["name"]
      },
      error: { type: "string" }
    },
    required: ["success"]
  },
  strict: true
};

// Schema for reverse image search results
const reverseImageSearchSchema = {
  name: "reverse_image_search",
  schema: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      matches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Product name" },
            brand: { type: "string", description: "Brand name" },
            price: { type: "string", description: "Price with currency" },
            store: { type: "string", description: "Store/retailer name" },
            url: { type: "string", description: "Product page URL" },
            imageUrl: { type: "string", description: "Product image URL" },
            similarity: { type: "number", description: "Similarity score 0-100" }
          },
          required: ["name", "store"]
        },
        description: "List of matching products found online"
      },
      searchQuery: { type: "string", description: "The search query used" },
      error: { type: "string" }
    },
    required: ["success"]
  },
  strict: true
};

// Schema for weather-based outfit suggestions
const weatherOutfitSchema = {
  name: "weather_outfit",
  schema: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      weather: {
        type: "object",
        properties: {
          temperature: { type: "number", description: "Temperature in Fahrenheit" },
          condition: { type: "string", description: "Weather condition (sunny, cloudy, rainy, etc.)" },
          humidity: { type: "number", description: "Humidity percentage" },
          windSpeed: { type: "number", description: "Wind speed in mph" },
          feelsLike: { type: "number", description: "Feels like temperature" },
          icon: { type: "string", description: "Weather icon code" }
        },
        required: ["temperature", "condition"]
      },
      recommendation: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Brief outfit recommendation summary" },
          layers: { type: "string", description: "Layering advice" },
          fabricSuggestions: { type: "array", items: { type: "string" }, description: "Recommended fabrics" },
          avoidFabrics: { type: "array", items: { type: "string" }, description: "Fabrics to avoid" },
          accessories: { type: "array", items: { type: "string" }, description: "Recommended accessories" },
          colorPalette: { type: "array", items: { type: "string" }, description: "Suggested colors for the weather" }
        },
        required: ["summary"]
      },
      outfitSuggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Outfit name" },
            itemIds: { type: "array", items: { type: "string" }, description: "IDs of items from closet" },
            reason: { type: "string", description: "Why this outfit works for the weather" }
          },
          required: ["name", "itemIds", "reason"]
        },
        description: "Suggested outfits from user's closet"
      },
      error: { type: "string" }
    },
    required: ["success"]
  },
  strict: true
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Clothing recognition endpoints
  clothing: router({
    // Recognize clothing from image using AI vision
    recognizeFromImage: publicProcedure
      .input(z.object({
        imageBase64: z.string().describe("Base64 encoded image data"),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        try {
          const imageUrl = `data:${input.mimeType};base64,${input.imageBase64}`;
          
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a fashion expert AI that analyzes clothing items from images. 
                
Your task is to identify and describe clothing items with high accuracy. Look for:
- Brand logos, labels, or distinctive design elements
- Material and fabric type
- Style category and suitable occasions
- Color and pattern details
- Estimated retail price range

Be specific about the type of garment (e.g., "crew neck t-shirt" not just "shirt").
If you can identify the brand, include it. If not, say "Unknown".
Provide search suggestions that would help find this exact item online.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this clothing item and provide detailed information about it. Identify the brand if visible, categorize it, and suggest what occasions it would be suitable for."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageUrl,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            outputSchema: clothingRecognitionSchema
          });

          const content = result.choices[0]?.message?.content;
          if (typeof content === "string") {
            return JSON.parse(content);
          }
          
          return { success: false, error: "Failed to parse response" };
        } catch (error) {
          console.error("Image recognition error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Recognition failed" 
          };
        }
      }),

    // Reverse image search to find product matches online
    reverseImageSearch: publicProcedure
      .input(z.object({
        imageBase64: z.string().describe("Base64 encoded image data"),
        mimeType: z.string().default("image/jpeg"),
        itemDescription: z.string().optional().describe("Optional description to improve search"),
      }))
      .mutation(async ({ input }) => {
        try {
          const imageUrl = `data:${input.mimeType};base64,${input.imageBase64}`;
          
          // First, analyze the image to get search terms
          const analysisResult = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a fashion expert. Analyze this clothing image and generate precise search terms to find this exact item or very similar items online.

Focus on:
1. Brand identification (look for logos, tags, distinctive design elements)
2. Exact product type (e.g., "oversized cotton hoodie" not just "hoodie")
3. Color and pattern specifics
4. Any unique design features
5. Likely price range and target retailers

Generate search queries that would work on Google Shopping, Amazon, or fashion retailer sites.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this clothing item and generate search terms to find it online. ${input.itemDescription ? `Additional context: ${input.itemDescription}` : ""}`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageUrl,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            responseFormat: { type: "json_object" }
          });

          let searchTerms = "";
          let identifiedItem: any = {};
          
          const analysisContent = analysisResult.choices[0]?.message?.content;
          if (typeof analysisContent === "string") {
            try {
              const parsed = JSON.parse(analysisContent);
              searchTerms = parsed.searchQuery || parsed.searchTerms || "";
              identifiedItem = parsed.item || parsed;
            } catch {
              searchTerms = analysisContent;
            }
          }

          // Build search query
          const brand = identifiedItem.brand || "";
          const type = identifiedItem.type || identifiedItem.productType || "";
          const color = identifiedItem.color || "";
          const searchQuery = searchTerms || `${brand} ${color} ${type}`.trim();

          // Search multiple sources for product matches
          const searchPromises = [
            // Google Shopping search simulation via LLM
            invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `You are a shopping assistant that finds product matches. Given a search query and item description, generate realistic product listings that would match this item.

For each match, provide:
- Product name
- Brand
- Price (realistic for the item type)
- Store name (use real retailers like Nordstrom, ASOS, Zara, H&M, Amazon, etc.)
- A plausible product URL format
- Similarity score (how closely it matches the search)

Generate 5-8 realistic product matches from different retailers.`
                },
                {
                  role: "user",
                  content: `Find products matching: "${searchQuery}"
                  
Item details:
- Type: ${type}
- Brand: ${brand}
- Color: ${color}
- Description: ${input.itemDescription || "Not provided"}

Return realistic product matches from various online retailers.`
                }
              ],
              outputSchema: reverseImageSearchSchema
            })
          ];

          const [searchResults] = await Promise.all(searchPromises);
          
          const searchContent = searchResults.choices[0]?.message?.content;
          if (typeof searchContent === "string") {
            const parsed = JSON.parse(searchContent);
            return {
              ...parsed,
              searchQuery,
              identifiedItem
            };
          }
          
          return { 
            success: true, 
            matches: [],
            searchQuery,
            identifiedItem,
            message: "No exact matches found. Try adding more details."
          };
        } catch (error) {
          console.error("Reverse image search error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Search failed",
            matches: []
          };
        }
      }),

    // Extract product details from a store URL
    recognizeFromUrl: publicProcedure
      .input(z.object({
        productUrl: z.string().url().describe("URL of the product page"),
      }))
      .mutation(async ({ input }) => {
        try {
          // Fetch the page content
          const response = await fetch(input.productUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
          });
          
          if (!response.ok) {
            return { success: false, error: `Failed to fetch URL: ${response.status}` };
          }
          
          const html = await response.text();
          
          // Use LLM to extract product information from HTML
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are an expert at extracting product information from e-commerce HTML pages.

Extract the following details from the HTML:
- Product name/title
- Brand name
- Price (numeric value)
- Currency
- Color options or selected color
- Category (tops, bottoms, shoes, accessories, outerwear, dresses)
- Specific type (t-shirt, jeans, sneakers, etc.)
- Main product image URL
- Product description

Look for:
- JSON-LD structured data
- Open Graph meta tags
- Schema.org markup
- Common e-commerce HTML patterns

Return accurate data. If a field cannot be determined, omit it.`
              },
              {
                role: "user",
                content: `Extract product information from this e-commerce page HTML. The URL is: ${input.productUrl}\n\nHTML content (truncated to relevant parts):\n${html.substring(0, 50000)}`
              }
            ],
            outputSchema: urlScrapingSchema
          });

          const content = result.choices[0]?.message?.content;
          if (typeof content === "string") {
            const parsed = JSON.parse(content);
            if (parsed.success && parsed.item) {
              parsed.item.productUrl = input.productUrl;
            }
            return parsed;
          }
          
          return { success: false, error: "Failed to parse response" };
        } catch (error) {
          console.error("URL scraping error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to extract product info" 
          };
        }
      }),

    // Get outfit suggestions based on an item
    suggestOutfits: publicProcedure
      .input(z.object({
        itemDescription: z.string(),
        closetItems: z.array(z.object({
          id: z.string(),
          name: z.string(),
          category: z.string(),
          type: z.string(),
          color: z.string(),
          style: z.string().optional(),
        })),
        mood: z.string().optional(),
        occasion: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a personal stylist AI. Given a clothing item and a user's closet, suggest complete outfit combinations.

Consider:
- Color coordination and complementary colors
- Style consistency (don't mix athletic with formal)
- Occasion appropriateness
- Season suitability
- Fashion rules (e.g., match metals, balance proportions)

Return 3 outfit suggestions, each with item IDs from the closet.`
              },
              {
                role: "user",
                content: `Create outfit suggestions featuring this item: ${input.itemDescription}

User's closet items:
${JSON.stringify(input.closetItems, null, 2)}

${input.mood ? `Mood/Style: ${input.mood}` : ""}
${input.occasion ? `Occasion: ${input.occasion}` : ""}

Suggest 3 complete outfits using items from the closet.`
              }
            ],
            responseFormat: { type: "json_object" }
          });

          const content = result.choices[0]?.message?.content;
          if (typeof content === "string") {
            return { success: true, suggestions: JSON.parse(content) };
          }
          
          return { success: false, error: "Failed to generate suggestions" };
        } catch (error) {
          console.error("Outfit suggestion error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to suggest outfits" 
          };
        }
      }),
  }),

  // Weather-based outfit recommendations
  weather: router({
    // Get current weather and outfit recommendations
    getOutfitRecommendation: publicProcedure
      .input(z.object({
        latitude: z.number().describe("User's latitude"),
        longitude: z.number().describe("User's longitude"),
        closetItems: z.array(z.object({
          id: z.string(),
          name: z.string().optional(),
          category: z.string(),
          type: z.string(),
          color: z.string(),
          style: z.string().optional(),
          seasons: z.array(z.string()).optional(),
          occasions: z.array(z.string()).optional(),
        })),
        occasion: z.string().optional().describe("Planned occasion for the day"),
      }))
      .mutation(async ({ input }) => {
        try {
          // Fetch weather data from Open-Meteo (free, no API key required)
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
          
          const weatherResponse = await fetch(weatherUrl);
          if (!weatherResponse.ok) {
            throw new Error(`Weather API error: ${weatherResponse.status}`);
          }
          
          const weatherData = await weatherResponse.json();
          const current = weatherData.current;
          
          // Map weather codes to conditions
          const weatherCodeMap: Record<number, string> = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            71: "Slight snow",
            73: "Moderate snow",
            75: "Heavy snow",
            77: "Snow grains",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Slight snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail",
          };
          
          const weatherCondition = weatherCodeMap[current.weather_code] || "Unknown";
          const temperature = current.temperature_2m;
          const feelsLike = current.apparent_temperature;
          const humidity = current.relative_humidity_2m;
          const windSpeed = current.wind_speed_10m;
          
          // Determine weather icon
          const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(current.weather_code);
          const isSnowy = [71, 73, 75, 77, 85, 86].includes(current.weather_code);
          const isCloudy = [2, 3, 45, 48].includes(current.weather_code);
          const isStormy = [95, 96, 99].includes(current.weather_code);
          
          let icon = "sunny";
          if (isStormy) icon = "thunderstorm";
          else if (isRainy) icon = "rainy";
          else if (isSnowy) icon = "snowy";
          else if (isCloudy) icon = "cloudy";
          
          // Use LLM to generate outfit recommendations based on weather and closet
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a personal stylist AI that recommends outfits based on weather conditions.

Consider:
1. Temperature and "feels like" temperature
2. Weather conditions (rain, snow, wind)
3. Humidity levels
4. User's available clothing items
5. Occasion if specified

Provide practical, weather-appropriate outfit suggestions using items from the user's closet.
Match item IDs exactly from the provided closet list.`
              },
              {
                role: "user",
                content: `Generate outfit recommendations for today's weather:

WEATHER CONDITIONS:
- Temperature: ${temperature}°F (feels like ${feelsLike}°F)
- Condition: ${weatherCondition}
- Humidity: ${humidity}%
- Wind Speed: ${windSpeed} mph
${input.occasion ? `- Occasion: ${input.occasion}` : ""}

USER'S CLOSET (use these exact item IDs):
${JSON.stringify(input.closetItems, null, 2)}

Provide:
1. A brief summary of what to wear
2. Layering advice if needed
3. Fabric recommendations
4. Accessory suggestions (umbrella, sunglasses, etc.)
5. 2-3 specific outfit combinations using items from the closet (reference by ID)`
              }
            ],
            outputSchema: weatherOutfitSchema
          });

          const content = result.choices[0]?.message?.content;
          if (typeof content === "string") {
            const parsed = JSON.parse(content);
            return {
              ...parsed,
              success: true,
              weather: {
                temperature,
                feelsLike,
                condition: weatherCondition,
                humidity,
                windSpeed,
                icon,
                code: current.weather_code
              }
            };
          }
          
          // Return basic weather data even if LLM fails
          return { 
            success: true, 
            weather: {
              temperature,
              feelsLike,
              condition: weatherCondition,
              humidity,
              windSpeed,
              icon,
              code: current.weather_code
            },
            recommendation: {
              summary: temperature < 50 
                ? "It's cold today. Layer up with warm clothing."
                : temperature > 80 
                  ? "It's hot today. Wear light, breathable fabrics."
                  : "Moderate temperature. Dress comfortably.",
              layers: temperature < 60 ? "Consider adding a jacket or sweater" : "Light layers should be fine",
              fabricSuggestions: temperature > 75 ? ["cotton", "linen", "lightweight"] : ["cotton", "wool", "fleece"],
              avoidFabrics: temperature > 80 ? ["wool", "heavy denim"] : [],
              accessories: isRainy ? ["umbrella", "waterproof shoes"] : isSnowy ? ["boots", "gloves", "scarf"] : [],
              colorPalette: []
            },
            outfitSuggestions: []
          };
        } catch (error) {
          console.error("Weather outfit recommendation error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to get weather recommendations" 
          };
        }
      }),

    // Get weather forecast for trip packing
    getForecast: publicProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        days: z.number().min(1).max(16).default(7),
      }))
      .query(async ({ input }) => {
        try {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=${input.days}`;
          
          const response = await fetch(weatherUrl);
          if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          return {
            success: true,
            forecast: data.daily,
            location: {
              latitude: input.latitude,
              longitude: input.longitude,
              timezone: data.timezone
            }
          };
        } catch (error) {
          console.error("Weather forecast error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to get forecast" 
          };
        }
      }),
  }),

  // Virtual Try-On and Measurements
  tryOn: router({
    // Extract garment measurements from product URL
    extractMeasurements: publicProcedure
      .input(z.object({
        productUrl: z.string().url(),
        category: z.string().optional(),
        size: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Fetch the product page
          const response = await fetch(input.productUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
          });
          
          if (!response.ok) {
            return { success: false, error: `Failed to fetch URL: ${response.status}` };
          }
          
          const html = await response.text();
          
          // Use LLM to extract measurements from size charts and product details
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are an expert at extracting garment measurements from e-commerce pages.

Extract ALL available measurements from the product page, including:
- Size chart data (chest, waist, length, inseam, etc.)
- Fit information (slim, regular, relaxed, oversized)
- Material stretch level
- Model measurements and size worn (for reference)

Look for:
- Size guide/chart sections
- Product details with measurements
- Fit descriptions
- JSON-LD structured data

Return measurements in INCHES. Convert from cm if needed (divide by 2.54).
If a specific size is requested, return measurements for that size.
If no size specified, return measurements for size M/Medium as default.`
              },
              {
                role: "user",
                content: `Extract garment measurements from this product page.
URL: ${input.productUrl}
${input.size ? `Requested size: ${input.size}` : ""}
${input.category ? `Category: ${input.category}` : ""}

HTML content:\n${html.substring(0, 60000)}`
              }
            ],
            responseFormat: { type: "json_object" }
          });

          const content = result.choices[0]?.message?.content;
          if (typeof content === "string") {
            const parsed = JSON.parse(content);
            return {
              success: true,
              measurements: parsed.measurements || parsed,
              sizeChart: parsed.sizeChart,
              fitInfo: parsed.fitInfo,
              modelInfo: parsed.modelInfo
            };
          }
          
          return { success: false, error: "Failed to extract measurements" };
        } catch (error) {
          console.error("Measurement extraction error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to extract measurements" 
          };
        }
      }),

    // Analyze garment dimensions from image
    analyzeGarmentFromImage: publicProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        category: z.string().optional(),
        knownMeasurements: z.object({
          chest: z.number().optional(),
          waist: z.number().optional(),
          length: z.number().optional(),
          inseam: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const imageUrl = `data:${input.mimeType};base64,${input.imageBase64}`;
          
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a fashion AI that analyzes garment proportions and dimensions from images.

Analyze the garment in the image and estimate:
1. Relative proportions (length-to-width ratio, sleeve length ratio, etc.)
2. Fit style (slim, regular, relaxed, oversized)
3. Silhouette shape
4. Key design features that affect fit (darts, pleats, stretch panels)

${input.knownMeasurements ? `Use these known measurements as reference: ${JSON.stringify(input.knownMeasurements)}` : ""}

Provide proportional data that can be used for accurate virtual try-on rendering.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this ${input.category || "garment"} and provide dimensional analysis for virtual try-on.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageUrl,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            responseFormat: { type: "json_object" }
          });

          const content = result.choices[0]?.message?.content;
          if (typeof content === "string") {
            return { success: true, analysis: JSON.parse(content) };
          }
          
          return { success: false, error: "Failed to analyze garment" };
        } catch (error) {
          console.error("Garment analysis error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to analyze garment" 
          };
        }
      }),

    // Generate virtual try-on image
    generateTryOn: publicProcedure
      .input(z.object({
        userAvatarBase64: z.string().describe("User's full-body photo"),
        garmentImageBase64: z.string().describe("Garment image"),
        mimeType: z.string().default("image/jpeg"),
        garmentCategory: z.string(),
        garmentMeasurements: z.object({
          chest: z.number().optional(),
          waist: z.number().optional(),
          length: z.number().optional(),
          shoulderWidth: z.number().optional(),
          sleeveLength: z.number().optional(),
          inseam: z.number().optional(),
          fit: z.string().optional(),
        }).optional(),
        userMeasurements: z.object({
          height: z.number().optional(),
          chest: z.number().optional(),
          waist: z.number().optional(),
          hips: z.number().optional(),
          shoulderWidth: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const userImageUrl = `data:${input.mimeType};base64,${input.userAvatarBase64}`;
          const garmentImageUrl = `data:${input.mimeType};base64,${input.garmentImageBase64}`;
          
          // Use LLM to generate try-on analysis and fit prediction
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a virtual styling AI that analyzes how garments would fit on a person.

Given:
1. A user's full-body photo
2. A garment image
3. Garment measurements (if available)
4. User body measurements (if available)

Provide:
1. Fit analysis - how the garment would fit this person
2. Size recommendation
3. Styling tips for this body type
4. Potential fit issues to be aware of
5. A detailed description of how the garment would look on this person

Be specific about:
- Shoulder fit
- Chest/bust fit
- Waist fit
- Length (is it too long/short?)
- Overall silhouette

IMPORTANT: Maintain the original garment's proportions and dimensions. Do not stretch or distort the garment beyond its natural fit range.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze how this ${input.garmentCategory} would fit on this person.

Garment measurements: ${input.garmentMeasurements ? JSON.stringify(input.garmentMeasurements) : "Not provided"}
User measurements: ${input.userMeasurements ? JSON.stringify(input.userMeasurements) : "Not provided"}

Provide a detailed fit analysis maintaining the garment's original proportions.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: userImageUrl,
                      detail: "high"
                    }
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: garmentImageUrl,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            responseFormat: { type: "json_object" }
          });

          const content = result.choices[0]?.message?.content;
          if (typeof content === "string") {
            const analysis = JSON.parse(content);
            return {
              success: true,
              fitAnalysis: analysis.fitAnalysis || analysis,
              sizeRecommendation: analysis.sizeRecommendation,
              stylingTips: analysis.stylingTips,
              fitIssues: analysis.fitIssues,
              visualDescription: analysis.visualDescription,
              overallFit: analysis.overallFit || "unknown"
            };
          }
          
          return { success: false, error: "Failed to generate try-on analysis" };
        } catch (error) {
          console.error("Try-on generation error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to generate try-on" 
          };
        }
      }),

    // Calculate fit score between garment and user
    calculateFitScore: publicProcedure
      .input(z.object({
        garmentMeasurements: z.object({
          chest: z.number().optional(),
          waist: z.number().optional(),
          length: z.number().optional(),
          shoulderWidth: z.number().optional(),
          inseam: z.number().optional(),
          fit: z.string().optional(),
        }),
        userMeasurements: z.object({
          chest: z.number().optional(),
          waist: z.number().optional(),
          hips: z.number().optional(),
          shoulderWidth: z.number().optional(),
          inseam: z.number().optional(),
          preferredFit: z.string().optional(),
        }),
        category: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Calculate fit scores based on measurements
          const scores: Record<string, number> = {};
          const issues: string[] = [];
          const recommendations: string[] = [];
          
          const gm = input.garmentMeasurements;
          const um = input.userMeasurements;
          
          // Chest fit calculation
          if (gm.chest && um.chest) {
            const diff = gm.chest - um.chest;
            if (diff < 0) {
              scores.chest = Math.max(0, 100 + (diff * 10));
              issues.push(`Chest may be too tight (${Math.abs(diff).toFixed(1)}" smaller than your measurement)`);
            } else if (diff > 6) {
              scores.chest = Math.max(0, 100 - ((diff - 4) * 10));
              issues.push(`Chest may be too loose (${diff.toFixed(1)}" larger than your measurement)`);
            } else {
              scores.chest = 100 - Math.abs(diff - 3) * 10; // Ideal is 3" ease
            }
          }
          
          // Waist fit calculation
          if (gm.waist && um.waist) {
            const diff = gm.waist - um.waist;
            if (diff < 0) {
              scores.waist = Math.max(0, 100 + (diff * 15));
              issues.push(`Waist may be too tight`);
            } else if (diff > 4) {
              scores.waist = Math.max(0, 100 - ((diff - 2) * 10));
              recommendations.push(`Consider sizing down for a better waist fit`);
            } else {
              scores.waist = 100 - Math.abs(diff - 2) * 10;
            }
          }
          
          // Shoulder fit calculation
          if (gm.shoulderWidth && um.shoulderWidth) {
            const diff = gm.shoulderWidth - um.shoulderWidth;
            if (Math.abs(diff) > 1) {
              scores.shoulders = Math.max(0, 100 - (Math.abs(diff) * 20));
              if (diff < 0) {
                issues.push(`Shoulders may be too narrow`);
              } else {
                issues.push(`Shoulders may be too wide`);
              }
            } else {
              scores.shoulders = 100;
            }
          }
          
          // Inseam fit calculation (for bottoms)
          if (gm.inseam && um.inseam && ["bottoms", "jeans", "pants"].includes(input.category.toLowerCase())) {
            const diff = gm.inseam - um.inseam;
            if (diff < -2) {
              scores.inseam = Math.max(0, 100 + (diff * 10));
              issues.push(`Inseam may be too short`);
            } else if (diff > 2) {
              scores.inseam = 90; // Slightly long is usually fine
              recommendations.push(`May need hemming`);
            } else {
              scores.inseam = 100;
            }
          }
          
          // Calculate overall score
          const scoreValues = Object.values(scores);
          const overallScore = scoreValues.length > 0 
            ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
            : 75; // Default if no measurements to compare
          
          // Determine overall fit
          let overallFit: string;
          if (overallScore >= 90) overallFit = "perfect";
          else if (overallScore >= 75) overallFit = "good";
          else if (overallScore >= 60) overallFit = "acceptable";
          else if (overallScore >= 40) overallFit = "tight";
          else overallFit = "poor";
          
          return {
            success: true,
            overallScore,
            overallFit,
            detailedScores: scores,
            issues,
            recommendations,
          };
        } catch (error) {
          console.error("Fit calculation error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to calculate fit" 
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
