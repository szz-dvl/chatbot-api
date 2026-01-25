import { Module } from "@nestjs/common";
import { MilvusService } from "./milvus.service";
import { EmbeddingsModule } from "./embeddings.module";
import { ImagesModule } from "./images.module";

@Module({
  imports: [EmbeddingsModule, ImagesModule],
  providers: [MilvusService],
  exports: [MilvusService],
})
export class MilvusModule {}
