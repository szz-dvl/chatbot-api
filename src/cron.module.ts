import { Module } from "@nestjs/common";
import { AdminModule } from "./admin.module";
import { CronService } from "./cron.service";
import { ConversationModule } from "./conversation.module";

@Module({
  imports: [AdminModule, ConversationModule],
  providers: [CronService],
  exports: [CronService]
})
export class CronModule {}