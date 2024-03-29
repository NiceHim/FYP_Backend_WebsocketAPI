import { StrictFilter, StrictUpdateFilter, Document, UpdateFilter, AnyBulkWriteOperation, TransactionOptions, OptionalId } from "mongodb";
import { collections, client } from "../db/conn";
import { getTradeSignal } from "../api/tradeSignal";
import ITransaction from "../models/transaction";
import IAccount from "../models/account";

async function stopTransaction(ticker: string, action: string, previousCloseDate: Date) {
    try {
        const filter: StrictFilter<ITransaction> = {ticker: ticker, action: { $ne: action }, done: false};
        const pipeline: Array<Document> = [
            {
                "$set": {
                    "done": true,
                    "endedAt": previousCloseDate
                }
            }
        ];
        const result = await collections.transcation?.updateMany(filter, pipeline);
        return result;
    } catch (error) {
        throw error;
    }
}

async function getTransactionGroupByUser(ticker: string, previousCloseDate: Date) {
    try {
        const pipeline: Array<Document> = [
            {
                $match: {
                    "ticker": ticker,
                    "done": true,
                    "endedAt": previousCloseDate
                }
            },
            { 
                $group: {
                    "_id": "$userName",
                    "totalPnL": { $sum: "$PnL" },
                    "totalLot": { $sum: { $abs: "$lot" } }
                }
            }
        ];
        const result = collections.transcation?.aggregate(pipeline).toArray()
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
                            "equity": { $add: [doc.totalPnL, { $multiply: [100000, doc.totalLot] }, "$balance" ] },
                            "balance": { $add: [doc.totalPnL, { $multiply: [100000, doc.totalLot] }, "$balance" ] },
                            "unrealizedPnL": { $add: [-doc.totalPnL, "$unrealizedPnL"]}
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

async function getEligibleAccount(ticker: string) {
    try {
        const pipeline: Array<Document> = [
            {
                $match: {
                    "ticker": ticker,
                    "status": "running"
                }
            },
            {
                $lookup: {
                    "from": "account",
                    "localField": "userName",
                    "foreignField": "userName",
                    "as": "account_matches"
                }
            },
            {
                $set: {
                    "account_matches": { $first: "$account_matches" } 
                }
            },
            {
                $match: {
                    $expr: {
                        $gte: [ "account_matches.balance", { $multiply: [100000, "$lot"] } ]
                    }
                }
            },
            {
                $project: {
                    "userName": 1,
                    "ticker": 1,
                    "lot": 1,
                    "_id": 0
                }
            }, 
            {
                $lookup: {
                    "from": "transaction",
                    "let": {
                        "userName": "$userName"
                    },
                    "pipeline": [
                       { 
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: [ "$userName", "$$userName" ] },
                                        { $eq: [ "$ticker", ticker ] },
                                        { $eq: [ "$done", false ] }
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "transaction_matches"
                }
            },
            {
                $match: {
                    "transaction_matches.userName": { $exists: false }
                }
            },
            {
                $project: {
                    "userName": 1,
                    "ticker": 1,
                    "lot": 1,
                    "_id": 0
                }
            }, 
        ];
        const result = await collections.subscription?.aggregate(pipeline).toArray();
        return result;
    } catch (error) {
        throw error;
    }
}

async function insertTransaction(data: Document[], action: string, previousClosePrice: number, previousCloseDate: Date) {
    try {
        let insertList: OptionalId<ITransaction>[] = [];
        const lotSign = action == "buy" ? 1 : -1;
        data.forEach(async (doc)=>{ 
            insertList.push({
                "ticker": doc.ticker,
                "price": previousClosePrice,
                "lot": lotSign * doc.lot,
                "action": action,
                "userName": doc.userName,
                "PnL": 0,
                "done": false,
                "createdAt": previousCloseDate
            })
        })
        const result = await collections.transcation?.insertMany(insertList);
        return result;
    } catch (error) {
        throw error;
    }
}

async function bulkUpdateAccountBalance(data: Document[]) {
    try {
        let bulkUpdateList: AnyBulkWriteOperation<IAccount>[] = [];
        data.forEach(async (doc)=>{
            bulkUpdateList.push({
                updateOne: {
                    filter: { "userName": doc.userName },
                    update: [{
                        $set: { 
                            "balance": { $add: [{ $multiply: [-100000, doc.lot] }, "$balance"] },
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

export async function autoTrade(ticker: string) {
    if (client) {
        const session = client.startSession();
        const transactionOptions: TransactionOptions = {
            readPreference: 'primary',
            readConcern: { level: 'local' },
            writeConcern: { w: 'majority' }
        };
        try {
            const tradeSignal = await getTradeSignal(ticker);
            if (tradeSignal["message"]) {
                const previousCloseDate = new Date(Math.round(tradeSignal["message"].previousCloseTimestamp / 1000) * 1000);
                await session.withTransaction(async () => {
                    await stopTransaction(ticker, tradeSignal["message"].action, tradeSignal["message"].previousClosePrice);
                    const transactionGroupByUser = await getTransactionGroupByUser(ticker, previousCloseDate);
                    if (transactionGroupByUser && transactionGroupByUser.length > 0) {
                        await bulkUpdateAccount(transactionGroupByUser);
                        const eligibleAccounts = await getEligibleAccount(ticker);
                        console.log(eligibleAccounts)
                        if (eligibleAccounts && eligibleAccounts.length > 0) {
                            await insertTransaction(eligibleAccounts, tradeSignal["message"].action, tradeSignal["message"].previousClosePrice, previousCloseDate);
                            await bulkUpdateAccountBalance(eligibleAccounts);
                        }
                    } 
                }, transactionOptions);
            }
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

}