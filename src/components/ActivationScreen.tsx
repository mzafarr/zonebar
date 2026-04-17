import { useEffect, useRef, useState } from "react";

interface ActivationScreenProps {
  isActivating: boolean;
  error: string | null;
  onActivate: (licenseKey: string) => Promise<boolean>;
  onClearError: () => void;
}

async function readClipboardText(): Promise<string> {
  if (window.navigator.clipboard) {
    try {
      return await window.navigator.clipboard.readText();
    } catch {
      // fall through to the Tauri clipboard plugin
    }
  }

  const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
  return readText();
}

export function ActivationScreen({
  isActivating,
  error,
  onActivate,
  onClearError,
}: ActivationScreenProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, []);

  const handlePaste = async () => {
    try {
      const text = (await readClipboardText()).trim();
      if (text) {
        setLicenseKey(text);
        onClearError();
      }
    } catch {
      onClearError();
    }
  };

  const handleActivate = async () => {
    const trimmedKey = licenseKey.trim();
    if (!trimmedKey) return;
    await onActivate(trimmedKey);
  };

  return (
    <div className="flex min-h-[220px] items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-black/20 p-5 shadow-2xl backdrop-blur-xl">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <span className="text-xl">#</span>
          </div>
          <h1 className="text-lg font-semibold text-white">Activate ZoneBar</h1>
          <p className="text-sm text-white/60">
            Enter your Lemon Squeezy license key to unlock the app.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="license-key"
            className="text-[11px] uppercase tracking-wide text-white/45"
          >
            License key
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="license-key"
              value={licenseKey}
              onChange={(event) => {
                setLicenseKey(event.target.value);
                if (error) onClearError();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleActivate();
                }
              }}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/50"
              disabled={isActivating}
            />
            <button
              type="button"
              onClick={handlePaste}
              disabled={isActivating}
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Paste
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleActivate}
          disabled={!licenseKey.trim() || isActivating}
          className="flex h-10 w-full items-center justify-center rounded-xl bg-emerald-400 px-4 text-sm font-medium text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isActivating ? "Activating..." : "Activate"}
        </button>

        <p className="text-center text-[11px] text-white/35">
          Powered by Lemon Squeezy
        </p>
      </div>
    </div>
  );
}
