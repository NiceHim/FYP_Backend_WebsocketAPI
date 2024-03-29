import { MongoClient, Collection, Db } from "mongodb";
import dotenv from "dotenv";
import ITransaction from "../models/transaction";
import IUser from "../models/user";
import ISubscription from "../models/subscription";

dotenv.config();

const connectionString = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DATABASE_NAME || "";

export let client: MongoClient | null = null;

export const collections: { 
    account?: Collection<IUser>;
    transcation?: Collection<ITransaction>;
    subscription?: Collection<ISubscription>;
} = {}

export async function connDB() {
    try {
        client = new MongoClient(connectionString);
        await client.connect();
        const db: Db = client.db(dbName);
        collections.account = db.collection<IUser>("account");
        collections.transcation = db.collection<ITransaction>("transaction");
        collections.subscription = db.collection<ISubscription>("subscription");
    } catch (error) {
        throw error;
    }
}
