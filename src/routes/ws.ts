import { Router } from "express";
import expressWs from 'express-ws';
import * as ForexSocketController from "../controllers/forexSocket";

const wsRoutes = Router() as expressWs.Router;

export const mountWsRouter = () => {
    wsRoutes.ws("/forex.quote.data", ForexSocketController.sendForexQuoteData);
    wsRoutes.ws("/user.trading.data", ForexSocketController.sendUserTradingData);
}
export default wsRoutes;