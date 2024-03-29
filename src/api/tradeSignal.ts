import base from "../api/base";

export async function getTradeSignal(ticker: string) {
    const params = {
        ticker: ticker
    };
    const { data } = await base.post("/tradeSignal", params);
    return data;
}