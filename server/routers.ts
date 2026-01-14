import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// User agent strings for different scenarios
const USER_AGENTS = {
  chrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  firefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  mobile: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
};

// Helper function to detect CAPTCHA/bot protection pages
function detectBotProtection(html: string): { blocked: boolean; reason: string } {
  const lowerHtml = html.toLowerCase();

  // Common CAPTCHA indicators
  const captchaIndicators = [
    "captcha",
    "recaptcha",
    "hcaptcha",
    "challenge-running",
    "challenge-form",
    "cf-browser-verification",
    "ddos-guard",
    "access denied",
    "blocked",
    "robot",
    "verify you are human",
    "checking your browser",
    "just a moment",
    "please wait while we verify",
    "security check",
    "pardon our interruption",
    "interstitial",
  ];

  for (const indicator of captchaIndicators) {
    if (lowerHtml.includes(indicator)) {
      return { blocked: true, reason: `Bot protection detected (${indicator})` };
    }
  }

  // Check for minimal HTML (likely a protection page)
  if (html.length < 2000 && !lowerHtml.includes("<product") && !lowerHtml.includes("product-detail")) {
    // Check if it has typical e-commerce elements
    const hasProductElements = lowerHtml.includes("price") || lowerHtml.includes("add to cart") || lowerHtml.includes("add to bag");
    if (!hasProductElements) {
      return { blocked: true, reason: "Page appears to be a redirect or protection page" };
    }
  }

  return { blocked: false, reason: "" };
}

