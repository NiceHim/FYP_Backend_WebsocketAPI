import { StrictFilter, StrictUpdateFilter, Document, UpdateFilter, AnyBulkWriteOperation, TransactionOptions } from "mongodb";
import { collections, client } from "../db/conn";
import ITransaction from "../models/transaction";
import IAccount from "../models/account";

async function updateTransaction(ticker: string, currentPrice: number) {
    try {
        const filter: StrictFilter<ITransaction> = {ticker: ticker, done: false};
        const pipeline: Array<Document> = [
            { 
                $set: { 
                    PnL: {$multiply: [100000, { $subtract: [currentPrice, "$price"] }, "$lot"]}
                }
            }
        ]
        const result = collections.transcation?.updateMany(filter, pipeline);
        return result;
    } catch (error) {
        throw error;
    }
}


async function getTransaction(ticker: string) {
    try {
        const filter: StrictFilter<ITransaction> = {ticker: ticker};
        const result = collections.transcation?.findOne(filter);
        return result;
    } catch (error) {
        throw error;
    }
}


async function getTransactionGroupByUser() {
    try {
        const pipeline: Array<Document> = [
            {
                $match : { "done": false }
            },
            {
                $group: {
                    _id : "$userName",
                    totalPnL: { $sum: "$PnL" },
                    totalLot: { $sum: { $abs: "$lot" } }
                }
            }
        ]
        const result = await collections.transcation?.aggregate(pipeline).toArray();
        return result;
    } catch (error) {
        throw error;
    }
}


async function bulkUpdateAccount(data: Document[]) {
    try {
        let bulkUpdateList: AnyBulkWriteOperation<IAccount>[] = [];
        data.forEach(async (doc)=>{
            bulkUpdateList.push({
                updateOne: {
                    filter: { "userName": doc._id },
                    update: [{
                        $set: { 
                            "equity": { $add: [doc.totalPnL, { $multiply: [100000, doc.totalLot] }, "$balance"] },
                            "unrealizedPnL": doc.totalPnL,
                        }
                    }]
                }
            });
            if (bulkUpdateList.length == 1000) {
                await collections.account?.bulkWrite(bulkUpdateList, { ordered : false });
                bulkUpdateList = [];
            }
        })
        if (bulkUpdateList.length > 0) await collections.account?.bulkWrite(bulkUpdateList, { ordered : false });
    } catch (error) {
        throw error;
    }
}

export async function updateTransactionAndAccount(ticker: string, currentPrice: number) {
    if (client) {
        const session = client.startSession();
        const transactionOptions: TransactionOptions = {
            readPreference: 'primary',
            readConcern: { level: 'local' },
            writeConcern: { w: 'majority' }
        };
        try {
            await session.withTransaction(async () => {
                const updateTransactionResult = await updateTransaction(ticker, currentPrice);
                const data = await getTransactionGroupByUser();
                if (data) {
                    await bulkUpdateAccount(data);
                }
            }, transactionOptions);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }
}