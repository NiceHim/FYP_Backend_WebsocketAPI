import IQuote from '../models/quote';

declare global {
    var currentQuote: IQuote;
}

export {}