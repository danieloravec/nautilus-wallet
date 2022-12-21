function shouldInject() {
  const documentElement = document.documentElement.nodeName;
  const docElemCheck = documentElement ? documentElement.toLowerCase() === "html" : true;
  const { docType } = window.document;
  const docTypeCheck = docType ? docType.name === "html" : true;
  return docElemCheck && docTypeCheck;
}

function inject(file) {
  try {
    const script = document.createElement("script");
    // eslint-disable-next-line no-undef
    script.src = chrome.runtime.getURL(file);
    (document.head || document.documentElement).appendChild(script);
    return true;
  } catch (e) {
    error("Injection failed: " + e);
    return false;
  }
}

function log(content) {
  // eslint-disable-next-line no-console
  console.log(`[Nautilus] ${content}`);
}

function error(content) {
  // eslint-disable-next-line no-console
  console.error(`[Nautilus] ${content}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// const ERGO_API_CODE = `

// // API_INSTANCE //`;

// const ERGO_CONST_CODE = `const ergo = Object.freeze(new NautilusErgoApi());`;

let ergoApiInjected = false;
let nautilusPort;

// eslint-disable-next-line no-undef
const Browser = typeof browser === "undefined" ? chrome : browser;

if (shouldInject()) {
  if (inject("js/connection.js")) {
    log("Access methods injected.");
  }

  window.addEventListener("message", function (event) {
    if (event.data.type !== "rpc/connector-request") {
      return;
    }

    log(event.data.type);

    this.chrome.runtime.sendMessage(event.data, (response) => {
      console.log(response);
      if (!response) {
        return;
      }

      if (response.type === "rpc/connector-response") {
        window.dispatchEvent(response, location.origin);
      } else if (response.type === "rpc/connector-response/auth") {
        if (
          !ergoApiInjected &&
          response.function === "connect" &&
          response.return.isSuccess &&
          response.return.data === true
        ) {
          if (inject("js/context.js")) {
            log("Ergo API injected.");
            if (response.params[0] === true) {
              log("Ergo API instantiated.");
            }
            ergoApiInjected = true;
          }
        }
        window.dispatchEvent(response, location.origin);
      } else if (response.type === "rpc/nautilus-event") {
        if (response.name === "disconnected") {
          window.dispatchEvent(new Event("ergo_wallet_disconnected"));
        }
      }
    });
  });
}
