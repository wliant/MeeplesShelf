import pytest


async def _create_game(client, name="Test Game", scoring_spec=None):
    data = {"name": name, "min_players": 2, "max_players": 4}
    if scoring_spec:
        data["scoring_spec"] = scoring_spec
    resp = await client.post("/api/games", json=data)
    return resp.json()


async def _create_player(client, name):
    resp = await client.post("/api/players", json={"name": name})
    return resp.json()


@pytest.mark.asyncio
async def test_create_session(client):
    game = await _create_game(client)
    p1 = await _create_player(client, "Alice")
    resp = await client.post(
        "/api/sessions",
        json={
            "game_id": game["id"],
            "players": [{"player_id": p1["id"], "score_data": {}}],
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["game"]["name"] == "Test Game"
    assert len(data["players"]) == 1


@pytest.mark.asyncio
async def test_session_scoring_and_winner(client):
    spec = {
        "version": 1,
        "fields": [{"id": "pts", "label": "Points", "type": "raw_score"}],
    }
    game = await _create_game(client, scoring_spec=spec)
    p1 = await _create_player(client, "Alice")
    p2 = await _create_player(client, "Bob")
    resp = await client.post(
        "/api/sessions",
        json={
            "game_id": game["id"],
            "players": [
                {"player_id": p1["id"], "score_data": {"pts": 10}},
                {"player_id": p2["id"], "score_data": {"pts": 20}},
            ],
        },
    )
    data = resp.json()
    players = {p["player"]["name"]: p for p in data["players"]}
    assert players["Alice"]["total_score"] == 10
    assert players["Bob"]["total_score"] == 20
    assert players["Bob"]["winner"] is True
    assert players["Alice"]["winner"] is False


@pytest.mark.asyncio
async def test_cooperative_session(client):
    game = await _create_game(client)
    p1 = await _create_player(client, "Alice")
    resp = await client.post(
        "/api/sessions",
        json={
            "game_id": game["id"],
            "is_cooperative": True,
            "cooperative_result": "win",
            "players": [{"player_id": p1["id"], "score_data": {}}],
        },
    )
    data = resp.json()
    assert data["is_cooperative"] is True
    assert data["cooperative_result"] == "win"
    assert data["players"][0]["winner"] is False  # No individual winner in coop


@pytest.mark.asyncio
async def test_session_duration(client):
    game = await _create_game(client)
    p1 = await _create_player(client, "Alice")
    resp = await client.post(
        "/api/sessions",
        json={
            "game_id": game["id"],
            "duration_minutes": 90,
            "players": [{"player_id": p1["id"], "score_data": {}}],
        },
    )
    assert resp.json()["duration_minutes"] == 90


@pytest.mark.asyncio
async def test_update_session(client):
    game = await _create_game(client)
    p1 = await _create_player(client, "Alice")
    create = await client.post(
        "/api/sessions",
        json={
            "game_id": game["id"],
            "notes": "Original",
            "players": [{"player_id": p1["id"], "score_data": {}}],
        },
    )
    session_id = create.json()["id"]
    resp = await client.put(
        f"/api/sessions/{session_id}",
        json={
            "game_id": game["id"],
            "notes": "Updated",
            "players": [{"player_id": p1["id"], "score_data": {}}],
        },
    )
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Updated"


@pytest.mark.asyncio
async def test_delete_session(client):
    game = await _create_game(client)
    p1 = await _create_player(client, "Alice")
    create = await client.post(
        "/api/sessions",
        json={
            "game_id": game["id"],
            "players": [{"player_id": p1["id"], "score_data": {}}],
        },
    )
    session_id = create.json()["id"]
    resp = await client.delete(f"/api/sessions/{session_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_filter_sessions_by_game(client):
    g1 = await _create_game(client, "Game1")
    g2 = await _create_game(client, "Game2")
    p1 = await _create_player(client, "Alice")
    await client.post(
        "/api/sessions",
        json={"game_id": g1["id"], "players": [{"player_id": p1["id"]}]},
    )
    await client.post(
        "/api/sessions",
        json={"game_id": g2["id"], "players": [{"player_id": p1["id"]}]},
    )
    resp = await client.get("/api/sessions", params={"game_id": g1["id"]})
    assert len(resp.json()) == 1
