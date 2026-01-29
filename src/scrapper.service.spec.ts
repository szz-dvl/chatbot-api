import { beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ScrapperService } from "./scrapper.service";

describe("ScrapperService", () => {
  let scrapperService: ScrapperService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [ScrapperService],
      exports: [ScrapperService],
    }).compile();

    scrapperService = app.get<ScrapperService>(ScrapperService);
  });

  describe("root", () => {
    it('should scrap meneame.net', async () => {
      const result = await scrapperService.scrap(1);

      if (result.err) {
        throw result.val 
      }

      expect(result.val.length).toBe(25);
    });
  });
});
