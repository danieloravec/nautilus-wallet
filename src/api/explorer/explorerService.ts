import { API_URL } from "@/constants/explorer";
import {
  AddressApiResponse,
  AssetBalance,
  ExplorerBlockHeader,
  ExplorerBox,
  ExplorerSubmitTxResponse,
  ExplorerAddressBalanceResponse,
  ExplorerPage,
  ExplorerTransaction,
  ExplorerV0Box,
  PaginationParams
} from "@/types/explorer";
import axios from "axios";
import axiosRetry from "axios-retry";
import { chunk, find, isEmpty } from "lodash";
import JSONBig from "json-bigint";
import { ExplorerTokenMarket, ITokenRate } from "ergo-market-lib";
import { ErgoTx } from "@/types/connector";
import { asDict } from "@/utils/serializer";
import { isZero } from "@/utils/bigNumbers";
import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants/ergo";
import { AssetStandard } from "@/types/internal";
import { parseEIP4Asset } from "./eip4Parser";
import { IAssetInfo } from "@/types/database";

const explorerTokenMarket = new ExplorerTokenMarket({ explorerUri: API_URL });
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

class ExplorerService {
  public async getTxHistory(
    address: string,
    params?: {
      offset?: number;
      limit?: number;
      concise?: boolean;
    }
  ): Promise<AddressApiResponse<ExplorerPage<ExplorerTransaction>>> {
    const response = await axios.get(`${API_URL}/api/v1/addresses/${address}/transactions`, {
      params
    });

    return { address, data: response.data };
  }

  public async getAddressBalance(
    address: string
  ): Promise<AddressApiResponse<ExplorerAddressBalanceResponse>> {
    const response = await axios.get(`${API_URL}/api/v1/addresses/${address}/balance/total`);
    return { address, data: response.data };
  }

  public async getAddressesBalance(
    addresses: string[],
    options = { chunkBy: 20 }
  ): Promise<AssetBalance[]> {
    if (options.chunkBy <= 0 || options.chunkBy >= addresses.length) {
      const raw = await this.getAddressesBalanceFromChunk(addresses);
      return this._parseAddressesBalanceResponse(raw);
    }

    const chunks = chunk(addresses, options.chunkBy);
    let balances: AddressApiResponse<ExplorerAddressBalanceResponse>[] = [];
    for (const c of chunks) {
      balances = balances.concat(await this.getAddressesBalanceFromChunk(c));
    }

    return this._parseAddressesBalanceResponse(balances);
  }

  private _parseAddressesBalanceResponse(
    apiResponse: AddressApiResponse<ExplorerAddressBalanceResponse>[]
  ): AssetBalance[] {
    let assets: AssetBalance[] = [];

    for (const balance of apiResponse.filter((r) => !this._isEmptyBalance(r.data))) {
      if (!balance.data) {
        continue;
      }

      assets = assets.concat(
        balance.data.confirmed.tokens.map((t) => {
          return {
            tokenId: t.tokenId,
            name: t.name,
            decimals: t.decimals,
            standard:
              t.tokenType === AssetStandard.EIP4
                ? AssetStandard.EIP4
                : AssetStandard.Unstandardized,
            confirmedAmount: t.amount?.toString() || "0",
            address: balance.address
          };
        })
      );

      assets.push({
        tokenId: ERG_TOKEN_ID,
        name: "ERG",
        decimals: ERG_DECIMALS,
        standard: AssetStandard.Native,
        confirmedAmount: balance.data.confirmed.nanoErgs?.toString() || "0",
        unconfirmedAmount: balance.data.unconfirmed.nanoErgs?.toString(),
        address: balance.address
      });
    }

    return assets;
  }

  private _isEmptyBalance(balance: ExplorerAddressBalanceResponse): boolean {
    return (
      isZero(balance.confirmed.nanoErgs) &&
      isZero(balance.unconfirmed.nanoErgs) &&
      isEmpty(balance.confirmed.tokens) &&
      isEmpty(balance.unconfirmed.tokens)
    );
  }

  public async getAddressesBalanceFromChunk(
    addresses: string[]
  ): Promise<AddressApiResponse<ExplorerAddressBalanceResponse>[]> {
    return await Promise.all(addresses.map((a) => this.getAddressBalance(a)));
  }

  public async getUsedAddresses(addresses: string[], options = { chunkBy: 20 }): Promise<string[]> {
    if (options.chunkBy <= 0 || options.chunkBy >= addresses.length) {
      return this.getUsedAddressesFromChunk(addresses);
    }

    const chunks = chunk(addresses, options.chunkBy);
    let used: string[] = [];
    for (const c of chunks) {
      used = used.concat(await this.getUsedAddressesFromChunk(c));
    }

    return used;
  }

