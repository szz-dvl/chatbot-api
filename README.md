# MeneameBot

  Esto es un sistemna RAG (Retrieval augmented generation) para [meneame.net](https://meneame.net). La forma de interactuar con el sistema es a través de un chat bot, al que alimentaremos con los resultados de la búsqueda en una BBDD vectorial ([milvus](https://milvus.io/)) que almacenará las noticias publicadas en meneame.net. El sistema usa qwen3:14b (de Alibaba) cómo LLM para implementar el chatbot, [bge-m3](https://huggingface.co/BAAI/bge-m3) (de BAAI) para obtener embeddings de texto y [CLIP](https://openai.com/index/clip/) (de OpenAI) para obtener embeddings de las imágenes.

## Entorno

  Las siguientes variables de entorno deben definirse en un fichero .env:
  
  ```
    PORT=3000
    MILVUS_CONNECTION_STRING=milvus:19530
    MONGO_CONNECTION_STRING=mongodb://user:password@localhost:27017/
    MONGO_DB_NAME=meneame
    OLLAMA_HOST=http://ollama:11434
    OLLAMA_EMBEDDINGS=bge-m3
  ```

## Instalación

  Para ejecutar el servicio, hay que satisfacer unas dependencias antes, primero asegurarse de tener la suite de docker instalada, con eso, 
  instalar nvidia-container-toolkit (dejo las instrucciones para ArchLinux):

  ```
    sudo pacman -Sy nvidia-container-toolkit
  ```

  Configurar nvidia-container-toolkit para que use docker:

  ```
    sudo nvidia-ctk runtime configure --runtime=docker
    sudo systemctl restart docker
  ```
  
  Ahora deberiamos poder arrancar el sistema:

  ```
    docker compose up -d
  ```
  Nota: Para generar la cache de modelos de CLIP podeis usar ```npm run models:cache``

  Cuando este listo, instalamos los modelos necesitamos de ollama:

  ``` 
    docker exec ollama ollama pull qwen3:14b
    docker exec ollama ollama pull bge-m3:latest
  ```

  La máquina que aloje este aplicativo debe apuntar a meneame.bot. Con los modelos listos ejecutamos un par de scripts:

  ```
    docker exec meneamebot node scripts/recreate_index.js
  ```

   Este primero no logueará nada en la consola.

  ```
    docker exec meneamebot node scripts/index_many.js -s 1 -e 10
  ```

  Este segundo irá informando cada 3 páginas de ingesta. ¡¡Usad este script con cautela!! hará una petición a meneame para cáda página que importemos.

  Con esto listo ya podemos visitar http://meneame.bot.





  
