import pytest


@pytest.mark.asyncio
async def test_create_game(client):
    resp = await client.post(
        "/api/games",
        json={"name": "Test Game", "min_players": 2, "max_players": 4},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Game"
    assert data["min_players"] == 2
    assert data["collection_status"] == "owned"
    assert data["is_favorite"] is False


@pytest.mark.asyncio
async def test_list_games(client):
    await client.post("/api/games", json={"name": "A Game"})
    await client.post("/api/games", json={"name": "B Game"})
    resp = await client.get("/api/games")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["offset"] == 0
    assert data["limit"] == 20


@pytest.mark.asyncio
async def test_get_game(client):
    create = await client.post("/api/games", json={"name": "Detail Game"})
    game_id = create.json()["id"]
    resp = await client.get(f"/api/games/{game_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Detail Game"


@pytest.mark.asyncio
async def test_update_game(client):
    create = await client.post("/api/games", json={"name": "Old Name"})
    game_id = create.json()["id"]
    resp = await client.put(f"/api/games/{game_id}", json={"name": "New Name"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_game(client):
    create = await client.post("/api/games", json={"name": "To Delete"})
    game_id = create.json()["id"]
    resp = await client.delete(f"/api/games/{game_id}")
    assert resp.status_code == 204
    get_resp = await client.get(f"/api/games/{game_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_validation_empty_name(client):
    resp = await client.post("/api/games", json={"name": "  "})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_validation_max_lt_min(client):
    resp = await client.post(
        "/api/games", json={"name": "Bad", "min_players": 5, "max_players": 2}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_metadata_round_trip(client):
    resp = await client.post(
        "/api/games",
        json={
            "name": "Rich Game",
            "description": "A great game",
            "min_playtime": 30,
            "max_playtime": 60,
            "weight": 3.5,
            "year_published": 2020,
            "collection_status": "wishlist",
            "designer_names": ["Designer A"],
            "category_names": ["Strategy"],
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["description"] == "A great game"
    assert data["min_playtime"] == 30
    assert data["weight"] == 3.5
    assert data["collection_status"] == "wishlist"
    assert len(data["designers"]) == 1
    assert data["designers"][0]["name"] == "Designer A"
    assert len(data["categories"]) == 1


@pytest.mark.asyncio
async def test_collection_status_filter(client):
    await client.post(
        "/api/games",
        json={"name": "Owned Game", "collection_status": "owned"},
    )
    await client.post(
        "/api/games",
        json={"name": "Wishlist Game", "collection_status": "wishlist"},
    )
    resp = await client.get("/api/games", params={"collection_status": "wishlist"})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Wishlist Game"


@pytest.mark.asyncio
async def test_toggle_favorite(client):
    create = await client.post("/api/games", json={"name": "Fav Game"})
    game_id = create.json()["id"]
    resp = await client.patch(f"/api/games/{game_id}/favorite")
    assert resp.json()["is_favorite"] is True
    resp2 = await client.patch(f"/api/games/{game_id}/favorite")
    assert resp2.json()["is_favorite"] is False


@pytest.mark.asyncio
async def test_game_options(client):
    await client.post("/api/games", json={"name": "Option Game"})
    resp = await client.get("/api/games/options")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert "id" in data[0] and "name" in data[0]


@pytest.mark.asyncio
async def test_pagination(client):
    for i in range(5):
        await client.post("/api/games", json={"name": f"Game {i}"})
    resp = await client.get("/api/games", params={"offset": 0, "limit": 2})
    data = resp.json()
    assert data["total"] == 5
    assert len(data["items"]) == 2
    assert data["offset"] == 0
    assert data["limit"] == 2

    resp2 = await client.get("/api/games", params={"offset": 4, "limit": 2})
    data2 = resp2.json()
    assert data2["total"] == 5
    assert len(data2["items"]) == 1


@pytest.mark.asyncio
async def test_sort_by(client):
    await client.post("/api/games", json={"name": "Zebra", "min_players": 1})
    await client.post("/api/games", json={"name": "Alpha", "min_players": 5})
    resp = await client.get("/api/games", params={"sort_by": "name", "sort_dir": "desc"})
    items = resp.json()["items"]
    assert items[0]["name"] == "Zebra"
    assert items[1]["name"] == "Alpha"
