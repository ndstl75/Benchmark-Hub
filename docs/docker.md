# Docker

PharmDrugBench runs on port **8447** locally and **7860** on [Hugging Face Spaces](https://huggingface.co/docs/hub/spaces-sdks-docker).

## Build

```bash
docker build -t pharmdrugbench .
```

## Run

```bash
docker run -p 8447:8447 -e PORT=8447 pharmdrugbench
```

App is available at http://localhost:8447.

Benchmark data is stored as JSONL files under `server/data/`. On first start, the app seeds those files from `server/data/benchmark.json` if they are missing.

## Docker Compose

```bash
docker compose up --build -d
```

App: http://localhost:8447.

To restart (rebuild and run):

```bash
docker compose down && docker compose up --build -d
```

## Hugging Face Spaces

Push this repo to a Docker Space (for example `yxslpts/Benchmark-Hub`). The image listens on port **7860**.

Optional Space secrets:

| Secret | Purpose |
| ------ | ------- |
| `ADMIN_API_TOKEN` | Enable admin/write API routes |
| `OPENAI_API_KEY` | Evaluate OpenAI models |
| `DATA_DIR` | Custom path for JSONL data files |

```bash
git remote add hf https://huggingface.co/spaces/yxslpts/Benchmark-Hub
git push hf main
```

Use a Hugging Face [access token](https://huggingface.co/settings/tokens) with write permissions when prompted for a password.

## Updating benchmark data

Edit `server/data/benchmark.json`, then reload into JSONL:

```bash
npm run db:reseed
```
