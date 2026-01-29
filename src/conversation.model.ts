import { prop, getModelForClass, Ref } from '@typegoose/typegoose';

class ToolCall {
    @prop({ required: true })
    public name: string;

    @prop({ required: true })
    public arguments: { [key: string]: any; };
}

export class Message {
    @prop({ required: true })
    public role: string;

    @prop({ required: true })
    public content: string;

    @prop()
    public tool_name?: string;

    @prop()
    public tool_call?: ToolCall;
}

export class Conversation {

    @prop({ required: true })
    public session: string;

    @prop({ required: true })
    public created: Date;

    @prop({ required: true })
    public messages: Message[];

}

export const ConversationModel = getModelForClass(Conversation);