import { IncomingMessage } from "http";
import { decryptToken } from "../utils/tokenUtil";
import { IDecryptedPayload } from "../types/customWebSocket";
import * as cookie from "cookie";

export async function verifyToken(req: IncomingMessage, next: Function): Promise<IDecryptedPayload> {
    let decryptedPayload: any;
    const cookies = cookie.parse(req.headers.cookie || "");
    if (cookies.token == null) {
        return next();
    } else {
        try {
            const payload = await decryptToken(cookies.token);
            if (payload == null) {
                return next();
            } else {
                decryptedPayload = { userId: payload["userId"] as string };
            }
        } catch (error) {
            return next();
        }
    }
    return decryptedPayload;
}