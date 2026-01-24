import { Injectable } from "@nestjs/common";
import { MilvusService } from "./milvus.service";
import ollama from "ollama";
import { Conversation } from "./conversation.model";

type ToolQuery = {
  keyword: string;
  raw_input: string;
};

@Injectable()
export class ChatbotService {
  private tools: [
    {
      type: "function";
      function: {
        name: "get_context";
        description:
          `Retrieve information from the local database given a "keyword" parameter and the user "raw_input"`;
        parameters: {
          type: "object";
          description:
            `Object containing the MANDATORY "keyword" parameter and the MANDATORY "raw_input" parameter.`;
          required: ["keyword", "raw_input"];
          items: ["keyword", "raw_input"];
          properties: {
            keyword: {
              type: "string";
              description: "Text to query the database";
            };
            raw_input: {
              type: "string";
              description:
                "Original text provided by the user that originated the query text";
            };
          };
        };
      };
    },
  ];
  private model = "gpt-oss";

  constructor(
    private readonly milvusService: MilvusService,
  ) {}

  private async getContext({ keyword, raw_input }: ToolQuery) {
    // console.log("Tool", keyword, raw_input);
    const searchResult = await this.milvusService.hybridSearch(
      keyword,
      raw_input,
    );

    if (searchResult.err) {
      throw searchResult.val;
    }

    const relevant = searchResult.val.results.map(({ link, text }) => {
      return {
        link,
        text,
      };
    });

    return { context: relevant };
  }

  async converse({ messages }: Conversation, question: string) {
    const initialLen = messages.length;

    messages.push({
      role: "user",
      content: question,
    });

    const response = await ollama.chat({
      model: this.model,
      messages,
      tools: this.tools,
      think: true,
    });

    messages.push({
      role: "assistant",
      content: response.message.content,
    });

    if (response.message.tool_calls?.length) {
      // only recommended for models which only return a single tool call
      const call = response.message.tool_calls[0];
      const args = call.function.arguments as ToolQuery;
      const result = await this.getContext(args);

      // console.log("Context", result);
      // add the tool result to the messages
      messages.push({
        role: "tool",
        tool_name: call.function.name,
        content: JSON.stringify(result),
      });

      // generate the final response
      return {
        stream: await ollama.chat({
          model: this.model,
          messages,
          tools: this.tools,
          think: true,
          stream: true,
        }),
        historic: messages.slice(initialLen),
      };
    }

    return { stream: null, historic: messages.slice(initialLen) };
  }
}
