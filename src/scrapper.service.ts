import { Injectable } from "@nestjs/common";
import { launch } from "puppeteer";
import { Err, Ok, Result } from "ts-results";
import { DateTime } from "luxon";

export type ScrappedDoc = {
  title?: string | null;
  body?: string | null;
  link?: string | null;
  date?: Date | null;
  img?: string | null;
};

@Injectable()
export class ScrapperService {
  private parseDate(
    dateString: string,
    formats: string[] = ["dd/MM/yyyy HH:mm", "dd/MM HH:mm", "HH:mm"],
  ) {
    for (const format of formats) {
      const candidate = DateTime
        .fromFormat(dateString.trim(), format)
        .toJSDate();

      if (!isNaN(candidate.getTime())) {
        return candidate;
      }
    }

    return new Date("Invalid Date");
  }

  async scrap(
    pageNum: number = 1,
  ): Promise<Result<Array<ScrappedDoc>, Error>> {
    try {
      const summary: Array<ScrappedDoc> = [];
      const browser = await launch();
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);

      await page.goto(`https://www.meneame.net/?page=${pageNum}`);

      const articles = await page.$$(".news-summary");

      for (const article of articles) {
        const titleElem = await article.$("a.ga-event");
        const bodyElem = await article.$("div.news-content");
        const publishedElem = await article.$("div.news-submitted");
        const imageElem = await article.$("a.fancybox img");

        let title, body, link, date, img;

        if (imageElem) {
          await imageElem.scrollIntoView();
          await new Promise((resolve) => setTimeout(resolve, 100)); //Small delay for images to load

          img = await imageElem.evaluate((el) => el.getAttribute("src"));
        }

        if (titleElem) {
          const titleText = await article.$("h2 a.ga-event");
          if (titleText) {
            title = await titleText.evaluate((el) => el.textContent);

            if (title) {
              title = title.trim();
            }

            link = await titleText.evaluate((el) => el.getAttribute("href"));
          }
        }

        if (bodyElem) {
          const script = await bodyElem.$("script");
          if (script) {
            script.evaluate((el) => el.remove());
          }

          body = await bodyElem.evaluate((el) => el.textContent);

          if (body) {
            body = body.trim();
          }
        }

        if (publishedElem) {
          const spans = await publishedElem.$$("span.ts")
          const span = spans.at(0);

          if (span) {
            const content = await span.evaluate((el) => el.textContent);
            if (content) {
              date = this.parseDate(content);
            }
          }
        }

        summary.push({ title, body, link, date, img });
      }

      browser.close();

      return Ok(summary);
    } catch (err) {
      return Err(err as Error);
    }
  }
}
