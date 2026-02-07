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
    it("should scrap the first page of meneame.net", async () => {
      const result = await scrapperService.scrap(1);

      if (result.err) {
        throw result.val;
      }
      
      expect(result.val.length).toBe(25);
    });

    it("should parse a date (hace XX min)", async () => {
      const result = await scrapperService.parseDate("hace 55 min");

      expect(result.getTime()).not.toBeNaN()

    });

    it("should parse a date (dd/MM/yyyy HH:mm)", async () => {
      const result = await scrapperService.parseDate("12/01/2026 22:00");

      expect(result.getTime()).not.toBeNaN()
      
    });

    it("should parse a date (dd/MM HH:mm)", async () => {
      const result = await scrapperService.parseDate("12/01 22:00");

      expect(result.getTime()).not.toBeNaN()
      
    });

    it("should parse a date (HH:mm)", async () => {
      const result = await scrapperService.parseDate("22:00");

      expect(result.getTime()).not.toBeNaN()
      
    });

    it("should return an invalid date", async () => {
      const result = await scrapperService.parseDate("INVALID");

      expect(result.getTime()).toBeNaN()
      
    });

  });
});
