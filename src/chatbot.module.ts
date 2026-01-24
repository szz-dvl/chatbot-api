import { Module } from "@nestjs/common";
import { ChatbotController } from "./chatbot.controller";
import { ChatbotService } from "./chatbot.service";
import { MilvusModule } from "./milvus.module";
import { ConversationModule } from "./conversation.module";

@Module({
  imports: [MilvusModule, ConversationModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
