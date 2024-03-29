import * as ws from "ws";
import { getEquityAndUnrealizedPnL, getCurrentTransaction } from "../utils/temp";

export async function sendForexQuoteData(ws: ws) {
    setInterval(()=>{
        ws.send(JSON.stringify(global.currentQuote));
    }, 1000)
}

export async function sendUserTradingData(ws: ws, decoded: any) {
    setInterval(async ()=>{
        let [equityAndUnrealizedPnL, currentTransaction] = await Promise.all([getEquityAndUnrealizedPnL(decoded.userName), getCurrentTransaction(decoded.userName)]);
        let liveTradingData = {equity: equityAndUnrealizedPnL![0].equity, unrealizedPnL: equityAndUnrealizedPnL![0].unrealizedPnL, currentTransaction: currentTransaction};
        ws.send(JSON.stringify(liveTradingData));
    }, 2000)
    
}