import { useCallback, useEffect, useState } from "react";
import {
  activateLicense,
  getStoredLicenseKey,
  validateLicense,
  type LicenseValidation,
} from "../lib/license";

type LicenseStatus = "loading" | "licensed" | "unlicensed";

function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function useLicenseGate() {
  const [status, setStatus] = useState<LicenseStatus>("loading");
  const [validation, setValidation] = useState<LicenseValidation | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const storedKey = await getStoredLicenseKey();
      if (!storedKey) {
        setValidation(null);
        setStatus("unlicensed");
        return;
      }

      const result = await validateLicense(storedKey);
      if (result.valid) {
        setValidation(result);
        setStatus("licensed");
        return;
      }

      setValidation(null);
      setStatus("unlicensed");
      setError(result.error ?? "Your license could not be validated");
    } catch (cause) {
      setValidation(null);
      setStatus("unlicensed");
      setError(toErrorMessage(cause, "Failed to load license status"));
    }
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const handleActivate = useCallback(async (licenseKey: string) => {
    setIsActivating(true);
    setError(null);

    try {
      const result = await activateLicense(licenseKey);
      if (result.valid) {
        setValidation(result);
        setStatus("licensed");
        return true;
      }

      setStatus("unlicensed");
      setValidation(null);
      setError(result.error ?? "Activation failed");
      return false;
    } catch (cause) {
      setStatus("unlicensed");
      setValidation(null);
      setError(toErrorMessage(cause, "Activation failed"));
      return false;
    } finally {
      setIsActivating(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    status,
    validation,
    isLoading: status === "loading",
    isActivating,
    error,
    initialize,
    activateLicense: handleActivate,
    clearError,
  };
}
