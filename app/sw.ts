import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig { __SW_MANIFEST: (PrecacheEntry | string)[] }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: { entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }] },
  runtimeCaching: [
    { matcher: ({ url }) => url.pathname === "/api/analyze", handler: new NetworkOnly() },
    ...defaultCache.filter((entry) => String(entry.matcher) !== String(/\/api\//))
  ]
});

serwist.addEventListeners();
