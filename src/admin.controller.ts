import {
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Param,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminFilter, AdminGuard } from "./admin.guard";

type IndexDto = {
  page: number;
};

@Controller()
@UseGuards(AdminGuard)
@UseFilters(AdminFilter)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  @Get("/index/:page")
  async indexPage(
    @Param() { page }: IndexDto,
  ) {
    const indexPageResult = await this.adminService.indexPage(page);

    if (indexPageResult.err) {
      console.error(indexPageResult.val);
      throw new InternalServerErrorException();
    }

    return indexPageResult.val;
  }
}
