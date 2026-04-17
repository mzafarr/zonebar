import { useEffect, useMemo, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useTimeModel } from "./hooks/useTimeModel";
import { usePreferences } from "./hooks/usePreferences";
import { getZoneInfo, ZoneInfo } from "./hooks/useTimezones";
import { TimeDisplay } from "./components/TimeDisplay";
import { ZoneList } from "./components/ZoneList";
import { AddZone } from "./components/AddZone";
import { TimeSlider } from "./components/TimeSlider";
import { ActivationScreen } from "./components/ActivationScreen";
import { useLicenseGate } from "./hooks/useLicenseGate";

function App() {
  const timeModel = useTimeModel();
  const { zones, loaded, addZone, removeZone, reorderZones } = usePreferences();
  const { status, isLoading, isActivating, error, activateLicense, clearError } =
    useLicenseGate();
  const rootRef = useRef<HTMLDivElement>(null);

  const zoneInfos = useMemo(() => {
    const map = new Map<string, ZoneInfo>();
    for (const zone of zones) {
      map.set(zone.id, getZoneInfo(timeModel.selectedInstant, zone.id));
    }
    return map;
  }, [zones, timeModel.selectedInstant]);

  // Auto-resize window to fit content
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(() => {
      const h = el.scrollHeight;
      if (h > 0) {
        invoke("resize_window", { height: h }).catch(() => {});
      }
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Global Esc handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
        getCurrentWindow().hide();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col" aria-busy={!loaded}>
      {isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center px-4 py-6 text-sm text-white/60">
          Checking license…
        </div>
      ) : status !== "licensed" ? (
        <ActivationScreen
          isActivating={isActivating}
          error={error}
          onActivate={activateLicense}
          onClearError={clearError}
        />
      ) : (
        <>
          <TimeDisplay
            selectedInstant={timeModel.selectedInstant}
            mode={timeModel.mode}
            onTimeTyped={timeModel.setTypedTime}
          />
          <ZoneList
            zones={zones}
            zoneInfos={zoneInfos}
            onRemove={removeZone}
            onReorder={reorderZones}
            onTimeTyped={timeModel.setTypedTimeForZone}
          />
          <AddZone
            existingZoneIds={zones.map((z) => z.id)}
            onAdd={addZone}
          />
          <TimeSlider
            offset={timeModel.sliderOffset}
            onChange={timeModel.setSliderOffset}
            onReset={timeModel.resetToNow}
            mode={timeModel.mode}
          />
          <div className="flex items-center justify-center gap-3 border-t border-white/[0.04] px-3 py-1">
            <span className="text-[9px] text-white/[0.15]">Esc close</span>
            <span className="text-[9px] text-white/[0.15]">Right-click copy</span>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
