import { dbContext } from "@/api/database/dbContext";
import { difference } from "lodash";

class TransactionsDbService {
  public async getNotIncluded(txIds: string[]) {
    const included = await dbContext.transactions.where("id").anyOf(txIds).primaryKeys();
    return difference(txIds, included);
  }

  public async list(walletId: number, take = 20, offset = 0) {
    return await dbContext.transactions
      .where({ walletId })
      .reverse()
      .offset(offset)
      .limit(take)
      .toArray();
  }
}

export const transactionsDbService = new TransactionsDbService();
