import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: Date;
    thought_signature?: string;
    tool_call_id?: string;
    name?: string;
    tool_calls?: any[];
}

export interface IChatSession extends Document {
    userId: string;
    title: string;
    mode: 'finance' | 'general';
    messages: IMessage[];
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema({
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, required: false, default: "" },
    timestamp: { type: Date, default: Date.now },
    thought_signature: { type: String, required: false },
    tool_call_id: { type: String, required: false },
    name: { type: String, required: false },
    tool_calls: { type: Schema.Types.Mixed, required: false }
});

const ChatSessionSchema: Schema = new Schema(
    {
        userId: { type: String, required: true, index: true },
        title: { type: String, required: true },
        mode: { type: String, enum: ['finance', 'general'], default: 'general' },
        messages: [MessageSchema],
    },
    {
        timestamps: true,
    }
);

// Ensure that indexing is applied correctly
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });

const ChatSession: Model<IChatSession> = mongoose.models.ChatSession || mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);

export default ChatSession;