  private async getUsedAddressesFromChunk(addresses: string[]): Promise<string[]> {
    const resp = await Promise.all(
      addresses.map((address) => this.getTxHistory(address, { limit: 1, concise: true }))
    );

    const usedRaw = resp.filter((r) => r.data.total > 0);
    const used: string[] = [];
    for (const addr of addresses) {
      if (find(usedRaw, (x) => addr === x.address)) {
        used.push(addr);
      }
    }

    return used;
  }

  private async getUnspentBoxesByAddress(
    address: string,
    params?: {
      offset?: number;
      limit?: number;
      sortDirection?: "asc" | "desc";
    }
  ): Promise<ExplorerPage<ExplorerBox>> {
    const response = await axios.get(`${API_URL}/api/v1/boxes/unspent/byAddress/${address}`, {
      params
    });

    return response.data;
  }

  public async getBox(boxId: string): Promise<ExplorerBox> {
    const response = await axios.get(`${API_URL}/api/v1/boxes/${boxId}`);
    return response.data;
  }

  public async getMintingBox(tokenId: string): Promise<ExplorerV0Box> {
    const response = await axios.get(`${API_URL}/api/v0/assets/${tokenId}/issuingBox`);
    return response.data[0];
  }

  public async getBoxes(boxIds: string[]): Promise<ExplorerBox[]> {
    return await Promise.all(boxIds.map((id) => this.getBox(id)));
  }

  private async paginate<T>(
    endpoint: (params: PaginationParams) => Promise<ExplorerPage<T>>,
    params: PaginationParams,
    acc?: T[]
  ): Promise<T[]> {
    const response = await endpoint(params);
    const newAcc = acc ? acc.concat(response.items) : response.items;
    if (newAcc.length >= response.total) {
      return newAcc;
    }

    return await this.paginate(
      endpoint,
      {
        offset: params.offset + params.limit,
        limit: params.limit
      },
      newAcc
    );
  }

  public async getUnspentBoxesByAddresses(addresses: string[]): Promise<ExplorerBox[]> {
    const repsonse = await Promise.all(
      addresses.map((a) =>
        this.paginate((params: PaginationParams) => this.getUnspentBoxesByAddress(a, params), {
          offset: 0,
          limit: 500
        })
      )
    );

    return repsonse.flat();
  }

  public async getAssetInfo(tokenId: string): Promise<IAssetInfo | undefined> {
    try {
      const box = await this.getMintingBox(tokenId);
      return parseEIP4Asset(tokenId, box);
    } catch {
      return;
    }
  }

  public async getAssetsInfo(tokenIds: string[]): Promise<IAssetInfo[]> {
    const info = await Promise.all(tokenIds.map((a) => this.getAssetInfo(a)));
    return info.filter((i) => i) as IAssetInfo[];
  }

  public async getBlockHeaders(params?: {
    offset?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: string;
  }): Promise<ExplorerBlockHeader[]> {
    const response = await axios.get(`${API_URL}/api/v1/blocks/headers`, { params });
    return response.data.items;
  }

  public async sendTx(signedTx: ErgoTx): Promise<ExplorerSubmitTxResponse> {
    const response = await axios.post(
      `${API_URL}/api/v1/mempool/transactions/submit`,
      JSONBig.stringify(signedTx),
      {
        "axios-retry": {
          retries: 15,
          shouldResetTimeout: true,
          retryDelay: axiosRetry.exponentialDelay,
          retryCondition: (error) => {
            const data = error.response?.data;
            if (!data) {
              return true;
            }
            // retries until pending box gets accepted by the mempool
            return data.status === 400 && data.reason.match(/.*[iI]nput.*not found$/gm);
          }
        }
      }
    );

    return response.data;
  }

  public async isTransactionInMempool(txId: string): Promise<boolean | undefined> {
    try {
      const response = await axios.get(`${API_URL}/api/v0/transactions/unconfirmed/${txId}`, {
        "axios-retry": {
          retries: 5,
          shouldResetTimeout: true,
          retryDelay: axiosRetry.exponentialDelay,
          retryCondition: (error) => {
            const data = error.response?.data;
            return !data || data.status === 404;
          }
        }
      });
      return response.data != undefined;
    } catch (e: any) {
      const data = e?.response?.data;
      if (data && data.status === 404) {
        return false;
      }

      return undefined;
    }
  }

  public async areTransactionsInMempool(
    txIds: string[]
  ): Promise<{ [txId: string]: boolean | undefined }> {
    return asDict(
      await Promise.all(
        txIds.map(async (txId) => ({
          [txId]: await this.isTransactionInMempool(txId)
        }))
      )
    );
  }

  public async getTokenMarketRates(): Promise<ITokenRate[]> {
    return explorerTokenMarket.getTokenRates();
  }
}

export const explorerService = new ExplorerService();
