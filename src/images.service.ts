import { Injectable } from "@nestjs/common";
import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
} from "@xenova/transformers";
import { Err, Ok, Result } from "ts-results";

@Injectable()
export class ImagesService {
  private modelId: string = "Xenova/clip-vit-base-patch32";
  private textEmbeddings;
  private imageEmbeddings;
  private processor;
  private tokenizer;

  constructor() {}

  private async _loadModels() {
    const options = {
      revision: "main", 
      quantized: false,
    };

    // Cargar procesador de imágenes y tokenizador de texto
    this.processor = await AutoProcessor.from_pretrained(this.modelId, options);
    this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId, options);

    // Cargar modelos de visión y texto
    this.imageEmbeddings = await CLIPVisionModelWithProjection.from_pretrained(
      this.modelId,
      {...options, cache_dir: './models_cache'}
    );

    this.textEmbeddings = await CLIPTextModelWithProjection.from_pretrained(
      this.modelId,
      options
    );
  }

  private async load() {
    if (!this.textEmbeddings) {
      await this._loadModels();
    }
  }

  async getQueryEmbeddings(text: string): Promise<Result<number[], Error>> {
    try {
      await this.load();

      // Tokenizar el texto
      const textInputs = await this.tokenizer([text], {
        padding: true,
        truncation: true,
      });

      // Generar embeddings
      const { text_embeds } = await this.textEmbeddings(textInputs);

      return Ok(text_embeds.tolist()[0]);
    } catch (err) {
      return Err(err as Error);
    }
  }

  async getDbEmbeddings(image: string): Promise<Result<number[], Error>> {
    try {
      await this.load();

      // Convertir a array si es un string único
      const images = await RawImage.read(image);

      // Procesar imágenes
      const imageInputs = await this.processor(images);

      // Generar embeddings
      const { image_embeds } = await this.imageEmbeddings(imageInputs);

      return Ok(image_embeds.tolist()[0]);
    } catch (err) {
      return Err(err as Error);
    }
  }
}
