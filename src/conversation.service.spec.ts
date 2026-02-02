import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { config } from "dotenv";
import { ConversationService } from "./conversation.service";
import mongoose from "mongoose";

config();

describe("ConversationService", () => {
  let conversationService: ConversationService;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_CONNECTION_STRING!, {
      dbName: process.env.MONGO_DB_NAME,
    });
  });

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [ConversationService],
      exports: [ConversationService],
    }).compile();

    conversationService = app.get<ConversationService>(ConversationService);
  });

  describe("root", () => {
    it("should return conversations without tool messages", async () => {
      const response = await conversationService.getOrCreateConversation(
        "c716788d-9366-4a69-8f7d-e185f11a9488",
      );
      expect(response.messages.filter(({ role, tool_call }) => role === "tool" || typeof tool_call !== "undefined"))
        .toHaveLength(0);
     });
  });
});
