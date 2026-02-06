// @ts-ignore
import PDFParser from 'pdf2json';
import { normalizeTransaction } from '../normalizer';
import { categorizeTransaction, Category } from '../categorizer';
import { Channel } from '../normalizer';
import { chatCompletion } from '../fastrouter';

// Transaction types
export type TransactionType = 'credit' | 'debit';

export interface ParsedTransaction {
    date: Date;
    description: string;
    amount: number;
    type: TransactionType;
    balance?: number;
    merchant: string;
    channel: Channel;
    category: Category;
    tags: string[];
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, true); // true = text content only

        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            const text = pdfParser.getRawTextContent();
            resolve(text);
        });

        pdfParser.parseBuffer(buffer);
    });
}

export async function parseWithGemini(text: string): Promise<ParsedTransaction[]> {
    const prompt = `
    Analyze the following bank statement text and extract all transactions into a JSON array.
    
    The output must be a valid JSON array of objects with this schema:
    [{
        "date": "ISO date string",
        "description": "Clean description",
        "amount": number (positive),
        "type": "credit" | "debit",
        "merchant": "Merchant name",
        "category": "Food" | "Travel" | "Shopping" | "Entertainment" | "Bills" | "Health" | "Education" | "Rent" | "Salary" | "Investment" | "Transfer" | "Other",
        "channel": "UPI" | "Card" | "NetBanking" | "Cash" | "Other",
        "balance": number (optional)
    }]

    Rules:
    - Ignore headers, footers, and page numbers.
    - If a category is not clear, use 'Other'.
    - If channel is not clear, use 'Other'.
    - Extract meaningful merchant names.
    - Return ONLY the JSON array.

    Text to analyze:
    ${text.substring(0, 30000)}
    `;

    try {
        const result = await chatCompletion([
            { role: 'user', content: prompt }
        ], {
            response_format: { type: 'json_object' }
        });

        let textResponse = result.choices[0].message.content;
        if (!textResponse) {
            throw new Error("FastRouter returned an empty response.");
        }

        // Sometimes JSON mode returns an object { "transactions": [...] } or similar depending on the model
        // but here we expect an array. If it's a string, we parse it.
        let rawTransactions: any[];
        const parsed = JSON.parse(textResponse);

        if (Array.isArray(parsed)) {
            rawTransactions = parsed;
        } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
            rawTransactions = parsed.transactions;
        } else {
            // Fallback: search for array in the object
            const possibleArray = Object.values(parsed).find(v => Array.isArray(v));
            if (possibleArray) {
                rawTransactions = possibleArray as any[];
            } else {
                throw new Error("Could not find transactions array in response");
            }
        }

        return rawTransactions.map((t: any) => {
            const normalized = normalizeTransaction(t.description);
            const fallbackCategory = categorizeTransaction(normalized.merchant, t.description, t.type);

            return {
                date: new Date(t.date),
                description: t.description,
                amount: t.amount,
                type: t.type as TransactionType,
                balance: t.balance,
                merchant: t.merchant || normalized.merchant,
                channel: (t.channel as Channel) || 'Other',
                category: (t.category as Category) || fallbackCategory,
                tags: normalized.tags,
            };
        });

    } catch (error: any) {
        console.error("FastRouter Parsing Error:", error);
        throw new Error("FastRouter Parsing Error: " + (error.message || error));
    }
}

export async function parseBankStatementPDF(buffer: Buffer): Promise<ParsedTransaction[]> {
    try {
        const text = await extractTextFromPDF(buffer);
        return await parseWithGemini(text);
    } catch (error) {
        console.error("PDF Text Extraction Error:", error);
        throw new Error("Failed to parse PDF: " + String(error));
    }
}

export async function parseHDFCStatement(buffer: Buffer): Promise<ParsedTransaction[]> {
    return parseBankStatementPDF(buffer);
}

export async function parseSBIStatement(buffer: Buffer): Promise<ParsedTransaction[]> {
    return parseBankStatementPDF(buffer);
}

export async function parseICICIStatement(buffer: Buffer): Promise<ParsedTransaction[]> {
    return parseBankStatementPDF(buffer);
}

export async function parseStatement(buffer: Buffer, bankHint?: string): Promise<ParsedTransaction[]> {
    return parseBankStatementPDF(buffer);
}
