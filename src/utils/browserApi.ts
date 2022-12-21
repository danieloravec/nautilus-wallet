function getApiInstance(): typeof chrome | undefined {
  if (typeof browser !== "undefined") {
    return browser;
  } else if (typeof chrome !== "undefined") {
    return chrome;
  }

  return undefined;
}

export const Browser = getApiInstance();

export function hasBrowserContext(): boolean {
  return Browser !== undefined;
}

export function isPopup() {
  if (!Browser || !Browser.extension) {
    return false;
  }

  return Browser.extension.getViews({ type: "popup" })[0] === self;
}
