import { WebSocket } from "ws"

interface IDecryptedPayload {
    userId: string
}

interface CustomWebSocket extends WebSocket {
    decryptedPayload?: IDecryptedPayload
}

export { IDecryptedPayload, CustomWebSocket };