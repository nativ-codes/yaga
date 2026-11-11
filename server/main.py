"""HTTP front for agent.py.

POST /api/chat     {thread, message} -> {reply, moderated, booking}
POST /api/bookings {thread, item, option, persons, name, address, social} -> {status, reference}
"""

import logging
import secrets

from fastapi import FastAPI, HTTPException
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel, Field

from agent import OFF_TOPIC, Agent

app = FastAPI()
agents: dict[str, Agent] = {}  # one Agent (and its history) per thread

THREAD = Field("default", pattern=r"^[\w-]{1,64}$")  # used as a file name in agent.py


def get_agent(thread: str) -> Agent:
    return agents.get(thread) or agents.setdefault(thread, Agent(thread_id=thread))


class ChatIn(BaseModel):
    thread: str = THREAD
    message: str = Field(min_length=1, max_length=4000)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/chat")
def chat(body: ChatIn) -> dict:
    # Plain def: FastAPI runs it in a thread pool, so a slow model call doesn't block other requests.
    # shortcut: two parallel requests on one thread can interleave its history; fine for one user per thread.
    agent = get_agent(body.thread)
    start = len(agent.messages)
    try:
        reply = agent.ask(body.message)
    except Exception:
        logging.exception("ask failed")
        raise HTTPException(502, "the model call failed")
    # If the model called open_booking_form this turn, hand its args to the UI to render the form.
    booking = next(
        (
            call["args"]
            for m in agent.messages[start:]
            if isinstance(m, AIMessage)
            for call in m.tool_calls
            if call["name"] == "open_booking_form"
        ),
        None,
    )
    # Off-topic: the model flags it, we strip the flag and tell the UI it was a moderation response.
    moderated = reply.lstrip().startswith(OFF_TOPIC)
    return {"reply": reply.replace(OFF_TOPIC, "").strip(), "moderated": moderated, "booking": booking}


class BookingIn(BaseModel):
    thread: str = THREAD
    item: str = Field(min_length=1, max_length=200)
    option: str = Field(min_length=1, max_length=50)
    persons: int = Field(ge=1, le=8)  # gatherings take 8, the course 6
    name: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=5, max_length=300)
    social: str = Field(min_length=2, max_length=200)


@app.post("/api/bookings")
def book(body: BookingIn) -> dict:
    # shortcut: simulated send, nothing is stored or emailed; wire a DB insert or email here.
    reference = "YAGA-" + secrets.token_hex(3).upper()
    print(f"[book ] {reference}: {body.item} / {body.option} / {body.persons} persons", flush=True)  # no personal data in logs
    # Tell the agent, so it can answer "did my booking go through?" in the same chat.
    get_agent(body.thread).messages.append(
        HumanMessage(f"(booking form sent, reference {reference}: {body.item}, {body.option}, {body.persons} persons)")
    )
    return {"status": "received", "reference": reference}
