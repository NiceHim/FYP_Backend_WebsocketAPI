import { CustomWebSocket } from "../types/customWebSocket";
import { getEquityAndUnrealizedPnL, getCurrentTransaction } from "../db/procedures";

export async function sendUserTradingData(ws: CustomWebSocket) {
    setInterval(async ()=>{
        let [equityAndUnrealizedPnL, currentTransaction] = await Promise.all([getEquityAndUnrealizedPnL(ws.decryptedPayload!.userId), getCurrentTransaction(ws.decryptedPayload!.userId)]);
        let liveTradingData = {equity: equityAndUnrealizedPnL![0].equity, unrealizedPnL: equityAndUnrealizedPnL![0].unrealizedPnL, currentTransaction: currentTransaction};
        ws.send(JSON.stringify(liveTradingData));
    }, 2000)
}