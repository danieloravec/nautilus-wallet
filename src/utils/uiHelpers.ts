import { Browser } from "./browserApi";

const POPUP_SIZE = { width: 380, height: 640 };

function getDefaultBounds() {
  return {
    width: typeof screen !== "undefined" ? screen.availWidth : undefined,
    positionX: 0,
    positionY: 0
  };
}

function getBoundsForWindow(targetWindow: chrome.windows.Window) {
  const defaults = getDefaultBounds();
  return {
    width: targetWindow.width ?? defaults.width,
    positionX: targetWindow.left ?? defaults.positionX,
    positionY: targetWindow.top ?? defaults.positionY
  };
}

export function getBoundsForTabWindow(
  targetTabId: number
): Promise<{ width?: number; positionX: number; positionY: number }> {
  return new Promise((resolve) => {
    Browser?.tabs.get(targetTabId, (tab) => {
      if (!tab) {
        resolve(getDefaultBounds());
      }

      Browser?.windows.get(tab.windowId, (targetWindow) => {
        if (!targetWindow) {
          resolve(getDefaultBounds());
        }

        resolve(getBoundsForWindow(targetWindow));
      });
    });
  });
}

export async function openWindow(tabId: number) {
  const bounds = await getBoundsForTabWindow(tabId);
  Browser?.windows.create({
    ...POPUP_SIZE,
    focused: true,
    type: "popup",
    url: "index.html",
    left: bounds.width ? bounds.width + bounds.positionX - (POPUP_SIZE.width + 10) : undefined,
    top: bounds.positionY + 40
  });
}
