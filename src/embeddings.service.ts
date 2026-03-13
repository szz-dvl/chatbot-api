import { Injectable } from "@nestjs/common";
import { Err, Ok, Result } from "ts-results";
import { Ollama } from "ollama";

@Injectable()
export class EmbeddingsService {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ host: process.env.OLLAMA_HOST })
  }

  async getEmbeddings(text: string): Promise<Result<number[], Error>> {
    try {
      const { embeddings } = await this.ollama.embed({
        model: process.env.OLLAMA_EMBEDDINGS!,
        input: text
      })

      return Ok(
        embeddings[0]
      );
    } catch (err) {
      return Err(err as Error);
    }
  }
}
