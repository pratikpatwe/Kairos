import mongoose from 'mongoose';
import ChatSession from './models/ChatSession';
import connectDB from './lib/mongodb';

async function checkSession() {
    await connectDB();
    const session = await ChatSession.findOne().sort({ updatedAt: -1 });
    if (!session) {
        console.log("No session found");
        return;
    }
    console.log("Session Title:", session.title);
    console.log("Messages Count:", session.messages.length);
    session.messages.forEach((m, i) => {
        console.log(`\n--- Message ${i} (${m.role}) ---`);
        console.log(`Content: ${m.content?.substring(0, 100)}`);
        if (m.thought_signature) console.log(`Signature: ${m.thought_signature.substring(0, 20)}...`);
        if (m.tool_calls) console.log(`Tool Calls: ${JSON.stringify(m.tool_calls).substring(0, 100)}...`);
        if (m.tool_call_id) console.log(`Tool Call ID: ${m.tool_call_id}`);
    });
    process.exit(0);
}

checkSession();
