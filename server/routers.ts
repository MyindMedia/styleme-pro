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
            enum: ["tops", "bottoms", "shoes", "accessories", "outerwear", "dresses"],
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
});

export type AppRouter = typeof appRouter;
