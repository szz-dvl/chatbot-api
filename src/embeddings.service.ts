import { Injectable } from "@nestjs/common";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Err, Ok, Result } from "ts-results";

@Injectable()
export class EmbeddingsService {
  private embeddings: OllamaEmbeddings;
  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: "bge-m3",
      dimensions: 1024,
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
