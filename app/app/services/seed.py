SEED_GAMES = [
    {
        "name": "Five Tribes",
        "min_players": 2,
        "max_players": 4,
        "scoring_spec": {
            "version": 1,
            "fields": [
                {"id": "coins", "label": "Coins", "type": "raw_score"},
                {
                    "id": "viziers",
                    "label": "Viziers",
                    "type": "raw_score",
                    "description": "Total vizier VP (10 per vizier + bonus)",
                },
                {"id": "elders", "label": "Elders", "type": "numeric", "multiplier": 2},
                {
                    "id": "djinns",
                    "label": "Djinns",
                    "type": "raw_score",
                    "description": "Sum of VP on owned Djinn cards",
                },
                {
                    "id": "merchandise",
                    "label": "Merchandise (sets)",
                    "type": "set_collection",
                    "set_values": [0, 1, 6, 15, 28, 45, 66, 91, 120],
                    "description": "Number of unique goods in largest set",
                },
                {"id": "palaces", "label": "Palace Tiles", "type": "numeric", "multiplier": 5},
                {"id": "oases", "label": "Oasis Tiles", "type": "numeric", "multiplier": 3},
            ],
        },
    },
    {
        "name": "Dominion",
        "min_players": 2,
        "max_players": 4,
        "scoring_spec": {
            "version": 1,
            "fields": [
                {
                    "id": "vp_cards",
                    "label": "Victory Point Cards",
                    "type": "enum_count",
                    "variants": [
                        {"id": "estates", "label": "Estates", "value": 1},
                        {"id": "duchies", "label": "Duchies", "value": 3},
                        {"id": "provinces", "label": "Provinces", "value": 6},
                        {"id": "curses", "label": "Curses", "value": -1},
                    ],
                },
                {
                    "id": "gardens",
                    "label": "Gardens",
                    "type": "numeric",
                    "multiplier": 1,
                    "description": "Pre-calculated Gardens VP (cards_in_deck / 10 per Garden)",
                },
                {"id": "vp_tokens", "label": "VP Tokens", "type": "raw_score"},
            ],
        },
    },
    {
        "name": "Catan",
        "min_players": 3,
        "max_players": 4,
        "scoring_spec": {
            "version": 1,
            "fields": [
                {"id": "settlements", "label": "Settlements", "type": "numeric", "multiplier": 1},
                {"id": "cities", "label": "Cities", "type": "numeric", "multiplier": 2},
                {"id": "vp_cards", "label": "Victory Point Cards", "type": "raw_score"},
                {"id": "longest_road", "label": "Longest Road", "type": "boolean", "value": 2},
                {"id": "largest_army", "label": "Largest Army", "type": "boolean", "value": 2},
            ],
        },
    },
    {
        "name": "War Chest",
        "min_players": 2,
        "max_players": 4,
        "scoring_spec": {
            "version": 1,
            "fields": [
                {
                    "id": "control_points",
                    "label": "Control Points",
                    "type": "raw_score",
                    "description": "Number of controlled locations",
                },
            ],
        },
    },
]
