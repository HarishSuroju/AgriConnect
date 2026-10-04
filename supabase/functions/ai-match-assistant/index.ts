// @ts-ignore Deno remote import is resolved at runtime by Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore Deno remote import is resolved at runtime by Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { rankListings, type ResidueListingLike } from "./matching.ts";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * AI Match Assistant
 * ===================
 * Lets an industry user ask a natural-language question
 * ("I need 10 tons of dry paddy residue within 50km") and returns ranked,
 * explained matches from `residue_listings`.
 *
 * Unlike `analyze-crop` (a single structured-output call), this function
 * uses real LLM tool-calling / function-calling:
 *   1. The user's message + a system prompt + tool definitions are sent to
 *      the model.
 *   2. The model decides whether it has enough information, or whether it
 *      needs to call `search_residue_listings` to get real data.
 *   3. If it calls the tool, we execute it against Supabase, feed the
 *      results back to the model, and ask it to produce a final answer.
 *   4. The final answer is parsed into structured matches + a short,
 *      plain-language explanation for each one.
 *
 * The actual ranking math lives in ./matching.ts (unit tested at
 * src/test/matchScoring.test.ts) so the LLM is responsible for
 * understanding intent and explaining results in natural language, not for
 * doing the arithmetic itself, which keeps the output deterministic and
 * verifiable.
 */

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_residue_listings",
      description:
        "Search available crop residue listings from farmers, optionally filtered by crop type, minimum quantity, and maximum distance from the industry's location.",
      parameters: {
        type: "object",
        properties: {
          cropType: {
            type: "string",
            enum: ["Paddy", "Wheat", "Sugarcane"],
            description: "The crop residue type to search for.",
          },
          minQuantity: {
            type: "number",
            description: "Minimum quantity in tons the industry needs.",
          },
          maxDistanceKm: {
            type: "number",
            description:
              "Maximum distance in kilometers from the industry's location.",
          },
        },
        required: [],
      },
    },
  },
];

async function searchResidueListings(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  args: { cropType?: string; minQuantity?: number; maxDistanceKm?: number },
  industryLat?: number,
  industryLng?: number,
) {
  const { data, error } = await supabaseClient
    .from("residue_listings")
    .select(
      "id, crop_type, quantity, quality_grade, adjusted_price_per_ton, lat, lng, status",
    )
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[ai-match-assistant] Supabase query error", error);
    return { matches: [], error: error.message };
  }

  const listings = (data || []) as ResidueListingLike[];
  const ranked = rankListings(
    listings,
    {
      cropType: args.cropType,
      minQuantity: args.minQuantity,
      maxDistanceKm: args.maxDistanceKm,
      industryLat,
      industryLng,
    },
    5,
  );

  return {
    matches: ranked.map((m) => ({
      listingId: m.listing.id,
      cropType: m.listing.crop_type,
      quantity: m.listing.quantity,
      qualityGrade: m.listing.quality_grade,
      pricePerTon: m.listing.adjusted_price_per_ton,
      distanceKm: m.distanceKm,
      score: m.score,
      reason: m.reason,
    })),
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, industryLat, industryLng } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "A natural-language 'query' string is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL");
    const aiGatewayApiKey = Deno.env.get("AI_GATEWAY_API_KEY");
    const aiModel = Deno.env.get("AI_MODEL") || "gpt-4o-mini";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[ai-match-assistant] Missing Supabase service configuration");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration. Please try again later." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // If no AI gateway is configured, fall back to a plain (non-LLM) search
    // so the feature still works in local/dev environments without an API key.
    if (!aiGatewayUrl || !aiGatewayApiKey) {
      console.warn("[ai-match-assistant][fallback:missing-config] AI gateway not configured");
      const fallbackResult = await searchResidueListings(
        supabaseClient,
        {},
        industryLat,
        industryLng,
      );
      return new Response(
        JSON.stringify({
          debugCase: "fallback:missing-config",
          summary:
            "AI assistant is temporarily unavailable, showing the most recent available listings instead.",
          matches: fallbackResult.matches,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are AgriConnect's matching assistant. Industry users describe what crop residue they need in plain language, and you help them find the best matching listings.

You have access to a "search_residue_listings" tool that queries real, live listings. Always call this tool before answering — never invent listings or numbers yourself. Extract cropType, minQuantity (in tons), and maxDistanceKm (in km) from the user's message if mentioned; omit any you can't infer.

After you get tool results, write a short (2-3 sentence) summary of what you found, in plain, non-technical language a farmer or industry buyer would understand. Do not repeat raw JSON back to the user.`;

    // deno-lint-ignore no-explicit-any
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ];

    let finalMatches: unknown[] = [];
    let finalSummary = "";
    const maxToolRounds = 2;

    for (let round = 0; round <= maxToolRounds; round++) {
      const response = await fetch(aiGatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiGatewayApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
          messages,
          tools: TOOLS,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[ai-match-assistant][fallback:gateway-error] AI gateway error", {
          status: response.status,
          errText,
        });
        const fallbackResult = await searchResidueListings(
          supabaseClient,
          {},
          industryLat,
          industryLng,
        );
        return new Response(
          JSON.stringify({
            debugCase: "fallback:gateway-error",
            summary:
              "AI assistant is temporarily unavailable, showing the most recent available listings instead.",
            matches: fallbackResult.matches,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      if (!message) {
        break;
      }

      const toolCalls = message.tool_calls as
        | Array<{
            id: string;
            function: { name: string; arguments: string };
          }>
        | undefined;

      if (toolCalls && toolCalls.length > 0) {
        messages.push(message);

        for (const toolCall of toolCalls) {
          if (toolCall.function.name === "search_residue_listings") {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(toolCall.function.arguments || "{}");
            } catch (parseErr) {
              console.warn("[ai-match-assistant] Could not parse tool args", parseErr);
            }

            const result = await searchResidueListings(
              supabaseClient,
              args,
              industryLat,
              industryLng,
            );
            finalMatches = result.matches;

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          }
        }
        // Loop again so the model can read the tool results and respond.
        continue;
      }

      // No tool call: the model has produced its final answer.
      finalSummary = String(message.content || "").trim();
      break;
    }

    return new Response(
      JSON.stringify({
        debugCase: "success",
        summary: finalSummary || "Here are the best matches we found.",
        matches: finalMatches,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ai-match-assistant][fallback:runtime-error] Unexpected error", error);
    return new Response(
      JSON.stringify({
        debugCase: "fallback:runtime-error",
        summary: "Something went wrong while finding matches. Please try again.",
        matches: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
