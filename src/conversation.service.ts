import { Injectable } from "@nestjs/common";
import { ConversationModel, Message } from "./conversation.model";

@Injectable()
export class ConversationService {
  private async _createConversation(session: string) {
    return await ConversationModel.create({
      session,
      created: new Date(),
      messages: [
        {
          role: "system",
          content: `
                Your are a helpfull assistant tasked with chatting with a human user. 
                If you need information about some topic you must use the information retrieved from the local database by using the function "get_context".
                You use the function "get_context" by appending a toolCall in your response. Use it ONLY when the user requests information about some topic.
                ALWAYS provide the "keyword" extracted from the user input AND the "raw_input" to the "get_context" function, but DO NOT provide it in your final answers.
                When the tool answers you, by apending a "tool" message, elaborate your answer basing your conclusions in the context provided. Use ALL the relevant context to elaborate your answers. 
                NEVER ask for context twice. If the tool already answered you, elaborate an answer. 
                If the context is not relevant, just answer you don't have information.
                Try to avoid formatted output as much as possible. Use plain text when possible, otherwise you can use markdown.
                ALLWAYS answer in the same language the user asks.
      
                THIS IS THE START OF THE CONVERSATION.
              `,
        },
      ],
    });
  }

  async getOrCreateConversation(session: string) {
    const conversation = await ConversationModel.findOne({
      session,
    }, { _id: 0, __v: 0 });

    if (!conversation) {
      return this._createConversation(session);
    }
    return conversation;
  }

  async updateConversation(session: string, messages: Message[]) {
    await ConversationModel.updateOne({
      session,
    }, {
      $push: { messages: { $each: messages } },
    });
  }

  async getConversationContext(session: string) {
    const conversation = await ConversationModel.findOne({
      session,
    });

    if (conversation) {

      const candidate = conversation.messages.reverse()[1]

      if (candidate.role == "tool") {
        return JSON.parse(candidate.content)
      }

    }

    return {
      context: []
    }
  }
}
