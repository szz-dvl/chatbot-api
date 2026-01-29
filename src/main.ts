import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { config } from "dotenv";
import mongoose from "mongoose";
import { Agent, setGlobalDispatcher } from "undici";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";

config();

const milvus = new MilvusClient({
  address: process.env.MILVUS_CONNECTION_STRING!,
});

async function bootstrap() {
  setGlobalDispatcher(
    new Agent({
      // connectTimeout and bodyTimeout could be set as well if they cause issues
      headersTimeout: 60 * 60_000, // 60 min header timeout
    }),
  );

  await milvus.connectPromise;
  await mongoose.connect(process.env.MONGO_CONNECTION_STRING!, {
    dbName: process.env.MONGO_DB_NAME,
  });
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
    cors: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
