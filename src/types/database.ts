import {
  AddressState,
  AddressType,
  AssetStandard,
  AssetSubtype,
  AssetType,
  Network,
  WalletSettings,
  WalletType
} from "@/types/internal";
import { ErgoBox } from "./connector";

export interface IDbWallet {
  id?: number;
  name: string;
  network: Network;
  type: WalletType;
  publicKey: string;
  chainCode: string;
  mnemonic?: string;
  settings: WalletSettings;
}

export interface IDbAddress {
  type: AddressType;
  state: AddressState;
  script: string;
  index: number;
  walletId: number;
}

export interface IDbAsset {
  tokenId: string;
  confirmedAmount: string;
  unconfirmedAmount?: string;
  address: string;
  walletId: number;
}

export interface IDbDAppConnection {
  origin: string;
  walletId: number;
  favicon?: string;
}

export interface IAssetInfo {
  id: string;
  mintingBoxId: string;
  mintingTransactionId?: string;
  name?: string;
  decimals?: number;
  standard?: AssetStandard;
  type: AssetType;
  subtype?: AssetSubtype;
  emissionAmount?: string;
  description?: string;
  artworkUrl?: string;
  artworkCover?: string;
  artworkHash?: string;
}

export interface IDbUTxO {
  id: string;
  confirmed: boolean;
  locked: boolean;
  spentTxId: string;
  address?: string;
  spentTimestamp?: number;
  content?: ErgoBox;
  walletId: number;
}

export interface ITransaction {
  id: string;
  type: TransactionType;
  height: number;
  timeStamp: Date;
  state: TransactionState;
  walletId: number;
  attachments: string[];
  fee: AssetAmount;
  sent: AssetAmount[];
  received: AssetAmount[];
}

export type AssetAmount = {
  address?: string;
  tokenId: string;
  amount: string;
};

export enum TransactionState {
  Pending = "pending",
  Confirmed = "confirmed",
  Rejected = "rejected"
}

export enum TransactionType {
  Sent = "sent",
  Received = "received",
  Intrawallet = "intrawallet",
  Swap = "swap"
}
