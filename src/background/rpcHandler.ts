import router from "@/router";
import { RpcEvent, RpcMessage } from "@/types/connector";
import { Browser } from "@/utils/browserApi";

class RpcHandler {
  private _messages: RpcMessage[];

  constructor() {
    this._messages = [];
  }

  public get connected(): boolean {
    return !Browser?.runtime;
  }

  public sendMessage(message: RpcMessage): void {
    this._sendMessage(message);
  }

  private _sendMessage(message: RpcMessage | RpcEvent): void {
    if (!Browser?.runtime) {
      return;
    }

    // Browser.runtime.sendMessage(message);
  }

  public sendEvent(event: string, data?: any): void;
  public sendEvent(event: RpcEvent): void;
  public sendEvent(event: RpcEvent | string, data?: any): void {
    if (typeof event === "string") {
      this._sendMessage({
        type: "rpc/nautilus-event",
        name: event,
        data
      } as RpcEvent);

      return;
    }

    this._sendMessage(event);
  }

  public sendDisconnectedEvent(origin: string): void {
    this.sendEvent("disconnected", origin);
  }

  public start(): void {
    if (!Browser?.runtime) {
      return;
    }

    this.sendEvent("loaded");

    // Browser.runtime.onMessage.addListener((message: RpcMessage) => {
    //   if (message.type !== "rpc/nautilus-request") {
    //     return;
    //   }

    //   switch (message.function) {
    //     case "connect":
    //       router.replace({
    //         name: "connector-connect",
    //         query: { popup: "true", auth: "true" }
    //       });
    //       break;
    //     case "signTx":
    //       router.replace({
    //         name: "connector-sign-tx",
    //         query: { popup: "true" }
    //       });
    //       break;
    //     case "auth":
    //       router.replace({
    //         name: "connector-auth",
    //         query: { popup: "true" }
    //       });
    //       break;
    //     default:
    //       return;
    //   }

    //   this._messages.push(message);
    // });
  }

  public get messages(): RpcMessage[] {
    return this._messages;
  }
}

export const rpcHandler = new RpcHandler();
