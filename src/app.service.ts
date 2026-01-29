import { Injectable } from '@nestjs/common';
import { CronService } from './cron.service';

@Injectable()
export class AppService {
  constructor(private readonly cronService: CronService) {}
  
  getHello(): string {
    return 'Hello World!';
  }
}
