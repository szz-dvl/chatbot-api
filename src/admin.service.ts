import { Injectable } from "@nestjs/common";
import { DbDoc, MilvusService } from "./milvus.service";
import { ScrapperService } from "./scrapper.service";
import { Ok, Result } from "ts-results";
import { EmbeddingsService } from "./embeddings.service";
import { inspect } from "node:util";
type IndexResult = {
  indexed: string[];
  repeated: string[];
  errored: string[];
};

@Injectable()
export class AdminService {
  constructor(
    private readonly milvusService: MilvusService,
    private readonly scrapperService: ScrapperService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async indexPage(page: number): Promise<Result<IndexResult, Error>> {
    const result: IndexResult = {
      indexed: [],
      repeated: [],
      errored: [],
    };

    const summaryResult = await this.scrapperService.scrap(page);

    if (summaryResult.err) {
      return summaryResult;
    }

    const dbDocs: DbDoc[] = [];

    for (const scrapped of summaryResult.val) {
      const existsResult = await this.milvusService.searchById(scrapped.link!);

      if (existsResult.err) {
        result.errored.push(scrapped.link!);
        continue;
      }

      if (existsResult.val.data.length) {
        result.repeated.push(scrapped.link!);
        continue;
      }

      const text = scrapped.title + "\n\n" + scrapped.body;
      const embeddings = await this.embeddingsService.getEmbeddings(text);

      if (embeddings.err) {
        result.errored.push(scrapped.link!);
        continue;
      }

      dbDocs.push({
        text,
        text_dense: embeddings.val,
        link: scrapped.link!,
        published: scrapped.date!.getTime(),
      });

      result.indexed.push(scrapped.link!);
    }

    if (dbDocs.length) {
      const insertResult = await this.milvusService.insertBatch(dbDocs);
      if (insertResult.err) {
        return insertResult;
      }
    }

    return Ok(result);
  }
}
