
import DBManager from "./src/db/DBManager";
import { createClient } from 'redis';
import path from 'path';
import express, { Application } from "express";
import { WebSocketServer } from 'ws';
import cookieParser from 'cookie-parser';
import { verifyToken } from './src/middlewares/verifyToken';
import { sendUserTradingData } from './src/services/forexSocket';
import { CustomWebSocket } from './src/types/customWebSocket';
import dotenv from "dotenv";

const env = process.env.NODE_ENV || "dev";
dotenv.config({ path: path.resolve(__dirname, `.env.${env}`) });

const redisURL = process.env.REDIS_URL || "redis://localhost:6379";
const app: Application = express();
const port = process.env.PORT || 3010;
const wssForexQuote = new WebSocketServer(
	{
		noServer: true
	}
);
const wssUserTrading = new WebSocketServer(
	{
		noServer: true
	}
);

wssUserTrading.on("connection", async (ws: CustomWebSocket, req) => {
	const pingIntervalId = setInterval(() => {
		ws.send("ping")
	}, 10000)
	await sendUserTradingData(ws);

	wssUserTrading.on("close", () => {
		clearInterval(pingIntervalId);
	})
})

wssForexQuote.on("connection", async (ws: CustomWebSocket, req) => {
	const pingIntervalId = setInterval(() => {
		ws.send("ping")
	}, 10000)

	wssForexQuote.on("close", () => {
		clearInterval(pingIntervalId);
	})
})

const subscriber = createClient({ url: redisURL });
subscriber.subscribe("forex.quote", (message) => {
	wssForexQuote.clients.forEach((client) => {
		client.send(message);
	})
})

app.use(cookieParser());

DBManager.getInstance().connDB().then(() => {
	console.log("Database connected");
	subscriber.connect().then(() => {
		console.log("Redis connected");
		const httpServer = app.listen(port, () => {
		  console.log(`[server]: Server is running at http://localhost:${port}`);
		});
	
		httpServer.on("upgrade", (req, socket, head) => {
			if (req.url === "/ws/forex.quote.data") {
				wssForexQuote.handleUpgrade(req, socket, head, (ws: CustomWebSocket, req) => {
					wssForexQuote.emit("connection", ws, req);
				})
			} else if (req.url === "/ws/user.trading.data") {
				wssUserTrading.handleUpgrade(req, socket, head, async (ws: CustomWebSocket, req) => {
					const decryptedPayload = await verifyToken(req, () => {
						socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
						socket.destroy();
						return;
					});
					ws.decryptedPayload = decryptedPayload;
					wssUserTrading.emit("connection", ws, req);
				})
			} else {
				socket.destroy();
			}
		})
	})
})
