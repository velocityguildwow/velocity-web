"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startOfMonth } from "date-fns/startOfMonth";
import { endOfMonth } from "date-fns/endOfMonth";
import { startOfWeek } from "date-fns/startOfWeek";
import { endOfWeek } from "date-fns/endOfWeek";
import { eachDayOfInterval } from "date-fns/eachDayOfInterval";
import { isSameMonth } from "date-fns/isSameMonth";
import { isToday } from "date-fns/isToday";
import { format } from "date-fns/format";
import { addMonths } from "date-fns/addMonths";
import { subMonths } from "date-fns/subMonths";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AfkEntry {
  id: string;
  afkDate: string; // YYYY-MM-DD
  notes: string | null;
  memberId: string;
  member: {
    displayName: string;
    discordUsername: string;
    image?: string | null;
  };
}

interface AttendanceCalendarProps {
  afkEntries: AfkEntry[];
  currentMemberId: string;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AttendanceCalendar({
  afkEntries,
  currentMemberId,
}: AttendanceCalendarProps) {
  const router = useRouter();
  const [month, setMonth] = useState(new Date());
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());
  const [pendingRemove, setPendingRemove] = useState<Set<string>>(new Set());

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function afkForDay(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    return afkEntries.filter((e) => e.afkDate === key);
  }

  async function addAfk(date: string) {
    if (pendingAdd.has(date)) return;
    setPendingAdd((prev) => new Set([...prev, date]));
    const res = await fetch("/api/afk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ afkDate: date, notes: noteValues[date]?.trim() || null }),
    });
    setPendingAdd((prev) => { const s = new Set(prev); s.delete(date); return s; });
    if (res.ok) {
      setNoteValues((prev) => { const n = { ...prev }; delete n[date]; return n; });
      router.refresh();
    }
  }

  async function removeAfk(entryId: string, date: string) {
    if (pendingRemove.has(entryId)) return;
    setPendingRemove((prev) => new Set([...prev, entryId]));
    const res = await fetch("/api/afk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ afkDate: date }),
    });
    setPendingRemove((prev) => { const s = new Set(prev); s.delete(entryId); return s; });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold text-base">
          {format(month, "MMMM yyyy")}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {days.map((day: Date) => {
          const entries = afkForDay(day);
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const dateStr = format(day, "yyyy-MM-dd");
          const myEntry = entries.find((e) => e.memberId === currentMemberId);
          const MAX_AVATARS = 3;

          return (
            <Popover key={day.toISOString()}>
              <PopoverTrigger
                className={cn(
                  "bg-background min-h-[80px] p-2 text-left flex flex-col gap-1 transition-colors",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  !inMonth && "opacity-40"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>

                {entries.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-auto">
                    {entries.slice(0, MAX_AVATARS).map((e) => (
                      <Avatar key={e.id} className="h-5 w-5 ring-1 ring-background">
                        <AvatarImage src={e.member.image ?? undefined} />
                        <AvatarFallback className="text-[8px]">
                          {e.member.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {entries.length > MAX_AVATARS && (
                      <span className="text-[10px] text-muted-foreground self-center ml-0.5">
                        +{entries.length - MAX_AVATARS}
                      </span>
                    )}
                  </div>
                )}
              </PopoverTrigger>

              <PopoverContent className="w-64 p-3" align="start">
                <p className="text-sm font-semibold mb-2">
                  {format(day, "EEEE, MMMM d")}
                </p>

                {entries.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-3">Everyone available</p>
                ) : (
                  <ul className="space-y-2 mb-3">
                    {entries.map((e) => (
                      <li key={e.id} className="flex items-start gap-2">
                        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                          <AvatarImage src={e.member.image ?? undefined} />
                          <AvatarFallback className="text-[9px]">
                            {e.member.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {e.member.displayName}
                          </p>
                          {e.notes && (
                            <p className="text-xs text-muted-foreground truncate">
                              {e.notes}
                            </p>
                          )}
                        </div>
                        {e.memberId === currentMemberId && (
                          <button
                            onClick={() => removeAfk(e.id, e.afkDate)}
                            disabled={pendingRemove.has(e.id)}
                            className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                            aria-label="Remove AFK"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {inMonth && !myEntry && (
                  <div className="space-y-2 border-t pt-3">
                    <Textarea
                      placeholder="Note (optional)"
                      value={noteValues[dateStr] ?? ""}
                      onChange={(e) =>
                        setNoteValues((prev) => ({ ...prev, [dateStr]: e.target.value }))
                      }
                      className="text-xs min-h-[52px] resize-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      disabled={pendingAdd.has(dateStr)}
                      onClick={() => addAfk(dateStr)}
                    >
                      {pendingAdd.has(dateStr) ? "Marking…" : "Mark myself AFK"}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
