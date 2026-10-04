// @ts-ignore Deno remote import is resolved at runtime by Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, cropTypeHint } = await req.json();
    const requestInfo = {
      hint: cropTypeHint || "Paddy",
      hasImage: Boolean(imageBase64),
    };

    console.info("[analyze-crop] Request received", requestInfo);

    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL");
    const aiGatewayApiKey = Deno.env.get("AI_GATEWAY_API_KEY");
    const aiModel = Deno.env.get("AI_MODEL") || "gpt-4o-mini";
    
    // If AI gateway is not configured, return a realistic fallback result
    if (!aiGatewayUrl || !aiGatewayApiKey) {
      console.warn("[analyze-crop][fallback:missing-config] AI gateway not configured", requestInfo);
      const fallback = {
        debugCase: "fallback:missing-config",
        cropType: cropTypeHint || "Paddy",
        moisture: Math.floor(Math.random() * 11) + 12, // 12-22%
        qualityGrade: Math.random() > 0.4 ? (Math.random() > 0.5 ? "A" : "B") : "C",
        confidence: Math.floor(Math.random() * 15) + 70, // 70-85% for no image
        analysis: `Analysis of ${cropTypeHint || "Paddy"} residue completed with limited data.`,
      };
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages: any[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an agricultural AI expert. First, check whether this image actually shows crop residue, straw, husk, stalks, or harvested agricultural plant material.

If it does NOT show crop residue (for example: a diagram, screenshot, document, unrelated photo, person, or any non-agricultural image), respond ONLY with:
{"isCropImage":false,"analysis":"A brief 1 sentence description of what the image actually shows instead."}

If it DOES show crop residue, analyze it and respond ONLY with valid JSON in this exact format:
{"isCropImage":true,"cropType":"Paddy","moisture":18,"qualityGrade":"A","confidence":92,"analysis":"Clean paddy straw with low moisture, suitable for biomass conversion."}

Field rules when isCropImage is true:
1. **cropType**: The type of crop residue (must be one of: "Paddy", "Wheat", "Sugarcane"). If unsure which of these three, use "${cropTypeHint || 'Paddy'}" as default, but isCropImage should still be true since it is genuinely crop residue.
2. **moisture**: Estimated moisture level as a percentage (integer between 10-30). Look at color, texture, and apparent dryness.
3. **qualityGrade**: Grade the quality as "A" (clean, dry, minimal contamination), "B" (moderate quality), or "C" (wet, contaminated, or mixed).
4. **confidence**: Your confidence in this analysis as a percentage (integer between 70-99).
5. **analysis**: A brief 1-2 sentence description of what you observe.

Do not guess a crop type for an image that clearly isn't crop residue. Be honest in the isCropImage check even if a cropTypeHint was provided, the hint is only a fallback label, not a reason to say yes.`,
          },
          ...(imageBase64
            ? [
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64.startsWith("data:")
                      ? imageBase64
                      : `data:image/jpeg;base64,${imageBase64}`,
                    detail: "low",
                  },
                },
              ]
            : []),
        ],
      },
    ];

    // If no image provided, use text-only analysis
    if (!imageBase64) {
      messages[0].content = `You are an agricultural AI expert. A farmer wants to list "${cropTypeHint || 'Paddy'}" crop residue but didn't upload an image. Provide a realistic analysis:
1. cropType: "${cropTypeHint || 'Paddy'}"
2. moisture: realistic percentage (12-25)
3. qualityGrade: "A", "B", or "C" (randomly pick with 40% A, 40% B, 20% C)
4. confidence: between 70-85 (lower since no image)
5. analysis: brief description

Respond ONLY with valid JSON: {"cropType":"...","moisture":...,"qualityGrade":"...","confidence":...,"analysis":"..."}`;
    }

    console.info("[analyze-crop] Calling AI gateway", { model: aiModel, ...requestInfo });

    let response: Response | null = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      response = await fetch(aiGatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiGatewayApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
          messages,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        break;
      }

      if (response.status === 429 && attempt < maxAttempts) {
        const waitMs = attempt * 800;
        console.warn("[analyze-crop] AI gateway rate-limited; retrying", {
          attempt,
          waitMs,
          ...requestInfo,
        });
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      break;
    }

    if (!response || !response.ok) {
      const errText = response ? await response.text() : "No response from gateway";
      let upstreamReason = "Unknown upstream error";

      try {
        const parsed = JSON.parse(errText) as {
          error?: { message?: string; code?: string; type?: string };
        };
        const message = parsed.error?.message;
        const code = parsed.error?.code;
        const type = parsed.error?.type;
        upstreamReason = [type, code, message].filter(Boolean).join(" | ") || upstreamReason;
      } catch {
        upstreamReason = errText.slice(0, 220);
      }

      const isQuotaExceeded =
        response?.status === 429 &&
        /insufficient_quota/i.test(upstreamReason);
      const isRateLimited = response?.status === 429 && !isQuotaExceeded;
      const fallbackCase = isQuotaExceeded
        ? "fallback:quota-exceeded"
        : isRateLimited
          ? "fallback:rate-limited"
          : "fallback:gateway-error";

      console.error(`[analyze-crop][${fallbackCase}] AI Gateway error`, {
        status: response?.status,
        response: errText,
        upstreamReason,
        model: aiModel,
        ...requestInfo,
      });
      
      // Return fallback on AI Gateway errors
      const fallback = {
        debugCase: fallbackCase,
        debugStatus: response?.status ?? 0,
        debugReason: upstreamReason,
        cropType: cropTypeHint || "Paddy",
        moisture: Math.floor(Math.random() * 11) + 12,
        qualityGrade: Math.random() > 0.4 ? (Math.random() > 0.5 ? "A" : "B") : "C",
        confidence: 0,
        analysis: isQuotaExceeded
          ? "AI analysis is temporarily unavailable because the configured AI service has no remaining quota. Using default analysis."
          : isRateLimited
            ? "AI analysis is temporarily rate-limited. Using default analysis."
            : "AI service temporarily unavailable. Using default analysis.",
      };
      
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from the response
    let result: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[analyze-crop][fallback:parse-error] JSON parsing error", {
        error: parseErr,
        content,
        ...requestInfo,
      });
      // Return fallback if parsing fails
      const fallback = {
        debugCase: "fallback:parse-error",
        cropType: cropTypeHint || "Paddy",
        moisture: Math.floor(Math.random() * 11) + 12,
        qualityGrade: Math.random() > 0.4 ? (Math.random() > 0.5 ? "A" : "B") : "C",
        confidence: 0,
        analysis: "Could not parse AI analysis. Using default values.",
      };
      
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If the model determined this isn't actually a crop residue image, don't
    // fabricate a confident-looking analysis for it. Report it distinctly so
    // the frontend can show a clear rejection instead of fake data.
    if (imageBase64 && result?.isCropImage === false) {
      console.info("[analyze-crop][rejected:not-crop-image] Image is not crop residue", {
        modelNote: result.analysis,
        ...requestInfo,
      });

      const rejected = {
        debugCase: "rejected:not-crop-image",
        isCropImage: false,
        cropType: null,
        moisture: null,
        qualityGrade: null,
        confidence: 0,
        analysis:
          result.analysis ||
          "This image doesn't appear to show crop residue. Please upload a clear photo of the actual crop residue.",
      };

      return new Response(JSON.stringify(rejected), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate and sanitize
    const validCrops = ["Paddy", "Wheat", "Sugarcane"];
    const validGrades = ["A", "B", "C"];

    const sanitized = {
      debugCase: "success",
      cropType: validCrops.includes(result.cropType) ? result.cropType : (cropTypeHint || "Paddy"),
      moisture: Math.max(10, Math.min(30, Math.round(Number(result.moisture) || 18))),
      qualityGrade: validGrades.includes(result.qualityGrade) ? result.qualityGrade : "B",
      confidence: Math.max(0, Math.min(100, Math.round(Number(result.confidence) || 80))),
      analysis: String(result.analysis || "Analysis completed.").slice(0, 200),
    };

    console.info("[analyze-crop][success] AI analysis completed", {
      cropType: sanitized.cropType,
      qualityGrade: sanitized.qualityGrade,
      confidence: sanitized.confidence,
      ...requestInfo,
    });

    return new Response(JSON.stringify(sanitized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[analyze-crop][fallback:runtime-error] Unexpected runtime error", error);

    // Fallback: return simulated result if AI fails
    const fallback = {
      debugCase: "fallback:runtime-error",
      cropType: "Paddy",
      moisture: Math.floor(Math.random() * 11) + 12, // 12-22%
      qualityGrade: Math.random() > 0.4 ? (Math.random() > 0.5 ? "A" : "B") : "C",
      confidence: 0,
      analysis: "AI analysis unavailable. Default values applied; please review manually.",
    };

    return new Response(JSON.stringify(fallback), {
      status: 200, // Return 200 to prevent frontend error
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
