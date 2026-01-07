import { scanDom } from "./domScanner";
import { getDisplayLocationCafe24 } from "./getDisplayLocationCafe24";


export function buildScanPayload() {
  return {
    meta: {
      shopId: location.hostname,
      url: location.href,
      pageType: getDisplayLocationCafe24(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scannedAt: new Date().toISOString(),
    },
    candidates: scanDom(),
  };
}