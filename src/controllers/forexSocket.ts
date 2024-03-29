import { Request } from "express";
import { verifyToken } from "../middlewares/verifyToken";
import * as ws from "ws";
import * as ForexSocketService from "../services/forexSocket";

export async function sendForexQuoteData(ws: ws, req: Request) {
    ForexSocketService.sendForexQuoteData(ws);
}

export async function sendUserTradingData(ws: ws, req: Request) {
    let decoded = verifyToken(ws, req);
    if (decoded) {
        ForexSocketService.sendUserTradingData(ws, decoded);
    }
}