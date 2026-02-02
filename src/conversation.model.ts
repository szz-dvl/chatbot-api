import { prop, getModelForClass, Ref, modelOptions, Severity } from '@typegoose/typegoose';

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

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Conversation {

    @prop({ required: true, unique: true })
    public session: string;

    @prop({ required: true })
    public created: Date;

    @prop({ required: true })
    public messages: Message[];

}

export const ConversationModel = getModelForClass(Conversation);
ConversationModel.on("index", (err) => {
    if (err)
        console.error(err);
});