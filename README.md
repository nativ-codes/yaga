# yaga

YAGA assistant: a chat UI (`web/`, Vite + React) and a Python backend (`server/`, FastAPI + DeepSeek) that answers
questions about YAGA yacht gatherings and the ISSA Inshore Skipper licensing course, and nothing else.

- What it knows: `server/knowledge.md` (cleaned up from the `sql.md` DB dump). Edit it and `make server` to apply.
- Off-topic messages get a moderation reply: the API returns `"moderated": true` and the UI shows it in amber.

## Run locally

```sh
cp server/.env.example server/.env   # put your DEEPSEEK_API_KEY in it
make server                          # backend in Docker on :8081
make web                             # frontend on http://localhost:5173 (proxies /api to :8081)
```

`make logs` shows the `[model]` / `[tool ]` trace, `make stop` stops the container, `make test` runs the tests.
`server/agent.py` still works as a CLI: `cd server && uv run python agent.py`.

## API

`POST /api/chat` `{"thread": "any-id", "message": "Cand e urmatorul curs?"}` → `{"reply": "...", "moderated": false}`
# yaga
