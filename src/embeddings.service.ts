import { Injectable } from "@nestjs/common";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Err, Ok, Result } from "ts-results";

@Injectable()
export class EmbeddingsService {
  private embeddings: OllamaEmbeddings;
  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: process.env.OLLAMA_EMBEDDINGS,
      dimensions: 1024,
      baseUrl: process.env.OLLAMA_HOST
    });
  }
  async getEmbeddings(text: string): Promise<Result<number[], Error>> {
    try {
      return Ok(
        await this.embeddings.embedQuery(
          text,
        ),
      );
    } catch (err) {
      return Err(err as Error);
    }
  }
}
