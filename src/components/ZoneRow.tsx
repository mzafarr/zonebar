import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { DayNightBar } from "./DayNightBar";
import { ZoneInfo } from "../hooks/useTimezones";
import { TIMEZONE_LIST } from "../data/timezones";

interface ZoneRowProps {
  zoneId: string;
  label: string;
  info: ZoneInfo;
  canRemove: boolean;
  onRemove: () => void;
  onTimeTyped: (timeString: string, zoneId: string) => boolean;
}

function parseUtcOffset(offset: string): string {
  const match = offset.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return "";
  const [, sign, h, m] = match;
  const hours = parseInt(h, 10);
  const mins = m ? parseInt(m, 10) : 0;
  if (hours === 0 && mins === 0) return "GMT";
  const s = sign === "+" ? "+" : "−";
  return mins > 0 ? `${s}${hours}:${String(mins).padStart(2, "0")}` : `${s}${hours}`;
}

export function ZoneRow({ zoneId, label, info, canRemove, onRemove, onTimeTyped }: ZoneRowProps) {
  const entry = TIMEZONE_LIST.find((t) => t.id === zoneId);
  const flag = entry?.flag ?? "🌐";

  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [shaking, setShaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleTimeClick = () => {
    setInputValue(info.time);
    setEditing(true);
  };

  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    const formattedTime = `${info.time} ${info.abbreviation}`;
    try {
      await writeText(formattedTime);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSubmit = () => {
    const success = onTimeTyped(inputValue, zoneId);
    if (success) {
      setEditing(false);
    } else {
      setShaking(true);
      setTimeout(() => setShaking(false), 250);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setEditing(false);
    }
  };

  const utcOffsetLabel = parseUtcOffset(info.utcOffset);

  return (
    <div className="group flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.035] transition-colors">
      {/* Zone label */}
      <div
        className="w-[84px] min-w-[84px] flex flex-col gap-0.5 cursor-pointer"
        onContextMenu={handleContextMenu}
        title="Right-click to copy time"
      >
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] shrink-0">{flag}</span>
          <span className="text-[11px] text-white/[0.78] truncate">{label}</span>
        </div>
        {copied ? (
          <span className="text-[9px] text-[#4ade80]">Copied!</span>
        ) : utcOffsetLabel ? (
          <span className="text-[9px] text-white/[0.35]">{utcOffsetLabel}</span>
        ) : null}
      </div>

      {/* Time (clickable or editable) */}
      <div className="w-[58px] min-w-[58px] text-right">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setEditing(false)}
            className={`bg-transparent border border-[#4ade80]/40 text-[#4ade80] text-right text-[13px] font-medium rounded-md px-1.5 py-0.5 w-[54px] outline-none tabular-nums ${shaking ? "animate-shake" : ""}`}
          />
        ) : (
          <button
            onClick={handleTimeClick}
            className="text-[13px] font-medium tabular-nums text-white/[0.92] hover:text-[#4ade80] bg-transparent border-none cursor-pointer transition-colors p-0"
          >
            {info.time}
          </button>
        )}
      </div>

      {/* Relative offset or day label */}
      <div className="w-[38px] min-w-[38px] text-center">
        {info.dayLabel ? (
          <span className="text-[9px] text-amber-400/80">{info.dayLabel === "Tomorrow" ? "+1d" : "-1d"}</span>
        ) : (
          <span className="text-[9px] text-white/30 tabular-nums">{info.relativeOffset}</span>
        )}
      </div>

      {/* Day/Night bar */}
      <DayNightBar hourPosition={info.hourPosition} />

      {/* Remove button */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="text-white/0 group-hover:text-white/20 hover:!text-red-400/60 text-[10px] cursor-pointer bg-transparent border-none p-0 ml-0.5 transition-colors leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
