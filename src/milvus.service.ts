import { Injectable } from "@nestjs/common";
import {
  DataType,
  FunctionType,
  IndexType,
  MilvusClient,
  MutationResult,
  QueryResults,
  SearchReq,
  SearchResults,
  ShowCollectionsResponse,
} from "@zilliz/milvus2-sdk-node";
import { Err, Ok, Result } from "ts-results";
import { EmbeddingsService } from "./embeddings.service";

export type DbDoc = {
  text: string;
  link: string;
  text_dense: number[];
  published: number;
};

@Injectable()
export class MilvusService {
  client: MilvusClient;

  constructor(private readonly embeddingService: EmbeddingsService) {
    this.client = new MilvusClient({
      address: "localhost:19530",
    });
  }

  private async _createCollection(
    collection: string = "meneame",
  ): Promise<Result<{ created: boolean }, Error>> {
    const fields = [
      {
        name: "link",
        data_type: DataType.VarChar,
        is_primary_key: true,
        autoID: false,
        max_length: 512,
      },
      {
        name: "published",
        data_type: DataType.Int32,
      },
      {
        name: "text_dense",
        data_type: DataType.FloatVector,
        dim: 1024,
      },
      {
        name: "text_sparse",
        data_type: DataType.SparseFloatVector,
      },
      {
        name: "text",
        data_type: DataType.VarChar,
        max_length: 4096,
        enable_match: true,
        enable_analyzer: true,
      },
    ];

    const functions = [
      {
        name: "text_bm25_emb",
        description: "text bm25 function",
        type: FunctionType.BM25,
        input_field_names: ["text"],
        output_field_names: ["text_sparse"],
        params: {},
      },
    ];

    const index_params = [{
      field_name: "text_dense",
      index_name: "text_dense_index",
      index_type: "AUTOINDEX",
      metric_type: "L2",
    }, {
      field_name: "text_sparse",
      index_name: "text_sparse_index",
      index_type: IndexType.SPARSE_INVERTED_INDEX,
      metric_type: "BM25",
      params: {
        inverted_index_algo: "DAAT_MAXSCORE",
      },
    }];

    try {
      await this.client.createCollection({
        collection_name: collection,
        fields: fields,
        index_params: index_params,
        functions,
      });

      return Ok({
        created: true,
      });
    } catch (err) {
      return Err(err);
    }
  }

  async createCollection(
    collection: string = "meneame",
    recreate: boolean = false,
  ): Promise<Result<{ created: boolean }, Error>> {
    const { collection_names } = await this.client.listCollections() as {
      collection_names: Array<string>;
    } & ShowCollectionsResponse;

    if (collection_names.includes(collection)) {
      if (!recreate) {
        return Ok({
          created: false,
        });
      }

      await this.client.drop_collection({
        collection_name: collection,
      });
    }

    return this._createCollection(collection);
  }

  async insertBatch(
    docs: DbDoc[],
    collection: string = "meneame",
  ): Promise<Result<MutationResult, Error>> {
    try {
      return Ok(
        await this.client.insert({
          collection_name: collection,
          data: docs,
        }),
      );
    } catch (err) {
      return Err(err);
    }
  }
  async hybridSearch(
    query: string,
    text: string,
    collection: string = "meneame",
  ) {
    const embeddings = await this.embeddingService.getEmbeddings(text);

    if (embeddings.err)
        return embeddings;

    const search_param_1 = {
      "data": embeddings.val,
      "anns_field": "text_dense",
      "param": { "nprobe": 10 },
      "limit": 5,
    };

    const search_param_2 = {
      "data": query,
      "anns_field": "text_sparse",
      "limit": 5,
    };

    const rerank = {
      name: "rrf",
      description: "rrf rerank strategy",
      type: FunctionType.RERANK,
      input_field_names: [],
      params: {
        "reranker": "rrf",
        "k": 60,
      },
    };

    try {
      await this.client.loadCollection({
        collection_name: collection,
      });

      return Ok(
        await this.client.search({
          collection_name: collection,
          data: [search_param_1, search_param_2],
          limit: 5,
          rerank: rerank,
          output_fields: ["text", "link"],
        }),
      );
    } catch (err) {
      return Err(err as Error);
    }
  }

  async searchById(
    link: string,
    collection: string = "meneame",
  ): Promise<Result<QueryResults, Error>> {
    try {
      await this.client.loadCollection({
        collection_name: collection,
      });

      return Ok(
        await this.client.get({
          collection_name: collection,
          ids: [link],
          limit: 1,
          output_fields: ["link"],
        }),
      );
    } catch (err) {
      return Err(err as Error);
    }
  }
}
