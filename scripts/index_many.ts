import { Test, TestingModule } from "@nestjs/testing";
import { AdminService, IndexResult } from "../src/admin.service";
import { ScrapperModule } from "../src/scrapper.module";
import { MilvusModule } from "../src/milvus.module";
import { EmbeddingsModule } from "../src/embeddings.module";
import { ImagesModule } from "../src/images.module";
import { config } from "dotenv";
import getopts from "getopts";

config();

const { start_page, end_page } = getopts(process.argv.slice(2), {
  alias: {
    start_page: "s",
    end_page: "e",
  },
});

if (!end_page) {
    console.log("Missing end page.")
    process.exit(1);
}

(async () => {
  const app: TestingModule = await Test.createTestingModule({
    imports: [ScrapperModule, MilvusModule, EmbeddingsModule, ImagesModule],
    providers: [AdminService],
    exports: [AdminService],
  }).compile();

  const adminService = app.get<AdminService>(AdminService);
  const summary: IndexResult[] = [];

  for (let p = start_page || 1; p <= end_page; p++) {
    const indexPageResult = await adminService.indexPage(p);

    if (indexPageResult.err) {
      console.error(indexPageResult.val);
      process.exit(1);
    }

    summary.push(indexPageResult.val);

    if (p % 3 === 0) {
      console.log(`Indexed page ${p} => [
        indexed: ${
        summary.reduce((acum, current) => {
          return acum + current.indexed.length;
        }, 0)
      },
        errored: ${
        summary.reduce((acum, current) => {
          return acum + current.errored.length;
        }, 0)
      },
        repeated: ${
        summary.reduce((acum, current) => {
          return acum + current.repeated.length;
        }, 0)
      }
    ]`);
    }
  }

  console.log("\nErrored:");

  let page = 1;
  for (const { errored } of summary) {
    for (const link of errored) {
      console.log(`\tError link: ${link}, page: ${page}`);
    }
    page++;
  }
})();
