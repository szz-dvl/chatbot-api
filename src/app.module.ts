import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatbotModule } from './chatbot.module';
import { AdminModule } from './admin.module';
import { CronModule } from './cron.module';

@Module({
  imports: [AdminModule, ChatbotModule, CronModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
