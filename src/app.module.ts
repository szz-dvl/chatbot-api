import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ChatbotModule } from "./chatbot.module";
import { AdminModule } from "./admin.module";
import { CronModule } from "./cron.module";
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from "path"

@Module({
  imports: [
    AdminModule,
    ChatbotModule,
    CronModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "client"),
    }),
  ],
  //controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
