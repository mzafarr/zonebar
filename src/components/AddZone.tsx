import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { POPULAR_ZONE_IDS, TIMEZONE_LIST, TimezoneEntry } from "../data/timezones";
import TIMEZONE_OVERRIDES from "../data/timezone-overrides.json";

interface AddZoneProps {
  existingZoneIds: string[];
  onAdd: (zone: { id: string; label: string }) => void;
}

function fuzzyMatch(query: string, entry: TimezoneEntry): boolean {
  const q = normalizeSearchText(query);
  if (normalizeSearchText(entry.label).includes(q)) return true;
  if (normalizeSearchText(entry.id).includes(q)) return true;
  return entry.aliases.some((a) => normalizeSearchText(a).includes(q));
}

function scoreMatch(query: string, entry: TimezoneEntry): number {
  const q = normalizeSearchText(query);
  const label = normalizeSearchText(entry.label);
  const id = normalizeSearchText(entry.id);
  const aliases = entry.aliases.map((alias) => normalizeSearchText(alias));

  if (!q) return 0;
  if (label === q || id === q || aliases.includes(q)) return 100;
  if (label.startsWith(q) || id.startsWith(q) || aliases.some((alias) => alias.startsWith(q))) return 90;
  if (label.includes(q) || id.includes(q) || aliases.some((alias) => alias.includes(q))) return 70;
  return 0;
}

function getSearchMatches(query: string): TimezoneEntry[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  return TIMEZONE_LIST
    .filter((entry) => fuzzyMatch(normalizedQuery, entry))
    .sort((a, b) => scoreMatch(normalizedQuery, b) - scoreMatch(normalizedQuery, a) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

function getSearchSuggestions(query: string, excludeIds: Set<string>): TimezoneEntry[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  return TIMEZONE_LIST
    .map((entry) => ({ entry, score: scoreMatch(normalizedQuery, entry) }))
    .filter(({ entry, score }) => score > 0 && !excludeIds.has(entry.id))
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label) || a.entry.id.localeCompare(b.entry.id))
    .slice(0, 6)
    .map(({ entry }) => entry);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function getHumanHint(entry: TimezoneEntry): string {
  const overrides = (TIMEZONE_OVERRIDES as Record<string, string[]>)[entry.id] ?? [];
  const hint = overrides.slice(0, 3).join(" · ");
  if (hint) return hint;

  const aliases = entry.aliases
    .filter((alias) => normalizeSearchText(alias) !== normalizeSearchText(entry.label))
    .slice(0, 3);

  return aliases.join(" · ");
}

export function AddZone({ existingZoneIds, onAdd }: AddZoneProps) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching && inputRef.current) inputRef.current.focus();
  }, [searching]);

  const popularZones = POPULAR_ZONE_IDS
    .map((id) => TIMEZONE_LIST.find((entry) => entry.id === id))
    .filter((entry): entry is TimezoneEntry => Boolean(entry));
  const results = query.trim() ? getSearchMatches(query) : popularZones;
  const suggestions = query.trim() ? getSearchSuggestions(query, new Set(results.map((entry) => entry.id))) : [];

  const handleSelect = (entry: TimezoneEntry) => {
    if (existingZoneIds.includes(entry.id)) return;
    onAdd({ id: entry.id, label: entry.label });
    setSearching(false);
    setQuery("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setSearching(false);
      setQuery("");
    }
  };

  if (!searching) {
    return (
      <div className="px-3 py-2 border-t border-white/[0.06]">
        <button
          onClick={() => setSearching(true)}
          className="w-full text-left text-white/[0.35] hover:text-white/[0.70] text-[11px] cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-md px-2.5 py-2 transition-colors"
        >
          + Add timezone
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-t border-white/[0.06] bg-black/10">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search city, region, or zone"
        className="w-full bg-white/[0.05] border border-white/[0.10] text-white/[0.85] rounded-md px-2.5 py-2 text-[12px] outline-none focus:border-[#4ade80]/50 placeholder:text-white/[0.25]"
      />
      <div className="flex items-center justify-between mt-1.5 mb-1">
        <span className="text-[9px] uppercase tracking-[0.18em] text-white/[0.20]">
          {query.trim() ? `Search results · ${results.length}` : "Popular zones"}
        </span>
        <button
          onClick={() => {
            setSearching(false);
            setQuery("");
          }}
          className="text-[9px] text-white/[0.20] hover:text-white/[0.50] cursor-pointer bg-transparent border-none transition-colors"
        >
          close
        </button>
      </div>
      <div className="max-h-[188px] overflow-y-auto">
        {results.slice(0, 15).map((entry) => {
          const isDuplicate = existingZoneIds.includes(entry.id);
          return (
            <button
              key={entry.id}
              onClick={() => handleSelect(entry)}
              disabled={isDuplicate}
              className={`w-full text-left px-2 py-1.5 text-[11px] border-none cursor-pointer block rounded-md transition-colors flex items-center gap-2 ${
                isDuplicate
                  ? "text-white/[0.18] bg-transparent cursor-not-allowed"
                  : "text-white/[0.70] bg-transparent hover:bg-white/[0.05] hover:text-white/[0.90]"
              }`}
            >
              <span className="w-4 shrink-0 text-center">{entry.flag}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{entry.label}</span>
                <span className="block truncate text-[9px] text-white/[0.22]">{getHumanHint(entry)}</span>
              </span>
              <span className="text-white/[0.20] text-[10px] truncate max-w-[110px]">{entry.id}</span>
              {isDuplicate && <span className="ml-1 text-white/[0.10]">✓</span>}
            </button>
          );
        })}
        {results.length === 0 && suggestions.length > 0 && (
          <div className="pt-1">
            <div className="px-1 pb-1 text-[9px] uppercase tracking-[0.18em] text-white/[0.20]">
              Did you mean
            </div>
            {suggestions.map((entry) => {
              const isDuplicate = existingZoneIds.includes(entry.id);
              return (
                <button
                  key={entry.id}
                  onClick={() => handleSelect(entry)}
                  disabled={isDuplicate}
                  className={`w-full text-left px-2 py-1.5 text-[11px] border-none cursor-pointer block rounded-md transition-colors flex items-center gap-2 ${
                    isDuplicate
                      ? "text-white/[0.18] bg-transparent cursor-not-allowed"
                      : "text-white/[0.54] bg-transparent hover:bg-white/[0.05] hover:text-white/[0.90]"
                  }`}
                >
                  <span className="w-4 shrink-0 text-center">{entry.flag}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{entry.label}</span>
                    <span className="block truncate text-[9px] text-white/[0.22]">{getHumanHint(entry)}</span>
                  </span>
                  <span className="text-white/[0.20] text-[10px] truncate max-w-[110px]">{entry.id}</span>
                  {isDuplicate && <span className="ml-1 text-white/[0.10]">✓</span>}
                </button>
              );
            })}
          </div>
        )}
        {results.length === 0 && suggestions.length === 0 && (
          <div className="text-white/[0.20] text-[11px] text-center py-2">No matches</div>
        )}
      </div>
    </div>
  );
}
