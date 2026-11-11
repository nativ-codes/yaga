.PHONY: server web stop logs test deploy-prod

server:
	cd server && docker compose up -d --build

web:
	cd web && npm install && npm run dev

stop:
	cd server && docker compose down

logs:
	cd server && docker compose logs -f

test:
	cd server && uv run pytest -q

# On the VPS: needs the shared `web` docker network and server/.env with DEEPSEEK_API_KEY.
deploy-prod:
	cd server && docker compose -f compose.prod.yaml up -d --build
	cd web && docker compose -f compose.prod.yaml up -d --build
