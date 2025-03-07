import { StrictFilter, StrictUpdateFilter, Document, UpdateFilter, AnyBulkWriteOperation, TransactionOptions, FindOptions, ObjectId } from "mongodb";
import DBManager from "./DBManager";

export async function getCurrentTransaction(userId: string) {
    try {
        const pipeline: Array<Document> = [
            {
                $match: { "userId": new ObjectId(userId), "done": false }
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
        const result = await DBManager.getInstance().collections.transaction?.aggregate(pipeline).toArray();
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getEquityAndUnrealizedPnL(userId: string) {
    try {
        const pipeline: Array<Document> = [
            {
                $match: { "_id": new ObjectId(userId) }
            }, 
            {
                $project: {
                    equity: { $round: [ "$equity", 2 ] },
                    unrealizedPnL: { $round: [ "$unrealizedPnL", 2 ] }
                }
            }
        ];
        const result = await DBManager.getInstance().collections.user?.aggregate(pipeline).toArray();
        return result;
    } catch (error) {
        throw error;
    }
}