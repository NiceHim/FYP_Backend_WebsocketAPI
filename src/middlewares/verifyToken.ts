import { Request } from "express";
import * as jwt from "jsonwebtoken";
import * as ws from "ws";
import dotenv from "dotenv";
dotenv.config();

export function verifyToken(ws: ws, req: Request) {
    let token: string;
    let decodedToken: any;
    if (req.headers["sec-websocket-protocol"]) {
        token = req.headers["sec-websocket-protocol"].split(", ")[0];
        jwt.verify(token, process.env.TOKEN_SECRET as string, (error: any, decoded: any) => {
            if (error) {
                ws.close();
            }
            decodedToken = decoded;
        });
    } else {
        ws.close();
    }
    return decodedToken;
}