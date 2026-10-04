import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, MapPin, Package, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface MatchResult {
  listingId: string;
  cropType: string;
  quantity: number;
  qualityGrade: "A" | "B" | "C" | null;
  pricePerTon: number;
  distanceKm: number | null;
  score: number;
  reason: string;
}

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  matches?: MatchResult[];
}

interface AIMatchAssistantProps {
  industryLat?: number | null;
  industryLng?: number | null;
}

/**
 * Chat-style assistant that lets an industry user describe what crop
 * residue they need in plain language (e.g. "I need 10 tons of paddy
 * within 50km") and returns ranked, explained matches by calling the
 * `ai-match-assistant` Supabase Edge Function, which in turn uses real
 * LLM tool-calling against live listing data.
 */
export default function AIMatchAssistant({
  industryLat,
  industryLng,
}: AIMatchAssistantProps) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [turns]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || loading) return;

    setTurns((prev) => [...prev, { role: "user", text: query }]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-match-assistant", {
        body: {
          query,
          industryLat: industryLat ?? undefined,
          industryLng: industryLng ?? undefined,
        },
      });

      if (error) throw error;

      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data?.summary || "Here's what I found.",
          matches: data?.matches || [],
        },
      ]);
    } catch (err) {
      console.error("[AIMatchAssistant] request failed", err);
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I couldn't reach the matching assistant right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Match Assistant</h3>
      </div>

      <ScrollArea className="h-72 px-4 py-3">
        {turns.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Try: "I need 10 tons of paddy within 50km" or "find me sugarcane residue nearby".
          </p>
        )}

        <div className="flex flex-col gap-3">
          {turns.map((turn, i) => (
            <div key={i} className={turn.role === "user" ? "self-end" : "self-start"}>
              <div
                className={
                  turn.role === "user"
                    ? "rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "rounded-lg bg-muted px-3 py-2 text-sm"
                }
              >
                {turn.text}
              </div>

              {turn.matches && turn.matches.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  {turn.matches.map((m) => (
                    <div
                      key={m.listingId}
                      className="rounded-md border bg-background px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-3 font-medium">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" /> {m.quantity}t {m.cropType}
                        </span>
                        {m.qualityGrade && (
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" /> Grade {m.qualityGrade}
                          </span>
                        )}
                        {m.distanceKm !== null && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {m.distanceKm} km
                          </span>
                        )}
                        <span className="ml-auto text-muted-foreground">
                          ₹{m.pricePerTon}/ton
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{m.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {turn.matches && turn.matches.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No matching listings found for that request.
                </p>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Finding matches...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you need..."
          disabled={loading}
        />
        <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
