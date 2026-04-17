interface TimeSliderProps {
  offset: number;
  onChange: (hours: number) => void;
  onReset: () => void;
  mode: "live" | "fixed";
}

const PRESETS = [1, 3, 6, 12];

export function TimeSlider({ offset, onChange, onReset, mode }: TimeSliderProps) {
  const handlePreset = (hours: number) => {
    if (Math.abs(offset - hours) < 0.01) {
      onReset();
    } else {
      onChange(hours);
    }
  };

  return (
    <div className="px-3 py-2.5 border-t border-white/[0.06]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-[0.18em] text-white/[0.20]">Reference shift</span>
        <span className="text-[9px] text-white/[0.18]">Drag to compare zones</span>
      </div>
      <input
        type="range"
        min={-12}
        max={12}
        step={0.25}
        value={offset}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer"
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-white/[0.15]">-12h</span>
        {mode === "fixed" ? (
          <button
            onClick={onReset}
            className="text-[9px] text-white/30 hover:text-[#4ade80]/60 cursor-pointer bg-transparent border-none transition-colors"
          >
            reset
          </button>
        ) : (
          <span className="text-[9px] text-white/[0.15]">now</span>
        )}
        <span className="text-[9px] text-white/[0.15]">+12h</span>
      </div>
      {mode === "fixed" && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {PRESETS.map((h) => (
            <button
              key={h}
              onClick={() => handlePreset(h)}
              className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer bg-transparent border-none transition-colors ${
                Math.abs(offset - h) < 0.01
                  ? "text-[#4ade80]"
                  : "text-white/[0.25] hover:text-white/[0.50]"
              }`}
            >
              +{h}h
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
