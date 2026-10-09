import { useEffect } from "react";

/** Ne kapcsoljon ki a telefon kijelzője játék közben (HTTPS kell hozzá). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) next.release();
        else lock = next;
      } catch {
        // pl. alacsony töltöttség vagy nem látható oldal: később újrapróbáljuk
      }
    };
    // A zár elengedődik, ha az oldal háttérbe kerül
    const onVisibility = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release();
    };
  }, [active]);
}
