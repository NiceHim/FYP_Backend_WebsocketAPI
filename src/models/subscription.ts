import { ObjectId } from "mongodb";

export default interface ISubscription {
    _id?: ObjectId;
    userName: string;
    ticker: string;
    lot: number;
    status: "running" | "ended";
    endedAt?: Date;
    createdAt: Date;
}