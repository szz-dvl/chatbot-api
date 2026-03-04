# MeneameBot

  Esto es un sistemna RAG (Retrieval augmented generation) para meneame.net.

## Instalación

  instalar nvidia-containe-toolkit:
    Arch:
      sudo pacman -Sy nvidia-container-toolkit
      sudo nvidia-ctk runtime configure --runtime=docker
      sudo systemctl restart docker
      ```docker compose up -d```
      docker exec ollama ollama pull qwen3:14b
      docker exec ollama ollama pull bge-m3:latest
      curl http://meneame.bot/recreate-index (Basic auth)
      docker exec meneamebot node scripts/index_many.js -s 1 -e 10
