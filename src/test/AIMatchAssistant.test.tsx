import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIMatchAssistant from "@/components/AIMatchAssistant";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

describe("AIMatchAssistant", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("shows a starter hint before any message is sent", () => {
    render(<AIMatchAssistant />);
    expect(
      screen.getByText(/try: "i need 10 tons of paddy within 50km"/i),
    ).toBeInTheDocument();
  });

  it("sends the typed query to the ai-match-assistant edge function", async () => {
    invokeMock.mockResolvedValueOnce({
      data: { summary: "Found 1 match.", matches: [] },
      error: null,
    });

    render(<AIMatchAssistant industryLat={28.9} industryLng={77.7} />);

    const input = screen.getByPlaceholderText(/describe what you need/i);
    fireEvent.change(input, { target: { value: "10 tons of paddy" } });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));

    expect(invokeMock).toHaveBeenCalledWith("ai-match-assistant", {
      body: { query: "10 tons of paddy", industryLat: 28.9, industryLng: 77.7 },
    });
  });

  it("renders the assistant's summary and matches after a successful response", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        summary: "Found 1 strong match nearby.",
        matches: [
          {
            listingId: "l1",
            cropType: "Paddy",
            quantity: 10,
            qualityGrade: "A",
            pricePerTon: 1800,
            distanceKm: 12,
            score: 0.92,
            reason: "10t of Paddy, grade A quality, 12km away",
          },
        ],
      },
      error: null,
    });

    render(<AIMatchAssistant />);
    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: "paddy near me" },
    });
    fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByText("Found 1 strong match nearby.")).toBeInTheDocument();
    expect(screen.getByText(/10t Paddy/)).toBeInTheDocument();
    expect(screen.getByText(/grade A quality, 12km away/)).toBeInTheDocument();
  });

  it("shows a friendly error message when the request fails", async () => {
    invokeMock.mockRejectedValueOnce(new Error("network error"));

    render(<AIMatchAssistant />);
    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: "paddy near me" },
    });
    fireEvent.click(screen.getByRole("button"));

    expect(
      await screen.findByText(/couldn't reach the matching assistant/i),
    ).toBeInTheDocument();
  });

  it("does not send empty queries", () => {
    render(<AIMatchAssistant />);
    fireEvent.click(screen.getByRole("button"));
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
