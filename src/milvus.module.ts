import { Module } from "@nestjs/common";
import { MilvusService } from "./milvus.service";
import { EmbeddingsModule } from "./embeddings.module";

@Module({
  imports: [EmbeddingsModule],
  providers: [MilvusService],
  exports: [MilvusService],
})
export class MilvusModule {}
