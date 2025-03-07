import IQuote from '../models/quote';

declare global {
    var currentQuote: IQuote;
}

export {}

// interface IDecodedToken {
//     userId: string
// }

// declare global {
//     namespace Express {
//       interface Request {
//         decoded: IDecodedToken
//       }
//     }
// }
