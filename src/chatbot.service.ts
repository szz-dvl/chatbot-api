import { Injectable } from "@nestjs/common";
import { MilvusService } from "./milvus.service";
import { Ollama } from "ollama";
import { Conversation } from "./conversation.model";
import { inspect } from "node:util";

type GetContextToolQuery = {
  keyword: string;
  raw_input: string;
};

type DbResult = {
  link: string;
  text: string;
  image: string;
  published: string;
};

@Injectable()
export class ChatbotService {
  private tools: [
    {
      type: "function";
      function: {
        name: "get_information";
        description: `
            Retrieve information from the database given a "keyword" parameter and the user "raw_input".
            You must use this function whenever you need to fetch present, real-time data on a particular subject.
            Use this function as much as possible.
          `;
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
              description: "Original text provided by the user";
            };
          };
        };
      };
    },
    {
      type: "function";
      function: {
        name: "get_latest_entries";
        description: `
          Retrieve the latest entries from the database.
          You must use this tool whenever present information is needed.
        `;
        parameters: {};
      };
    },
  ];
  private model = "qwen3:14b";
  private ollama: Ollama

  constructor(
    private readonly milvusService: MilvusService,
  ) {
    this.ollama = new Ollama({ host: process.env.OLLAMA_HOST })
  }

  private async getContext({ keyword, raw_input }: GetContextToolQuery) {
    const searchResult = await this.milvusService.hybridSearch(
      keyword,
      raw_input.includes(keyword) ? raw_input : keyword,
    );

    if (searchResult.err) {
      throw searchResult.val;
    }

    const relevant = searchResult.val.results as unknown as DbResult[];

    return { context: relevant };
  }

  private async getLatestNews() {
    const queryResult = await this.milvusService.listCollection();

    if (queryResult.err) {
      throw queryResult.val;
    }

    queryResult.val.data.sort(({ published: pA }, { published: pB }) =>
      parseInt(pB) - parseInt(pA)
    );

    return { context: queryResult.val.data as DbResult[] };
  }

  async converse({ messages }: Conversation, question: string) {
    const initialLen = messages.length;

    messages.push({
      role: "user",
      content: question,
    });

    const response = await this.ollama.chat({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `
              You are a Retrieval-Augmented Generation (RAG) system equipped with tools. Your task is to decide to use a tool call or not. Do not expect the user to request a tool_call. You must help the user by using tool_calls.
              Your tools give you access to a local database containing information on many topics like news, recipes, satires, sports, politics, etc.
              
              To use a tool your answer must match one of the following JSON structures:
              {
                "tool_call": {
                  "name": "get_information"
                  "arguments": { "keyword": $keyword, "raw_input": $raw_input }
                  "use_case": "You must use this function whenever the user requests information about a particular topic (news, recipes, satires, sports, politics, etc). Use this function when there is not enough data in your context. Use this function as often as you can."
                }
              } or
              {
                "tool_call": {
                  "name": "get_latest_entries"
                  "arguments": { }
                  "use_case": "You must use this function whenever the user requests the latest news without any particular topic. Use this function regardless of previous context."
                }
              }
              
              Always use your tools, always validate your knowledge with the information in the local database. Don't worry about a making your context bigger.
              Never answer you don't have information, try to grow your context first. Never use a tool_call and answer at the same time. Prioritize tool calls.
              Never mention your tools to the user. Do not request permission to use your tools, use your tools as much as possible.

              The current year is ${new Date().getFullYear()}
              Always answer in the same language the user asks. 
          `,
        },
        ...messages,
      ],
      tools: this.tools,
      think: true,
      options: {
        temperature: 0.6,
        top_p: 0.95,
        repeat_penalty: 1,
        top_k: 20,
      },
    });

    let tool_call;

    try {
      const { tool_call: tc } = JSON.parse(response.message.content.trim());
      tool_call = tc;
    } catch (err) {
      tool_call = {
        name: "answer_to_user",
        arguments: { response: response.message.content.trim() },
      };
    }

    let result: { context: DbResult[] } | null = null;

    switch (tool_call.name) {
      case "get_information":
        {
          result = await this.getContext(tool_call.arguments);
        }
        break;
      case "get_latest_entries":
        {
          result = await this.getLatestNews();
        }
        break;
      case "answer_to_user":
        {
          messages.push({
            role: "assistant",
            content: tool_call.arguments.response,
          });
        }
        break;
      default:
        console.log("Unrecognized tool call: ", tool_call.name);
        break;
    }

    if (result) {
      messages.push.apply(messages, [
        {
          role: "assistant",
          content: "",
          tool_call,
        },
        {
          role: "tool",
          tool_name: tool_call.name,
          content: JSON.stringify(result),
        },
      ]);

      return {
        stream: await this.ollama.chat({
          model: this.model,
          messages: [
            {
              role: "system",
              content: `
                You are a Retrieval-Augmented Generation (RAG) system equipped with tools. Your task is to chat with a human.
                You will receive context from tools as messages with the "tool" role. When a "tool" message is received you must elaborate an answer based in the context provided.
                Only use the context that is relevant to the user question. The context is you source of truth. Never criticize your context.
                If the context is not relevant at all, just say you don't have information.
                The current year is ${new Date().getFullYear()}

                Always answer in the same language the user asks.
              `,
            },
            ...messages,
          ],
          stream: true,
          think: true,
          options: {
            temperature: 0.6,
            top_p: 0.95,
            repeat_penalty: 1,
            top_k: 20,
          },
        }),
        historic: messages.slice(initialLen),
      };
    }

    return { stream: null, historic: messages.slice(initialLen) };
  }
}
