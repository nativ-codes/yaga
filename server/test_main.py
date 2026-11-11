from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

import main
from agent import SYSTEM_PROMPT

FORM_ARGS = {"item": "Cyclades gathering, 29 May 2027", "options": ["Catamaran", "Monohull"], "max_persons": 7}


class FakeAgent:
    def __init__(self, thread_id):
        self.thread_id = thread_id
        self.messages = []

    def ask(self, question):
        if "book" in question:
            self.messages.append(AIMessage("", tool_calls=[{"name": "open_booking_form", "args": FORM_ARGS, "id": "c1"}]))
            return "Fill in the form below."
        return "[OFF_TOPIC] I can only help with YAGA." if "python" in question else f"{self.thread_id}: {question}"


def client(monkeypatch):
    monkeypatch.setattr(main, "Agent", FakeAgent)
    main.agents.clear()
    return TestClient(main.app)


def test_chat(monkeypatch):
    c = client(monkeypatch)
    assert c.post("/api/chat", json={"thread": "t1", "message": "hi"}).json() == {"reply": "t1: hi", "moderated": False, "booking": None}
    assert c.post("/api/chat", json={"thread": "t1", "message": "write python"}).json()["moderated"] is True
    assert c.post("/api/chat", json={"thread": "t1", "message": "I want to book"}).json()["booking"] == FORM_ARGS
    assert c.post("/api/chat", json={"thread": "t1", "message": "hi again"}).json()["booking"] is None  # only this turn's form
    assert c.post("/api/chat", json={"thread": "../etc", "message": "hi"}).status_code == 422
    assert c.post("/api/chat", json={"message": ""}).status_code == 422


def test_booking(monkeypatch):
    c = client(monkeypatch)
    good = {"thread": "t2", "item": FORM_ARGS["item"], "option": "Catamaran", "persons": 2,
            "name": "Ana Pop", "address": "Str. Lunga 1, Cluj", "social": "instagram.com/ana"}
    res = c.post("/api/bookings", json=good).json()
    assert res["status"] == "received" and res["reference"].startswith("YAGA-")
    assert res["reference"] in main.agents["t2"].messages[-1].content  # the agent hears about it
    assert c.post("/api/bookings", json={**good, "persons": 0}).status_code == 422
    assert c.post("/api/bookings", json={**good, "name": ""}).status_code == 422


def test_prompt_has_knowledge_but_no_customer_data():
    assert "ISSA Inshore Skipper" in SYSTEM_PROMPT and "Ibiza" in SYSTEM_PROMPT
    assert "@" not in SYSTEM_PROMPT  # no emails from user_profiles leak to the model
