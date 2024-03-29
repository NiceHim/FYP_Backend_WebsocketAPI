import { CronJob } from 'cron';
import { PolygonClient } from "./src/utils/polygonClient";
import { restClient } from "@polygon.io/client-js";
import { connDB } from "./src/db/conn";
import Bottleneck from "bottleneck";
import express, { Express, NextFunction, Request, Response } from "express";
import expressWs from 'express-ws';
import wsRoutes, { mountWsRouter } from './src/routes/ws';
import { updateTransactionAndAccount } from "./src/cron/updateTranscationAndAccount";
import type IQuote from "./src/models/quote"; 
import dotenv from "dotenv";
dotenv.config();

const APIKEY = process.env.POLYGON_IO_API_KEY || 'YOUR_API_KEY';
const { app, getWss, applyTo } = expressWs(express());
mountWsRouter();
const port = process.env.PORT || 3000;
// const router = express.Router() as expressWs.Router;

connDB();

const limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 100
});

const polygonRestClient = restClient(APIKEY);
const polygonWsClient = new PolygonClient({apiKey: APIKEY});
polygonWsClient.subscribe(["C.EUR-USD"]);
polygonWsClient.on("C", (quote: IQuote) => {
	global.currentQuote = quote;
})

const updateTransactionAndAccountCronJob = new CronJob(
	'*/3 * * * * *', // cronTime
	async function () {
        if (global.currentQuote) {
            const result = await limiter.schedule(()=>updateTransactionAndAccount("EURUSD", global.currentQuote.b))
        }
	}, // onTick
	null, // onComplete
	true, // start
	'Asia/Hong_Kong' // timeZone
);
// const autoTradeCronJob = new CronJob(
//     '* * 8 * * 1-5', // cronTime
// 	async function () {
//         const marketStatus = await polygonRestClient.reference.marketStatus();
//         if (marketStatus.currencies?.fx == "open") {
//             const result = await autoTrade("EURUSD");
//         }
// 	}, // onTick
// 	null, // onComplete
// 	true, // start
// 	'Asia/Hong_Kong' // timeZone
// )


app.use("/ws", wsRoutes);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});