import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Res,
  UseInterceptors,
} from "@nestjs/common";
import { ChatbotService } from "./chatbot.service";
import { NoFilesInterceptor } from "@nestjs/platform-express";
import { ConversationService } from "./conversation.service";
import { pipeline } from "node:stream/promises";
import type { Response } from "express";

class QuestionDto {
  question: string;
}

class ContextDto {
  session: string;
}

class ContextResponse {
  context: { link: string; text: string }[];
}

@Controller()
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post("/chatbot")
  @UseInterceptors(NoFilesInterceptor())
  async getAnswer(
    @Body() { question }: QuestionDto,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    const session = headers["x-chatbot-session"];
    if (!session) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "Missing session",
        },
        HttpStatus.FORBIDDEN,
        {
          cause: "Missing session",
        },
      );
    }

    const conversation = await this.conversationService.getOrCreateConversation(
      session,
    );
    const { stream, historic } = await this.chatbotService.converse(
      conversation,
      question,
    );

    if (stream) {
      let content = "";
      await pipeline(
        stream,
        async function* (source) {
          for await (const chunk of source) {
            if (!chunk.message.thinking) {
              // yield chunk.message.thinking;
              yield chunk.message.content;
              content += chunk.message.content;
            }
          }
        },
        res,
      );

      historic.push({
        role: "assistant",
        content,
      });
    } else {
      res.send(historic[historic.length - 1].content);
    }

    await this.conversationService.updateConversation(session, historic);
  }

  @Get("/context")
  async getLastContext(
    @Headers() headers: Record<string, string>,
  ): Promise<ContextResponse> {
    const session = headers["x-chatbot-session"];
    if (!session) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "Missing session",
        },
        HttpStatus.FORBIDDEN,
        {
          cause: "Missing session",
        },
      );
    }

    return await this.conversationService.getConversationContext(
      session,
    );
  }
}
