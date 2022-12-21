class NautilusErgoApi {
  static instance;

  _resolver = {
    currentId: 1,
    requests: new Map()
  };

  constructor() {
    if (NautilusErgoApi.instance) {
      return NautilusErgoApi.instance;
    }

    window.addEventListener("message", this._eventHandler(this._resolver));
    NautilusErgoApi.instance = this;
    return this;
  }

  get_utxos(amountOrTargetObj = undefined, token_id = "ERG", paginate = undefined) {
    return this._rpcCall("getBoxes", [amountOrTargetObj, token_id, paginate]);
  }

  get_balance(token_id = "ERG") {
    return this._rpcCall("getBalance", [token_id]);
  }

  get_used_addresses(paginate = undefined) {
    return this._rpcCall("getUsedAddresses", [paginate]);
  }

  get_unused_addresses() {
    return this._rpcCall("getUnusedAddresses");
  }

  get_change_address() {
    return this._rpcCall("getChangeAddress");
  }

  sign_tx(tx) {
    return this._rpcCall("signTx", [tx]);
  }

  sign_tx_input(tx, index) {
    return this._rpcCall("signTxInput", [tx, index]);
  }

  sign_data(addr, message) {
    return this._rpcCall("signData", [addr, message]);
  }

  auth(addr, message) {
    return this._rpcCall("auth", [addr, message]);
  }

  get_current_height() {
    return this._rpcCall("getCurrentHeight");
  }

  submit_tx(tx) {
    return this._rpcCall("submitTx", [tx]);
  }

  _rpcCall(func, params) {
    return new Promise((resolve, reject) => {
      window.postMessage({
        type: "rpc/connector-request",
        requestId: this._resolver.currentId,
        function: func,
        params
      });
      this._resolver.requests.set(this._resolver.currentId, { resolve: resolve, reject: reject });
      this._resolver.currentId++;
    });
  }

  _eventHandler(resolver) {
    return (event) => {
      if (event.data.type === "rpc/connector-response") {
        console.debug(JSON.stringify(event.data));
        const promise = resolver.requests.get(event.data.requestId);
        if (promise !== undefined) {
          resolver.requests.delete(event.data.requestId);
          const ret = event.data.return;
          if (ret.isSuccess) {
            promise.resolve(ret.data);
          } else {
            promise.reject(ret.data);
          }
        }
      }
    };
  }
}
