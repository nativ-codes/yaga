.PHONY: server web stop logs test

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
