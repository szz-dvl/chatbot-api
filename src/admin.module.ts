import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { MilvusModule } from "./milvus.module";
import { ScrapperModule } from "./scrapper.module";
import { EmbeddingsModule } from "./embeddings.module";
import { ImagesModule } from "./images.module";

@Module({
  imports: [MilvusModule, ScrapperModule, EmbeddingsModule, ImagesModule],
  controllers: [],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule {}