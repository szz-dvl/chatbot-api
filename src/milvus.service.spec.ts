import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { DbDoc, MilvusService } from "./milvus.service";
import { config } from "dotenv";
import { EmbeddingsModule } from "./embeddings.module";
import { ImagesModule } from "./images.module";
import {
  DataType,
  FieldType,
  FunctionType,
  IndexType,
  ShowCollectionsResponse,
} from "@zilliz/milvus2-sdk-node";

config();

describe("MilvusService", () => {
  let milvusService: MilvusService;

  afterEach(async () => {
    await milvusService.client.dropCollection({ collection_name: "test" });
  });

  afterAll(async () => {
    await milvusService.client.dropCollection({
      collection_name: "testUnexisting",
    });
  });

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [EmbeddingsModule, ImagesModule],
      providers: [MilvusService],
      exports: [MilvusService],
    }).compile();

    milvusService = app.get<MilvusService>(MilvusService);
    await milvusService.client.connectPromise;

    const fields = [
      {
        name: "link",
        data_type: DataType.VarChar,
        is_primary_key: true,
        autoID: false,
        max_length: 512,
      },
      {
        name: "image",
        data_type: DataType.VarChar,
        max_length: 512,
      },
      {
        name: "image_dense",
        data_type: DataType.FloatVector,
        dim: 512,
      },
      {
        name: "published",
        data_type: DataType.Int64,
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

    const index_params = [
      {
        field_name: "text_dense",
        index_name: "text_dense_index",
        index_type: "AUTOINDEX",
        metric_type: "L2",
      },
      {
        field_name: "image_dense",
        index_name: "image_dense_index",
        index_type: "AUTOINDEX",
        metric_type: "COSINE",
      },
      {
        field_name: "text_sparse",
        index_name: "text_sparse_index",
        index_type: IndexType.SPARSE_INVERTED_INDEX,
        metric_type: "BM25",
        params: {
          inverted_index_algo: "DAAT_MAXSCORE",
        },
      },
    ];

    await milvusService.client.createCollection({
      collection_name: "test",
      fields,
      functions,
      index_params,
    });

    await milvusService.client.insert({
      collection_name: "test",
      data: [
        {
          link: "Lion",
          image: "Lion",
          text: "Lion",
          text_dense: Array.from({ length: 1024 }, () => 0),
          image_dense: Array.from({ length: 512 }, () => 0),
          published: Date.now(),
        },
        {
          link: "Zebra",
          image: "Zebra",
          text: "Zebra",
          text_dense: Array.from({ length: 1024 }, () => 0),
          image_dense: Array.from({ length: 512 }, () => 0),
          published: Date.now(),
        },
        {
          link: "Giraffe",
          image: "Giraffe",
          text: "Giraffe",
          text_dense: Array.from({ length: 1024 }, () => 0),
          image_dense: Array.from({ length: 512 }, () => 0),
          published: new Date("12/12/2025 22:00"),
        },
      ],
    });
  });

  describe("root", () => {
    it("should return latest news", async () => {
      const response = await milvusService.listCollection();

      if (response.err) {
        throw response.val;
      }

      expect(response.val.data.length).toBeGreaterThan(0);
    });

    it("should NOT recreate an existing collection", async () => {
      const response = await milvusService.createCollection("test", false);

      if (response.err) {
        throw response.val;
      }

      expect(response.val.created).toBeFalsy();
    });

    it("should recreate an existing collection", async () => {
      const response = await milvusService.createCollection("test", true);

      if (response.err) {
        throw response.val;
      }

      expect(response.val.created).toBeTruthy();
    }, 10000);

    it("should create an unexisting collection", async () => {
      const response = await milvusService.createCollection(
        "testUnexisting",
        true,
      );

      if (response.err) {
        throw response.val;
      }

      expect(response.val.created).toBeTruthy();

      const { collection_names } = await milvusService.client
        .listCollections() as {
          collection_names: Array<string>;
        } & ShowCollectionsResponse;

      expect(collection_names).toContain(
        "testUnexisting",
      );
    }, 10000);

    it("should insert data into a collection", async () => {
      const response = await milvusService.insertBatch([
        {
          link: "Test",
          image: "Test",
          text: "Test",
          text_dense: Array.from({ length: 1024 }, () => 0),
          image_dense: Array.from({ length: 512 }, () => 0),
          published: Date.now(),
        },
        {
          link: "Test",
          image: "Test",
          text: "Test",
          text_dense: Array.from({ length: 1024 }, () => 0),
          image_dense: Array.from({ length: 512 }, () => 0),
          published: Date.now(),
        },
        {
          link: "Test",
          image: "Test",
          text: "Test",
          text_dense: Array.from({ length: 1024 }, () => 0),
          image_dense: Array.from({ length: 512 }, () => 0),
          published: Date.now(),
        },
      ], "test");

      if (response.err) {
        throw response.val;
      }

      expect(response.val.insert_cnt).toBe("3");
    });

    it("should perform an hybridSearch", async () => {
      /** Actually, we are only testing sparse text index here, embeddings will never match  */
      const response = await milvusService.hybridSearch("lion", "Lion", "test");

      if (response.err) {
        throw response.val;
      }

      expect(response.val.results[0].link).toBe("Lion");
    });

    it("should return occurrences for an unexistent document", async () => {
      /** This may seem conterintuitive, but thats the way vectorial DDBB works */

      const response = await milvusService.hybridSearch(
        "monkey",
        "Monkey",
        "test",
      );

      if (response.err) {
        throw response.val;
      }

      expect(response.val.results.map((r) => r.link)).toMatchInlineSnapshot(`
        [
          "Giraffe",
          "Lion",
          "Zebra",
        ]
      `);
    });

    it("should find a document given an ID", async () => {

      const response = await milvusService.searchById(
        "Lion",
        "test",
      );

      if (response.err) {
        throw response.val;
      }

      expect(response.val.data).toHaveLength(1);
    });

    it("should fail to find a document given an unexistent ID", async () => {

      const response = await milvusService.searchById(
        "Monkey",
        "test",
      );

      if (response.err) {
        throw response.val;
      }

      expect(response.val.data).toHaveLength(0);
    });

    it("should return the latest documents", async () => {

      const response = await milvusService.listCollection(
        12,
        "test",
      );

      if (response.err) {
        throw response.val;
      }

      expect(response.val.data).toHaveLength(2);
    });

  });
});
