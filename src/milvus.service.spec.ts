
import { describe, beforeEach, it, expect } from "vitest";
import { Test, TestingModule } from '@nestjs/testing';
import { MilvusService } from './milvus.service';
import { config } from "dotenv";
import { EmbeddingsModule } from "./embeddings.module";
import { ImagesModule } from "./images.module";

config();

describe('MilvusService', () => {
  let milvusService: MilvusService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [EmbeddingsModule, ImagesModule],
      providers: [MilvusService],
      exports: [MilvusService]
    }).compile();

    milvusService = app.get<MilvusService>(MilvusService);
    await milvusService.client.connectPromise;

  });

  describe('root', () => {
    it('should return latest news', async () => {
      const response = await milvusService.listCollection();

      if (response.err) {
        throw response.val
      }

      expect(response.val.data.length).toBeGreaterThan(0);
    });
  });
});
