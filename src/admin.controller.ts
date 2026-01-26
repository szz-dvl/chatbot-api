import {
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Param,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminFilter, AdminGuard } from "./admin.guard";
import { TimeoutInterceptor } from "./timeout.interceptor";

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
  @UseInterceptors(new TimeoutInterceptor())
  async indexPage(
    @Param() { page }: IndexDto,
  ) {
    const indexPageResult = await this.adminService.indexPage(page);

    if (indexPageResult.err) {
      throw new InternalServerErrorException();
    }

    return indexPageResult.val;
  }

  @Get("/recreate-index")
  async recreateIndex() {
    await this.adminService.recreateIndex();

    return true;
  }

  @Get("/index-many/:page")
  @UseInterceptors(new TimeoutInterceptor())
  async indexMany(
    @Param() { page }: IndexDto,
  ) {
    for (let p = 1; p <= page; p++) {
      const indexPageResult = await this.adminService.indexPage(p);

      if (indexPageResult.err) {
        throw new InternalServerErrorException();
      }

      if (indexPageResult.val.repeated.length && !indexPageResult.val.indexed.length) {
        return true
      }
    }

    return true
  }
}
