import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface TimeDisplayProps {
  selectedInstant: Date;
  mode: "live" | "fixed";
  onTimeTyped: (timeString: string) => boolean;
}

export function TimeDisplay({ selectedInstant, mode, onTimeTyped }: TimeDisplayProps) {
  const [editing, setEditing] = useState(false);
  const [showSeconds, setShowSeconds] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
  }).format(selectedInstant);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleClick = () => {
    setInputValue(displayTime);
    setEditing(true);
  };

  const handleSubmit = () => {
    const success = onTimeTyped(inputValue);
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

  if (editing) {
    const editTime = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: showSeconds ? "2-digit" : undefined,
    }).format(selectedInstant);

    return (
      <div className="flex flex-col items-center justify-center py-2 px-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/[0.22]">
            {mode === "live" ? "Local time" : "Selected time"}
          </span>
          <button
            onClick={() => setShowSeconds((prev) => !prev)}
            className="text-[8px] text-white/[0.15] hover:text-white/[0.30] bg-transparent border-none cursor-pointer px-1 rounded transition-colors"
            title={showSeconds ? "Hide seconds" : "Show seconds"}
          >
            {showSeconds ? ":sec" : ":ss"}
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setEditing(false)}
          className={`bg-transparent border border-[#4ade80]/40 text-[#4ade80] text-center text-sm font-semibold rounded-md px-2 py-1 w-[84px] outline-none focus:border-[#4ade80] ${shaking ? "animate-shake" : ""}`}
          placeholder={editTime}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-2 px-3 border-b border-white/[0.06]">
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-[0.18em] text-white/[0.22]">
          {mode === "live" ? "Local time" : "Selected time"}
        </span>
        <button
          onClick={() => setShowSeconds((prev) => !prev)}
          className="text-[8px] text-white/[0.15] hover:text-white/[0.30] bg-transparent border-none cursor-pointer px-1 rounded transition-colors"
          title={showSeconds ? "Hide seconds" : "Show seconds"}
        >
          {showSeconds ? ":sec" : ":ss"}
        </button>
      </div>
      <button
        onClick={handleClick}
        className="text-[#4ade80] text-[18px] leading-none font-semibold cursor-pointer bg-transparent border-none hover:text-[#22c55e] transition-colors tracking-wide tabular-nums"
      >
        {displayTime}
      </button>
      {mode === "fixed" && (
        <span className="text-[10px] text-white/[0.22] mt-1">adjusted</span>
      )}
    </div>
  );
}
