#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path


INPUT = Path("data/players.json")


VALID_POSITIONS = {
    "GK",
    "DF",
    "MF",
    "FW",
}


def main() -> int:

    if not INPUT.exists():
        print(
            f"No existe {INPUT}"
        )
        return 1

    with INPUT.open(
        "r",
        encoding="utf-8",
    ) as file:

        data = json.load(file)

    players = data.get(
        "players",
        [],
    )

    if not players:
        print(
            "ERROR: no hay jugadores."
        )
        return 1

    errors = []

    ids = []

    for index, player in enumerate(
        players
    ):

        player_id = player.get(
            "id"
        )

        name = player.get(
            "name"
        )

        if not name:
            errors.append(
                f"Jugador {index}: sin nombre"
            )

        if not player_id:
            errors.append(
                f"Jugador {index}: sin ID"
            )

        ids.append(
            player_id
        )

        age = player.get(
            "age"
        )

        if age is not None:
            if not 15 <= age <= 60:
                errors.append(
                    f"{name}: edad sospechosa "
                    f"{age}"
                )

        height = player.get(
            "height_cm"
        )

        if height is not None:
            if not 140 <= height <= 230:
                errors.append(
                    f"{name}: altura sospechosa "
                    f"{height}"
                )

        position = player.get(
            "position"
        )

        if position is not None:
            if position not in VALID_POSITIONS:
                errors.append(
                    f"{name}: posición "
                    f"desconocida {position}"
                )

    duplicate_ids = [
        player_id
        for player_id, count
        in Counter(ids).items()
        if player_id and count > 1
    ]

    if duplicate_ids:
        errors.append(
            f"IDs duplicados: "
            f"{duplicate_ids}"
        )

    print()
    print(
        "===================================="
    )
    print(
        " VALIDACIÓN PLAYERS.JSON"
    )
    print(
        "===================================="
    )

    print(
        f"Jugadores: {len(players)}"
    )

    print(
        f"Errores:   {len(errors)}"
    )

    print()

    if errors:

        for error in errors:
            print(
                f"[ERROR] {error}"
            )

        return 1

    # Estadísticas.
    teams = Counter(
        player.get(
            "team",
            {}
        ).get(
            "name"
        )
        for player in players
    )

    positions = Counter(
        player.get(
            "position"
        )
        for player in players
    )

    print(
        "Equipos:"
    )

    for team, count in sorted(
        teams.items(),
        key=lambda item: (
            str(item[0])
        ),
    ):
        print(
            f"  {team}: {count}"
        )

    print()
    print(
        "Posiciones:"
    )

    for position, count in sorted(
        positions.items()
    ):
        print(
            f"  {position}: {count}"
        )

    print()
    print(
        "OK: players.json válido."
    )

    return 0


if __name__ == "__main__":
    sys.exit(
        main()
    )