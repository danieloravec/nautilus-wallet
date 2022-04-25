import { asDict } from "@/utils/serializer";
import BigNumber from "bignumber.js";
import { ErgoBox, Registers, Token } from "./connector";
import { AssetStandard } from "./internal";

type Amount = number | string | BigNumber;

export type AddressApiResponse<T> = {
  address: string;
  data: T;
};

export interface IExplorerPage<T> {
  items: T[];
  total: number;
}

export interface IAddressExplorerPage<T> extends IExplorerPage<T> {
  address: string;
}

export type PaginationParams = {
  offset: number;
  limit: number;
};

export type ExplorerToken = {
  tokenId: string;
  index: number;
  amount: Amount;
  name: string;
  decimals: number;
  type: string;
};

export type AssetBalance = {
  tokenId: string;
  name?: string;
  decimals?: number;
  standard?: AssetStandard;
  confirmedAmount: string;
  unconfirmedAmount?: string;
  address: string;
};

type ExplorerBalanceItem = {
  nanoErgs: number | BigNumber;
  tokens: [
    {
      tokenId: string;
      amount: number | BigNumber;
      decimals: number;
      name: string;
      tokenType?: string;
    }
  ];
};

export type ExplorerAddressBalanceResponse = {
  confirmed: ExplorerBalanceItem;
  unconfirmed: ExplorerBalanceItem;
};

export type ExplorerBlockHeader = {
  id: string;
  parentId: string;
  version: number;
  height: number;
  epoch: number;
  difficulty: string;
  adProofsRoot: string;
  stateRoot: string;
  transactionsRoot: string;
  timestamp: number;
  nBits: number;
  size: number;
  extensionHash: string;
  powSolutions: {
    pk: string;
    w: string;
    n: string;
    d: string;
  };
  votes: {
    _1: number;
    _2: number;
    _3: number;
  };
};

export type ExplorerSubmitTxResponse = {
  id: string;
};

export type ExplorerRegisters = {
  [register: string]: {
    serializedValue: string;
    sigmaType: string;
    renderedValue: string;
  };
};

export type ExplorerTxInput = {
  boxId: string;
  value: Amount;
  index: number;
  spendingProof: string;
  outputBlockId: string;
  outputTransactionId: string;
  outputIndex: number;
  outputGlobalIndex: number;
  outputCreatedAt: number;
  outputSettledAt: number;
  ergoTree: string;
  address: string;
  assets: ExplorerToken[];
  additionalRegisters: ExplorerRegisters;
};

export type ExplorerBox = {
  boxId: string;
  transactionId: string;
  blockId: string;
  value: Amount;
  index: number;
  globalIndex: number;
  creationHeight: number;
  settlementHeight: number;
  ergoTree: string;
  address: string;
  assets: ExplorerToken[];
  additionalRegisters: ExplorerRegisters;
  spentTransactionId?: string | null;
  mainChain: boolean;
};

export type ExplorerV0Box = {
  id: string;
  txId: string;
  value: number | string | BigNumber;
  index: number;
  creationHeight: number;
  ergoTree: string;
  address: string;
  assets: ExplorerToken[];
  additionalRegisters: Registers;
  spentTransactionId?: string;
  mainChain: boolean;
};

export type ExplorerTransaction = {
  id: string;
  blockId: string;
  inclusionHeight: number;
  timestamp: number;
  index: number;
  globalIndex: number;
  numConfirmations: number;
  inputs: ExplorerTxInput[];
  dataInputs: string[];
  outputs: ExplorerBox[];
  size: number;
};

export function explorerBoxMapper(options: { asConfirmed: boolean }) {
  return (box: ExplorerBox) => {
    return {
      boxId: box.boxId,
      transactionId: box.transactionId,
      index: box.index,
      ergoTree: box.ergoTree,
      creationHeight: box.creationHeight,
      value: box.value.toString(),
      assets: box.assets.map((t) => {
        return {
          tokenId: t.tokenId,
          amount: t.amount.toString()
        };
      }),
      additionalRegisters: asDict(
        Object.keys(box.additionalRegisters).map((x) => {
          return { [x]: box.additionalRegisters[x].serializedValue };
        })
      ),
      confirmed: options.asConfirmed
    } as ErgoBox;
  };
}
