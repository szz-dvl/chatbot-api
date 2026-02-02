import { Logger, Injectable } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { CronJob } from "cron";
import { ConversationService } from "./conversation.service";

@Injectable()
export class CronService {
  
  private readonly jobs: CronJob[] = [];
  constructor(private readonly adminService: AdminService, private readonly conversationService: ConversationService) {
    //Every ten minutes at second 00
    this.jobs.push(new CronJob("0 */10 * * * *", this.getHead.bind(this), null, true, 'Europe/Madrid'));
    //Once a day at 00:00:00
    this.jobs.push(new CronJob("0 0 0 */1 * *", this.cleanConversations.bind(this), null, true, 'Europe/Madrid'));
  }

  async getHead() {
    let page = 1;
    let indexedLen;

    do {
      Logger.log(`Indexing page ${page} ...`);
      const indexResult = await this.adminService.indexPage(page);

      if (indexResult.err) {
        throw indexResult.val;
      }

      const { indexed } = indexResult.val;
      indexedLen = indexed.length;

      page ++
      
    } while (indexedLen > 0);
  }

  async cleanConversations() {
    const { deletedCount } = await this.conversationService.deleteOld()

    Logger.log(`Deleting ${deletedCount} old conversations ...`);
  }
}
