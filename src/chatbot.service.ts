import { Injectable } from "@nestjs/common";
import { MilvusService } from "./milvus.service";
import ollama from "ollama";
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
        name: "get_context";
        description:
          `
            Retrieve information from the database given a "keyword" parameter and the user "raw_input".
            You must use this function whenever you need to fetch present, real-time data on a particular subject.
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
        description: `Retrieve the latest entries from the database. You must use this function whenever you need to get a collection of recent news into your context."`;
        parameters: {};
      };
    },
    // {
    //   type: "function";
    //   function: {
    //     name: "answer_to_user";
    //     description: `Answer to the user". You must use this function whenever a response can be sent to the user.`;
    //     parameters: {
    //       type: "object";
    //       description: `Object containing the MANDATORY "content" parameter`;
    //       required: ["response"];
    //       items: ["response"];
    //       properties: {
    //         response: {
    //           type: "string";
    //           description: "Content of the answer to send to the user";
    //         };
    //       };
    //     };
    //   };
    // },
  ];
  private model = "qwen3"//"mistral-nemo:12b-instruct-2407-q5_K_M"; //"llama3.2:3b-instruct-q5_1";//"llama3.1:8b-instruct-q5_1"

  constructor(
    private readonly milvusService: MilvusService,
  ) {}

  private async getContext({ keyword, raw_input }: GetContextToolQuery) {
    
    const searchResult = await this.milvusService.hybridSearch(
      keyword,
      raw_input,
    );

    if (searchResult.err) {
      throw searchResult.val;
    }

    const relevant = searchResult.val.results as unknown as DbResult[];

    relevant.sort(({ published: pA }, { published: pB }) =>
      parseInt(pB) - parseInt(pA)
    );

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

    const response = await ollama.chat({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `
              You are an agent equipped with tools. Your task is to decide if there is a need for a tool call or not.
              Your tools give you access to a local database containing information on many topics like news, recipes, satires, sports, politics, etc. Use them as much as possible.

              To use a tool your message must contain one of the following structures it is imperative that your answers only contains valid JSON data:
              {
                tool_call: {
                  name: "get_context"
                  arguments: { keyword: $keyword, raw_input: $raw_input }
                  use_case: "You must use this function whenever you need to fetch present data on a particular topic (news, recipes, satires, sports, politics, etc). Always reinforce you answers with this function."
                }
              } or
              {
                tool_call: {
                  name: "get_latest_entries"
                  arguments: { }
                  use_case: "You must use this function whenever the user requests the latest news. Use this function regardless of previous context."
                }
              }

              Always answer in the same language the user asks. Try to grow your context as much as possible. Use the your tools as much as possible.

              If you need to answer the user, no need for a tool call, use the following structure:

              {
                tool_call: {
                  name: "answer_to_user"
                  arguments: { response: $response }
                }
              }
              
              Never answer you don't have information without fetching information first. 
              
              The current year is ${new Date().getFullYear()}
          `,
        },
        ...messages,
      ],
      tools: this.tools,
      think: true,
    });

    console.log(response);

    let tool_call;

    try {
      
      const { tool_call: tc } = JSON.parse(response.message.content.trim());
      tool_call = tc;

    } catch(err) {

      console.error(err);

      tool_call = {
        name: "answer_to_user",
        arguments: { response: response.message.content.trim() }
      }

    }

    let result: { context: DbResult[] } | null = null;

    switch (tool_call.name) {
      case "get_context":
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
        stream: await ollama.chat({
          model: this.model,
          messages: [
            {
              role: "system",
              content: `
                Your are a helpfull assistant tasked with chatting with a human user.
                You will receive context from tools as messages with the "tool" role. When a "tool" message is received you must elaborate an answer based in the context provided.
                Only use the context that is relevant to the user question. And try to use the context provided as much as possible. The context is you source of truth.
                If the context is not relevant at all, just say you don't have information.
                The current year is ${new Date().getFullYear()}

                Always answer in the same language the user asks.
              `,
            },
            ...messages,
          ],
          stream: true,
          think: true
        }),
        historic: messages.slice(initialLen),
      };
    }

    return { stream: null, historic: messages.slice(initialLen) };
  }
}
