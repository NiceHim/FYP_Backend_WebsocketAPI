import { StrictFilter, StrictUpdateFilter, Document, UpdateFilter, AnyBulkWriteOperation, TransactionOptions, FindOptions } from "mongodb";
import { collections, client } from "../db/conn";

export async function getCurrentTransaction(userName: string) {
    try {
        const pipeline: Array<Document> = [
            {
                $match: { "userName": userName, "done": false }
            }, 
            {
                $project: {
                    "ticker": 1,
                    "price": 1,
                    "lot": 1,
                    "action": 1,
                    PnL: { $round: [ "$PnL", 2 ] },
                    "createdAt": { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$createdAt" } },
                    "_id": 0
                }
            },
            {
                $sort: { "createdAt": -1 }
            }
        ];
        const result = await collections.transcation?.aggregate(pipeline).toArray();
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getEquityAndUnrealizedPnL(userName: string) {
    try {
        const pipeline: Array<Document> = [
            {
                $match: { "userName": userName }
            }, 
            {
                $project: {
                    equity: { $round: [ "$equity", 2 ] },
                    unrealizedPnL: { $round: [ "$unrealizedPnL", 2 ] }
                }
            }
        ];
        const result = await collections.account?.aggregate(pipeline).toArray();
        return result;
    } catch (error) {
        throw error;
    }
}