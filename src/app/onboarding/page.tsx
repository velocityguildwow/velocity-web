"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UnclaimedMember {
  id: string;
  wowutilsMemberId: string | null;
  displayName: string;
  battletag: string | null;
  rank: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [battletag, setBattletag] = useState("");
  const [step, setStep] = useState<"battletag" | "pick">("battletag");
  const [unclaimed, setUnclaimed] = useState<UnclaimedMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleBattletagSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/onboarding/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ battletag }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.linked) {
      router.push("/");
      return;
    }

    if (data.unclaimed) {
      setUnclaimed(data.unclaimed);
      setStep("pick");
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  async function handlePickMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/onboarding/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wowutilsMemberId: selectedMemberId }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      router.push("/");
    } else {
      setError(data.error ?? "Failed to claim member.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Velocity</CardTitle>
          <CardDescription>
            {step === "battletag"
              ? "Enter your Battle.net tag to link your account with the guild roster."
              : "We couldn't find your tag automatically. Select your name from the roster."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "battletag" ? (
            <form onSubmit={handleBattletagSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="battletag">Battle.net Tag</Label>
                <Input
                  id="battletag"
                  placeholder="YourName#1234"
                  value={battletag}
                  onChange={(e) => setBattletag(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Searching…" : "Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePickMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member">Select your name</Label>
                <Select
                  value={selectedMemberId}
                  onValueChange={(val) => setSelectedMemberId(val ?? "")}
                >
                  <SelectTrigger id="member">
                    <SelectValue placeholder="Pick your name…" />
                  </SelectTrigger>
                  <SelectContent>
                    {unclaimed.map((m) => (
                      <SelectItem key={m.id} value={m.wowutilsMemberId ?? m.id}>
                        {m.displayName}
                        {m.battletag ? ` — ${m.battletag}` : ""}
                        {m.rank ? ` (${m.rank})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("battletag")}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || !selectedMemberId}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Linking…" : "Link Account"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
