import { Test, TestingModule } from "@nestjs/testing";
import { AdminService } from "../src/admin.service";
import { ScrapperModule } from "../src/scrapper.module";
import { MilvusModule } from "../src/milvus.module";
import { EmbeddingsModule } from "../src/embeddings.module";
import { ImagesModule } from "../src/images.module";
import { config } from "dotenv";

config();

(async () => {
  const app: TestingModule = await Test.createTestingModule({
    imports: [ScrapperModule, MilvusModule, EmbeddingsModule, ImagesModule],
    providers: [AdminService],
    exports: [AdminService],
  }).compile();

  const adminService = app.get<AdminService>(AdminService);
  const recreateIndexResult = await adminService.recreateIndex();

  if (recreateIndexResult.err) {
      process.exit(1)
  }

})();
