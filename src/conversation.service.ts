import { Injectable } from "@nestjs/common";
import { Conversation, ConversationModel, Message } from "./conversation.model";
import { DateTime, Duration } from "luxon";

@Injectable()
export class ConversationService {
  private async _createConversation(session: string) {
    return await ConversationModel.create({
      session,
      created: new Date(),
      messages: [],
    });
  }

  async getOrCreateConversation(session: string) {
    const [conversation] = await ConversationModel.aggregate<Conversation>([
      {
        $match: {
          session,
        },
      },
      {
        $unwind: "$messages",
      },
      {
        $match: {
          $and: [
            { "messages.role": { $ne: "tool" } },
            { "messages.tool_call": { $exists: false } },
          ],
        },
      },
      {
        $group: {
          _id: "$session",
          messages: { $push: "$messages" },
        },
      },
    ], { __v: 0 });

    //const conversation = await ConversationModel.findOne({ session }, { _id: 0, __v: 0 })

    if (!conversation) {
      return await this._createConversation(session);
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
    }, { _id: 0, __v: 0 });

    if (conversation) {
      const candidate = conversation.messages.reverse()[1];

      if (candidate.role == "tool") {
        return JSON.parse(candidate.content);
      }
    }

    return {
      context: [],
    };
  }

  async deleteOld() {
    return await ConversationModel.deleteMany({
      created: {
        $gt: DateTime.now().minus(Duration.fromObject({ days: 3 })).toJSDate(),
      },
    }, { _id: 0, __v: 0 });
  }
}
