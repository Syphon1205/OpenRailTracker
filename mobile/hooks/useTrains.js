// ─── useTrains hook ──────────────────────────────────────────────────────────
// Polls /api/trains at the configured interval and returns train data + metadata.

import { useState, useEffect, useCallback, useRef } from "react";
import { SERVER_URL, REFRESH_INTERVAL_MS } from "../constants/config";

export function useTrains() {
  const [trains, setTrains]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  const fetchTrains = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/trains`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Normalise: API may return array or { trains: [...] }
      const list = Array.isArray(data) ? data : (data.trains ?? []);
      setTrains(list);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrains();
    timerRef.current = setInterval(fetchTrains, REFRESH_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchTrains]);

  return { trains, loading, error, lastUpdated, refresh: fetchTrains };
}
