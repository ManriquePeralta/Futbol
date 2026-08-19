#!/usr/bin/env python3

from __future__ import annotations

import json
import unicodedata
from pathlib import Path


INPUT = Path("data/players.json")
OUTPUT = Path("data/players-normalized.json")


def normalize_text(
    value: str | None,
) -> str | None:

    if not value:
        return None

    value = unicodedata.normalize(
        "NFC",
        value,
    )

    return " ".join(
        value.split()
    )


def main() -> int:

    with INPUT.open(
        "r",
        encoding="utf-8",
    ) as file:

        data = json.load(file)

    for player in data.get(
        "players",
        [],
    ):

        player["name"] = normalize_text(
            player.get("name")
        )

        player["position_label"] = (
            normalize_text(
                player.get(
                    "position_label"
                )
            )
        )

        team = player.get(
            "team"
        )

        if team:
            team["name"] = normalize_text(
                team.get("name")
            )

    data[
        "normalization"
    ] = {
        "unicode": "NFC",
        "whitespace": "collapsed",
        "source_data_preserved": True,
    }

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2,
        )

        file.write("\n")

    print(
        f"Generado: {OUTPUT}"
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )