import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from "dotenv";
import mongoose from "mongoose";

config();

async function bootstrap() {
  await mongoose.connect('mongodb://localhost:27017/', { dbName: 'meneame' });
  const app = await NestFactory.create(AppModule, { 
    bodyParser: true, 
    rawBody: true, 
    cors: true 
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
