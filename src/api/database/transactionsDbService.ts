import { dbContext } from "@/api/database/dbContext";
import { difference } from "lodash";

class TransactionsDbService {
  public async getNotIncluded(txIds: string[]) {
    const included = await dbContext.transactions.where("id").anyOf(txIds).primaryKeys();
    return difference(txIds, included);
  }
}

export const transactionsDbService = new TransactionsDbService();
