import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { MilvusModule } from "./milvus.module";
import { ScrapperModule } from "./scrapper.module";
import { EmbeddingsModule } from "./embeddings.module";
import { ImagesModule } from "./images.module";

@Module({
  imports: [MilvusModule, ScrapperModule, EmbeddingsModule, ImagesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}