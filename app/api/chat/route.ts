import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Habit from '@/models/Habit';
import Profile from '@/models/Profile';
import ChatSession from '@/models/ChatSession';
import { allTools, toolsMap } from '@/tools/tools-index';
import { chatCompletion, ChatMessage } from '@/lib/fastrouter';

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const userPayload = await getUserFromRequest(req);
        if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = userPayload.userId;

        const { message, mode = 'general', sessionId, localTime } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const currentTime = localTime || new Date().toLocaleString();

        let session;
        if (sessionId) {
            session = await ChatSession.findOne({ _id: sessionId, userId });
        }

        if (!session) {
            session = await ChatSession.create({
                userId,
                title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
                mode,
                messages: []
            });
        }

        // Fetch context
        let context = '';
        const profile = await Profile.findOne({ userId });
        const userName = profile?.name || userPayload.name || 'User';

        if (mode === 'finance') {
            const transactions = await Transaction.find({ userId }).sort({ date: -1 }).limit(10);
            context = transactions.length > 0
                ? `Financial Context: Recent transactions include ${transactions.map(t => `${t.merchant}: ₹${t.amount} (${t.category})`).join(', ')}`
                : 'Financial Context: No recent transactions found.';
        } else {
            const habits = await Habit.find({ userId });
            context = habits.length > 0
                ? `Life Context: Current habits being tracked: ${habits.map(h => h.name).join(', ')}`
                : 'Life Context: No active habits being tracked.';
        }

        const history: ChatMessage[] = session.messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
        }));

        history.unshift({
            role: 'system',
            content: `You are Kairos AI, a premium personal assistant. 
Mode: ${mode}
User Name: ${userName}
Current Context: ${context}
Today's Date: ${currentTime} (Always use this for relative dates like 'tomorrow', 'next week', etc.)

Instructions:
1. Provide concise, helpful advice.
2. If in finance mode, focus on budget and spending.
3. If in general mode, focus on habits, productivity, and well-being.
4. Use the provided tools to help the user with their data (finance, habits, mood, tasks, etc.).
5. If a tool is called, use its output to provide a final response to the user.
6. Always maintain a premium, professional yet friendly tone.
8. Use proper GitHub Flavored Markdown (GFM). 
9. When creating tables, ensure they are preceded and followed by a blank line, and use standard pipe and dash syntax.
10. Do not use random symbols; keep the layout clean and professional.`
        });

        history.push({ role: 'user', content: message });

        const openAITools = allTools.map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }
        }));

        let responseText = "";
        let toolsExecuted = false;

        // OpenAI Style Re-Act Loop
        let currentMessages = [...history];

        for (let i = 0; i < 5; i++) {
            const response = await chatCompletion(currentMessages, { tools: openAITools });
            const assistantMessage = response.choices[0].message;

            if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
                responseText = assistantMessage.content || "";
                break;
            }

            // Handle tool calls
            currentMessages.push({
                role: 'assistant',
                content: assistantMessage.content || '',
                // @ts-ignore - FastRouter uses standard OpenAI tool_calls
                tool_calls: assistantMessage.tool_calls
            } as any);

            for (const toolCall of assistantMessage.tool_calls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);
                const tool = toolsMap[toolName];

                if (tool) {
                    console.log(`[FASTROUTER TOOL CALL] ${toolName}`, toolArgs);
                    const result = await tool.execute(toolArgs, userId);
                    toolsExecuted = true;
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        name: toolName,
                        content: JSON.stringify(result)
                    });
                } else {
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        name: toolName,
                        content: JSON.stringify({ error: "Tool not found" })
                    });
                }
            }
        }

        const finalContent = responseText || "I've processed your request.";

        // Update session
        session.messages.push({ role: 'user', content: message, timestamp: new Date() });
        session.messages.push({ role: 'assistant', content: finalContent, timestamp: new Date() });

        // Auto-rename
        if (session.messages.length === 2 || session.messages.length === 4) {
            try {
                const namingPrompt = `Based on the following conversation snippets, generate a very short (3-5 words), professional title for this chat. Respond ONLY with the title.
                
                User: ${session.messages[0].content}
                AI: ${session.messages[1] ? session.messages[1].content : "No response"}`;

                const namingResponse = await chatCompletion([
                    { role: 'user', content: namingPrompt }
                ]);
                const newTitle = namingResponse.choices[0].message.content.trim().replace(/^"(.*)"$/, '$1');
                if (newTitle) {
                    session.title = newTitle;
                }
            } catch (renameError) {
                console.error("Auto-rename failed:", renameError);
            }
        }

        await session.save();

        return NextResponse.json({
            response: finalContent,
            sessionId: session._id,
            title: session.title,
            toolsExecuted
        });

    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const userPayload = await getUserFromRequest(req);
        if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = userPayload.userId;

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (sessionId) {
            const session = await ChatSession.findOne({ _id: sessionId, userId });
            if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            return NextResponse.json({ session });
        }

        const sessions = await ChatSession.find({ userId })
            .select('title mode updatedAt')
            .sort({ updatedAt: -1 })
            .limit(20);

        return NextResponse.json({ sessions });
    } catch (error: any) {
        console.error("Chat GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const userPayload = await getUserFromRequest(req);
        if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = userPayload.userId;

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const result = await ChatSession.deleteOne({ _id: sessionId, userId });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Session deleted' });
    } catch (error: any) {
        console.error("Chat DELETE Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