// Helper function to fetch URL with retries and different user agents
async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<{ html: string; success: boolean; error?: string }> {
  const userAgentList = [USER_AGENTS.chrome, USER_AGENTS.safari, USER_AGENTS.firefox, USER_AGENTS.mobile];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const userAgent = userAgentList[attempt % userAgentList.length];

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"macOS"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        // Check if it's a 403 and we have more retries
        if (response.status === 403 && attempt < maxRetries - 1) {
          // Wait a bit before retrying with different user agent
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }
        return { html: "", success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const html = await response.text();

      // Check for bot protection
      const protection = detectBotProtection(html);
      if (protection.blocked) {
        if (attempt < maxRetries - 1) {
          // Try again with different user agent
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }
        return { html: "", success: false, error: protection.reason };
      }

      return { html, success: true };
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      return { html: "", success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  }

  return { html: "", success: false, error: "Max retries exceeded" };
}

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
          description: { type: "string" },
          material: { type: "string", description: "Fabric/material composition" },
          careInstructions: { type: "string", description: "Washing/care instructions" },
          fit: { type: "string", enum: ["slim", "regular", "relaxed", "oversized"], description: "Fit type" },
          sizeLabel: { type: "string", description: "Available sizes (e.g., XS, S, M, L, XL)" },
          measurements: {
            type: "object",
            properties: {
              chest: { type: "number", description: "Chest measurement in inches" },
              waist: { type: "number", description: "Waist measurement in inches" },
              length: { type: "number", description: "Length measurement in inches" },
              shoulderWidth: { type: "number", description: "Shoulder width in inches" },
              sleeveLength: { type: "number", description: "Sleeve length in inches" },
              inseam: { type: "number", description: "Inseam measurement in inches" },
              rise: { type: "number", description: "Rise measurement in inches" },
              hipWidth: { type: "number", description: "Hip width in inches" },
              thigh: { type: "number", description: "Thigh measurement in inches" },
              legOpening: { type: "number", description: "Leg opening in inches" },
              usSize: { type: "string", description: "US shoe size" },
              euSize: { type: "number", description: "EU shoe size" }
            },
            description: "Product measurements if available"
          },
          sizeChart: {
            type: "array",
            items: {
              type: "object",
              properties: {
                size: { type: "string" },
                chest: { type: "number" },
                waist: { type: "number" },
                length: { type: "number" },
                inseam: { type: "number" }
              },
              required: ["size"]
            },
            description: "Size chart with measurements for each size"
          }
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
          const encodedQuery = encodeURIComponent(searchQuery);

          // Generate real search links instead of hallucinated products
          const realSearchMatches = [
            {
              name: `Find "${searchQuery}" on Google Shopping`,
              brand: brand || "Google Shopping",
              price: "View Prices",
              store: "Google Shopping",
              url: `https://www.google.com/search?tbm=shop&q=${encodedQuery}`,
              imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png",
              similarity: 100
            },
            {
              name: `Find "${searchQuery}" on Amazon`,
              brand: brand || "Amazon",
              price: "View Prices",
              store: "Amazon",
              url: `https://www.amazon.com/s?k=${encodedQuery}`,
              imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/603px-Amazon_logo.svg.png",
              similarity: 95
            },
            {
              name: `Find "${searchQuery}" on eBay`,
              brand: brand || "eBay",
              price: "View Prices",
              store: "eBay",
              url: `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}`,
              imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/512px-EBay_logo.svg.png",
              similarity: 90
            },
            {
              name: `Search Images for "${searchQuery}"`,
              brand: brand || "Google Images",
              price: "View Matches",
              store: "Google Images",
              url: `https://www.google.com/search?tbm=isch&q=${encodedQuery}`,
              imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Google_Images_2015_logo.svg/640px-Google_Images_2015_logo.svg.png",
              similarity: 85
            }
          ];

          return { 
            success: true, 
            matches: realSearchMatches,
            searchQuery,
            identifiedItem,
            message: "Found search links for your item."
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
          // Parse domain for site-specific handling
          const urlObj = new URL(input.productUrl);
          const domain = urlObj.hostname.toLowerCase();

          // Check for known problematic domains
          const protectedSites = ["zara.com", "mango.com", "pull-bear.com", "bershka.com", "stradivarius.com"];
          const isProtectedSite = protectedSites.some(site => domain.includes(site));

          if (isProtectedSite) {
            // These sites have aggressive bot protection
            // Return a helpful error message suggesting alternatives
            return {
              success: false,
              error: `${domain.split(".")[0].toUpperCase()} has strong bot protection that prevents automatic scraping. Please try one of these alternatives:\n\n1. Take a screenshot of the product page and upload it as an image\n2. Manually enter the product details\n3. Try a different retailer selling the same item`,
              protectedSite: true,
              suggestions: [
                "Upload a screenshot of the product",
                "Enter details manually",
                "Search for the item on another retailer"
              ]
            };
          }

          // Fetch the page with retry logic
          const fetchResult = await fetchWithRetry(input.productUrl);

          if (!fetchResult.success) {
            // Provide helpful error messages based on the error type
            let userFriendlyError = fetchResult.error || "Failed to fetch the product page";

            if (fetchResult.error?.includes("403")) {
              userFriendlyError = "This website blocked our request. Try uploading a screenshot of the product page instead, or enter the details manually.";
            } else if (fetchResult.error?.includes("Bot protection")) {
              userFriendlyError = "This website has security measures that prevent automatic scraping. Please upload a screenshot of the product page or enter details manually.";
            }

            return {
              success: false,
              error: userFriendlyError,
              suggestions: [
                "Upload a screenshot of the product page",
                "Enter details manually"
              ]
            };
          }

          const html = fetchResult.html;

          // Use LLM to extract product information from HTML
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are an expert at extracting product information from e-commerce HTML pages.

IMPORTANT: First check if this HTML is a valid product page. If the HTML appears to be:
- A CAPTCHA or verification page
- A login/authentication page
- An error page
- A redirect/interstitial page
- A page without any product information

Then return: { "success": false, "error": "This appears to be a protection page, not a product page" }

If it IS a valid product page, extract ALL of the following details from the HTML:

BASIC INFO:
- Product name/title
- Brand name
- Price (numeric value) and Currency
- Color options or selected color
- Category (tops, bottoms, shoes, accessories, outerwear, dresses, swimwear)
- Specific type (t-shirt, jeans, sneakers, blazer, etc.)
- Main product image URL (full URL, not relative path)
- Product description

MATERIALS & FIT:
- Material/fabric composition (e.g., "100% cotton", "95% polyester, 5% elastane")
- Care instructions (washing, drying, ironing)
- Fit type (slim, regular, relaxed, oversized)
- Available sizes (sizeLabel)

MEASUREMENTS (convert to inches if in cm, very important!):
Look for size guides, measurement tables, or product dimensions. Extract measurements for a medium/size M if multiple sizes shown:
- For tops/outerwear: chest, length, shoulder width, sleeve length
- For bottoms: waist, inseam, rise, hip width, thigh, leg opening
- For shoes: US size, EU size
- For dresses: bust, waist, hip, length

SIZE CHART:
If a size chart is available, extract it as an array with measurements for each size.

Look for:
- JSON-LD structured data (script type="application/ld+json")
- Open Graph meta tags (og:title, og:image, og:price)
- Schema.org markup
- Size guide sections, measurement tables
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

            // If LLM detected it's not a product page
            if (!parsed.success && parsed.error) {
              return {
                success: false,
                error: "Could not extract product information. The page may have security protection. Try uploading a screenshot instead.",
                suggestions: [
                  "Upload a screenshot of the product page",
                  "Enter details manually"
                ]
              };
            }

            if (parsed.success && parsed.item) {
              parsed.item.productUrl = input.productUrl;

              // Ensure image URL is absolute
              if (parsed.item.imageUrl && !parsed.item.imageUrl.startsWith("http")) {
                parsed.item.imageUrl = new URL(parsed.item.imageUrl, input.productUrl).href;
              }
            }
            return parsed;
          }

          return { success: false, error: "Failed to parse response" };
        } catch (error) {
          console.error("URL scraping error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to extract product info",
            suggestions: [
              "Upload a screenshot of the product page",
              "Enter details manually"
            ]
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
          // Fetch the product page with retry logic
          const fetchResult = await fetchWithRetry(input.productUrl);

          if (!fetchResult.success) {
            return {
              success: false,
              error: fetchResult.error || "Failed to fetch the product page",
              suggestions: ["Try uploading a screenshot of the size chart"]
            };
          }

          const html = fetchResult.html;
          
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

  // Image Processing
  imageProcessing: router({
    // Remove background from clothing image using remove.bg API
    removeBackground: publicProcedure
      .input(z.object({
        imageBase64: z.string().describe("Base64 encoded image"),
        mimeType: z.string().default("image/jpeg"),
        size: z.enum(["preview", "full", "auto"]).default("auto"),
        type: z.enum(["auto", "product", "person"]).default("product"),
      }))
      .mutation(async ({ input }) => {
        try {
          const apiKey = ENV.removeBgApiKey;
          
          if (!apiKey) {
            return { 
              success: false, 
              error: "Remove.bg API key not configured. Please add REMOVE_BG_API_KEY to environment variables." 
            };
          }
          
          // Convert base64 to buffer for remove.bg API
          const imageBuffer = Buffer.from(input.imageBase64, "base64");
          
          // Create form data for remove.bg API
          const formData = new FormData();
          formData.append("image_file", new Blob([imageBuffer], { type: input.mimeType }), "image.jpg");
          formData.append("size", input.size);
          formData.append("type", input.type);
          formData.append("format", "png"); // PNG for transparency
          formData.append("bg_color", ""); // Transparent background
          
          // Call remove.bg API
          const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: {
              "X-Api-Key": apiKey,
            },
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.errors?.[0]?.title || `API error: ${response.status}`;
            
            // Check for specific error codes
            if (response.status === 402) {
              return { 
                success: false, 
                error: "Remove.bg API credits exhausted. Please add more credits or upgrade your plan." 
              };
            }
            
            return { success: false, error: errorMessage };
          }
          
          // Get the processed image as buffer
          const resultBuffer = await response.arrayBuffer();
          const processedBase64 = Buffer.from(resultBuffer).toString("base64");
          
          // Get credits info from response headers
          const creditsRemaining = response.headers.get("X-Credits-Remaining");
          const creditsUsed = response.headers.get("X-Credits-Charged");
          
          return {
            success: true,
            processedImageBase64: processedBase64,
            mimeType: "image/png",
            creditsUsed: creditsUsed ? parseFloat(creditsUsed) : 1,
            creditsRemaining: creditsRemaining ? parseFloat(creditsRemaining) : undefined,
          };
        } catch (error) {
          console.error("Background removal error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to remove background" 
          };
        }
      }),

    // Bulk remove backgrounds from multiple images
    bulkRemoveBackground: publicProcedure
      .input(z.object({
        images: z.array(z.object({
          id: z.string(),
          imageBase64: z.string(),
          mimeType: z.string().default("image/jpeg"),
        })).max(10), // Limit to 10 images per batch
        size: z.enum(["preview", "full", "auto"]).default("auto"),
      }))
      .mutation(async ({ input }) => {
        const apiKey = ENV.removeBgApiKey;
        
        if (!apiKey) {
          return { 
            success: false, 
            error: "Remove.bg API key not configured",
            results: [] 
          };
        }
        
        const results: Array<{
          id: string;
          success: boolean;
          processedImageBase64?: string;
          error?: string;
        }> = [];
        
        let totalCreditsUsed = 0;
        let creditsRemaining: number | undefined;
        
        // Process images sequentially to avoid rate limits
        for (const image of input.images) {
          try {
            const imageBuffer = Buffer.from(image.imageBase64, "base64");
            
            const formData = new FormData();
            formData.append("image_file", new Blob([imageBuffer], { type: image.mimeType }), "image.jpg");
            formData.append("size", input.size);
            formData.append("type", "product");
            formData.append("format", "png");
            
            const response = await fetch("https://api.remove.bg/v1.0/removebg", {
              method: "POST",
              headers: { "X-Api-Key": apiKey },
              body: formData,
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              results.push({
                id: image.id,
                success: false,
                error: errorData.errors?.[0]?.title || `Failed: ${response.status}`,
              });
              
              // Stop if out of credits
              if (response.status === 402) {
                break;
              }
              continue;
            }
            
            const resultBuffer = await response.arrayBuffer();
            const processedBase64 = Buffer.from(resultBuffer).toString("base64");
            
            const credits = response.headers.get("X-Credits-Charged");
            if (credits) totalCreditsUsed += parseFloat(credits);
            
            const remaining = response.headers.get("X-Credits-Remaining");
            if (remaining) creditsRemaining = parseFloat(remaining);
            
            results.push({
              id: image.id,
              success: true,
              processedImageBase64: processedBase64,
            });
            
            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            results.push({
              id: image.id,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
        
        return {
          success: results.some(r => r.success),
          results,
          totalCreditsUsed,
          creditsRemaining,
          processedCount: results.filter(r => r.success).length,
          failedCount: results.filter(r => !r.success).length,
        };
      }),

    // Check remove.bg account credits
    checkCredits: publicProcedure
      .query(async () => {
        try {
          const apiKey = ENV.removeBgApiKey;
          
          if (!apiKey) {
            return { success: false, error: "API key not configured" };
          }
          
          const response = await fetch("https://api.remove.bg/v1.0/account", {
            headers: { "X-Api-Key": apiKey },
          });
          
          if (!response.ok) {
            return { success: false, error: `API error: ${response.status}` };
          }
          
          const data = await response.json();
          const credits = data.data?.attributes?.credits;
          
          return {
            success: true,
            credits: {
              total: credits?.total || 0,
              subscription: credits?.subscription || 0,
              payg: credits?.payg || 0,
              enterprise: credits?.enterprise || 0,
            },
            freeApiCalls: data.data?.attributes?.api?.free_calls || 0,
          };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to check credits" 
          };
        }
      }),

    // Enhance clothing image (brightness, contrast, color correction)
    enhanceImage: publicProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        enhancements: z.object({
          brightness: z.number().min(-100).max(100).default(0),
          contrast: z.number().min(-100).max(100).default(0),
          saturation: z.number().min(-100).max(100).default(0),
          autoCorrect: z.boolean().default(true),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const imageUrl = `data:${input.mimeType};base64,${input.imageBase64}`;
          
          // Use LLM to analyze image quality and suggest enhancements
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are an image quality analysis AI for fashion photography.

Analyze the clothing image and provide:
1. Current image quality assessment (lighting, exposure, color accuracy)
2. Recommended adjustments for optimal display
3. Whether the image needs color correction
4. Suggestions for better product photography

Focus on making the clothing item look its best while maintaining color accuracy.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this clothing image quality and recommend enhancements."
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
            const analysis = JSON.parse(content);
            return {
              success: true,
              qualityAssessment: analysis.qualityAssessment || analysis.quality,
              recommendedAdjustments: analysis.recommendedAdjustments || analysis.adjustments,
              colorCorrectionNeeded: analysis.colorCorrectionNeeded ?? false,
              photographyTips: analysis.photographyTips || analysis.tips,
              // Return original image - actual enhancement would require image processing library
              enhancedImageBase64: input.imageBase64,
            };
          }
          
          return { success: false, error: "Failed to analyze image" };
        } catch (error) {
          console.error("Image enhancement error:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to enhance image" 
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
