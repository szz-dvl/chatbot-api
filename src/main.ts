import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from "dotenv";
import mongoose from "mongoose";

config();

async function bootstrap() {
  await mongoose.connect(process.env.MONGO_CONNECTION_STRING!, { dbName: process.env.MONGO_DB_NAME });
  const app = await NestFactory.create(AppModule, { 
    bodyParser: true, 
    rawBody: true, 
    cors: true 
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
