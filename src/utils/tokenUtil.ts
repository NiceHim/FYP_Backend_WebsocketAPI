import * as jose from "jose";
import dotenv from "dotenv";
dotenv.config();

export async function decryptToken(token: string) {
    const { payload, protectedHeader } = await jose.jwtDecrypt(token, Buffer.from(process.env.JWE_TOKEN_SECRET as string, "base64"));
    return payload;
}