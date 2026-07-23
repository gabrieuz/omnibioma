"use client";

import { useEffect } from "react";

const reloadMarker = "omnibioma-dev-sw-cleanup";

export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const cleanup = async () => {
      const wasControlled = Boolean(navigator.serviceWorker.controller);
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("serwist-"))
            .map((cacheName) => caches.delete(cacheName))
        );
      }

      if (wasControlled) {
        if (sessionStorage.getItem(reloadMarker) !== "pending") {
          sessionStorage.setItem(reloadMarker, "pending");
          location.reload();
        }
        return;
      }

      sessionStorage.removeItem(reloadMarker);
    };

    void cleanup().catch((error: unknown) => {
      console.warn("Não foi possível limpar o service worker de desenvolvimento.", error);
    });
  }, []);

  return null;
}
