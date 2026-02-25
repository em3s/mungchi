"use client";

import { Card, BlockTitle, List, ListItem, Chip } from "konsta/react";
import type { CalendarEvent } from "@/lib/types";

const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;

function leadingEmoji(text: string): string | null {
  const m = text.match(EMOJI_RE);
  return m ? m[1] : null;
}

function stripLeadingEmoji(text: string): string {
  return text.replace(EMOJI_RE, "");
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "오전" : "오후";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${suffix} ${hour}시` : `${suffix} ${hour}:${String(m).padStart(2, "0")}`;
}

interface V2EventListProps {
  events: CalendarEvent[];
  date: string;
}

export function V2EventList({ events }: V2EventListProps) {
  if (events.length === 0) return null;

  const allDay = events.filter((e) => e.isAllDay);
  const timed = events
    .filter((e) => !e.isAllDay && e.startTime)
    .sort((a, b) => (a.startTime! > b.startTime! ? 1 : -1));

  return (
    <Card raised className="!mx-0 !mb-4" contentWrap={false}>
      <BlockTitle className="!mt-0 !pt-3 !px-4 !mb-0">
        📅 일정 ({events.length})
      </BlockTitle>

      <List strongIos outlineIos className="!my-0">
        {allDay.map((ev) => (
          <ListItem
            key={ev.uid}
            title={stripLeadingEmoji(ev.summary)}
            after={<Chip className="!text-[0.65rem]">하루종일</Chip>}
            media={
              <span className="text-lg">
                {leadingEmoji(ev.summary) || "📌"}
              </span>
            }
          />
        ))}
        {timed.map((ev) => (
          <ListItem
            key={ev.uid}
            title={stripLeadingEmoji(ev.summary)}
            subtitle={
              ev.endTime
                ? `${formatTime(ev.startTime!)} – ${formatTime(ev.endTime)}`
                : formatTime(ev.startTime!)
            }
            media={
              <span className="text-lg">
                {leadingEmoji(ev.summary) || "📅"}
              </span>
            }
          />
        ))}
      </List>
    </Card>
  );
}
