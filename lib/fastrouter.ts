export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    name?: string;
    tool_call_id?: string;
    thought_signature?: string;
    tool_calls?: any[];
}

export interface FastRouterResponse {
    choices: {
        message: {
            role: string;
            content: string;
            thought_signature?: string;
            tool_calls?: {
                id: string;
                type: 'function';
                function: {
                    name: string;
                    arguments: string;
                };
            }[];
        };
        finish_reason: string;
    }[];
}

export async function chatCompletion(messages: ChatMessage[], options: {
    model?: string;
    tools?: any[];
    tool_choice?: string;
    response_format?: { type: 'json_object' };
} = {}) {
    const apiKey = process.env.FASTROUTER_API;
    const model = "google/gemini-3-flash-preview"; // Strictly use this model

    const response = await fetch("https://go.fastrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            ...(options.tools && { tools: options.tools }),
            ...(options.tool_choice && { tool_choice: options.tool_choice }),
            ...(options.response_format && { response_format: options.response_format })
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`FastRouter API Error: ${response.status} ${error}`);
    }

    return await response.json() as FastRouterResponse;
}
