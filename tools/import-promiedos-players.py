#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import time
import unicodedata
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://www.promiedos.com.ar"
LEAGUE_URL = f"{BASE_URL}/league/liga-profesional/hc/equipos"

DEFAULT_OUTPUT = Path("data/players.json")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/139.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    "Accept": (
        "text/html,application/xhtml+xml,"
        "application/xml;q=0.9,*/*;q=0.8"
    ),
}


# ---------------------------------------------------------------------------
# NORMALIZACIÓN
# ---------------------------------------------------------------------------

def clean_text(value: str | None) -> str | None:
    if value is None:
        return None

    value = re.sub(r"\s+", " ", value).strip()

    return value or None


def normalize_name(value: str | None) -> str | None:
    value = clean_text(value)

    if not value:
        return None

    return unicodedata.normalize("NFC", value)


def normalize_key(value: str | None) -> str:
    value = normalize_name(value) or ""

    value = unicodedata.normalize(
        "NFKD",
        value,
    )

    value = "".join(
        char
        for char in value
        if not unicodedata.combining(char)
    )

    return value.casefold()


# ---------------------------------------------------------------------------
# POSICIONES
# ---------------------------------------------------------------------------

POSITION_MAP = {
    "arquero": "GK",
    "portero": "GK",

    "defensa": "DF",
    "defensor": "DF",

    "mediocampista": "MF",
    "mediocampista central": "CM",
    "centrocampista": "MF",
    "centrocampista central": "CM",
    "centrocampista defensivo": "DM",
    "mediocampista defensivo": "DM",

    "mediocampista ofensivo": "AM",

    "volante": "MF",
    "volante izquierdo": "LM",
    "volante derecho": "RM",

    "delantero": "FW",
    "delantero izquierdo": "LW",
    "delantero derecho": "RW",

    "centro delantero": "ST",
    "centrodelantero": "ST",

    "defensa central": "CB",
    "lateral derecho": "RB",
    "lateral izquierdo": "LB",
}


def normalize_position(
    general: str | None,
    detail: str | None,
) -> tuple[str | None, str | None]:

    general = normalize_name(general)
    detail = normalize_name(detail)

    detail_key = normalize_key(detail)

    if detail_key in POSITION_MAP:
        detail_code = POSITION_MAP[detail_key]
    else:
        detail_code = None

    general_key = normalize_key(general)

    if general_key in POSITION_MAP:
        general_code = POSITION_MAP[general_key]
    else:
        general_code = None

    # Si tenemos detalle pero no general,
    # inferimos SOLO la categoría estructural de Promiedos.
    if detail_code:
        if detail_code in {"GK"}:
            general_code = "GK"
        elif detail_code in {
            "CB",
            "LB",
            "RB",
        }:
            general_code = "DF"
        elif detail_code in {
            "DM",
            "CM",
            "AM",
            "LM",
            "RM",
        }:
            general_code = "MF"
        elif detail_code in {
            "LW",
            "RW",
            "ST",
        }:
            general_code = "FW"

    return general_code, detail_code


# ---------------------------------------------------------------------------
# FECHAS
# ---------------------------------------------------------------------------

SPANISH_MONTHS = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}


def parse_birth_date(
    value: str | None,
) -> str | None:

    value = clean_text(value)

    if not value:
        return None

    # Promiedos actualmente utiliza DD/MM/YYYY.
    match = re.fullmatch(
        r"(\d{1,2})/(\d{1,2})/(\d{4})",
        value,
    )

    if match:
        day, month, year = map(
            int,
            match.groups(),
        )

        try:
            return date(
                year,
                month,
                day,
            ).isoformat()
        except ValueError:
            return None

    # También soportamos fechas ISO.
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError:
        pass

    return None


def calculate_age(
    birth_date: str | None,
) -> int | None:

    if not birth_date:
        return None

    try:
        born = date.fromisoformat(
            birth_date
        )
    except ValueError:
        return None

    today = date.today()

    age = today.year - born.year

    if (
        today.month,
        today.day,
    ) < (
        born.month,
        born.day,
    ):
        age -= 1

    if 0 <= age <= 100:
        return age

    return None


# ---------------------------------------------------------------------------
# ALTURA
# ---------------------------------------------------------------------------

def parse_height_cm(
    value: str | None,
) -> int | None:

    value = clean_text(value)

    if not value:
        return None

    # 1.87
    try:
        meters = float(
            value.replace(",", ".")
        )

        if 1.40 <= meters <= 2.30:
            return round(meters * 100)

    except ValueError:
        pass

    # 187
    try:
        centimeters = int(value)

        if 140 <= centimeters <= 230:
            return centimeters

    except ValueError:
        pass

    return None


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

class PromiedosError(RuntimeError):
    pass


def get_html(
    session: requests.Session,
    url: str,
    retries: int = 4,
) -> str:

    last_error = None

    for attempt in range(1, retries + 1):

        try:
            response = session.get(
                url,
                timeout=30,
            )

            response.raise_for_status()

            return response.text

        except requests.RequestException as exc:
            last_error = exc

            if attempt < retries:
                time.sleep(
                    min(
                        2 ** (attempt - 1),
                        8,
                    )
                )

    raise PromiedosError(
        f"No se pudo obtener {url}: "
        f"{last_error}"
    )


# ---------------------------------------------------------------------------
# EQUIPOS
# ---------------------------------------------------------------------------

def discover_teams(
    html: str,
) -> list[dict[str, str]]:

    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    teams = {}

    for link in soup.find_all(
        "a",
        href=True,
    ):

        href = link["href"]

        if "/team/" not in href:
            continue

        name = clean_text(
            link.get_text(
                " ",
                strip=True,
            )
        )

        if not name:
            continue

        url = urljoin(
            BASE_URL,
            href,
        )

        match = re.search(
            r"/team/([^/]+)/([^/?#]+)",
            url,
        )

        if not match:
            continue

        slug = match.group(1)
        team_code = match.group(2)

        key = url

        teams[key] = {
            "name": normalize_name(name),
            "slug": slug,
            "code": team_code,
            "url": url,
        }

    return list(
        teams.values()
    )


# ---------------------------------------------------------------------------
# PLANTEL
# ---------------------------------------------------------------------------

def parse_roster(
    html: str,
    team: dict[str, str],
) -> list[dict]:

    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    # Buscamos el encabezado PLANTEL.
    text = soup.get_text(
        "\n",
        strip=True,
    )

    marker = text.find("PLANTEL")

    if marker == -1:
        raise PromiedosError(
            f"No se encontró PLANTEL en "
            f"{team['url']}"
        )

    # ---------------------------------------------------------------
    # Estrategia principal:
    #
    # El HTML de Promiedos representa el plantel en filas/tablas.
    # Buscamos filas que contengan:
    #
    # número | nombre | posición | edad | nacimiento | altura
    # ---------------------------------------------------------------

    players = []

    # Primero intentamos tablas HTML.
    for table in soup.find_all("table"):

        rows = table.find_all("tr")

        for row in rows:

            cells = row.find_all(
                ["td", "th"]
            )

            if len(cells) < 4:
                continue

            values = [
                clean_text(
                    cell.get_text(
                        " ",
                        strip=True,
                    )
                )
                for cell in cells
            ]

            player = parse_roster_row(
                values,
                team,
            )

            if player:
                players.append(player)

    # ---------------------------------------------------------------
    # Fallback para el HTML actual:
    #
    # Promiedos puede renderizar el contenido como bloques/divs
    # en lugar de una table tradicional.
    # ---------------------------------------------------------------

    if not players:

        players = parse_roster_from_text(
            text,
            team,
        )

    # Deduplicación local.
    unique = {}

    for player in players:

        key = (
            player.get("source_id")
            or normalize_key(
                player.get("name")
            )
        )

        unique[key] = player

    return list(
        unique.values()
    )


def parse_roster_row(
    values: list[str | None],
    team: dict[str, str],
) -> dict | None:

    values = [
        value
        for value in values
        if value is not None
    ]

    if len(values) < 4:
        return None

    # Evitamos DT / Entrenador.
    joined = " ".join(
        values
    )

    if "Entrenador" in joined:
        return None

    # Buscamos una fecha DD/MM/YYYY.
    date_index = None
    birth_date = None

    for index, value in enumerate(values):

        parsed = parse_birth_date(
            value
        )

        if parsed:
            date_index = index
            birth_date = parsed
            break

    if date_index is None:
        return None

    # La altura normalmente está inmediatamente después
    # de nacimiento.
    height = None

    if date_index + 1 < len(values):
        height = parse_height_cm(
            values[date_index + 1]
        )

    # Edad suele estar antes de la fecha.
    age = None

    for value in values[
        max(0, date_index - 2):date_index
    ]:
        if value and value.isdigit():

            candidate = int(value)

            if 15 <= candidate <= 60:
                age = candidate
                break

    if age is None:
        age = calculate_age(
            birth_date
        )

    # Buscamos una posición conocida.
    detail = None
    general = None

    for value in values:

        key = normalize_key(
            value
        )

        if key in POSITION_MAP:
            if key in {
                "arquero",
                "portero",
                "defensa",
                "defensor",
                "mediocampista",
                "centrocampista",
                "volante",
                "delantero",
            }:
                general = value
            else:
                detail = value

    # El nombre está normalmente antes de posición.
    name = None

    for index, value in enumerate(values):

        if not value:
            continue

        key = normalize_key(value)

        if key in POSITION_MAP:
            if index > 0:
                candidate = values[index - 1]

                if candidate and not candidate.isdigit():
                    name = candidate

            break

    if not name:
        return None

    general_code, detail_code = (
        normalize_position(
            general,
            detail,
        )
    )

    return {
        "name": normalize_name(name),
        "age": age,
        "birth_date": birth_date,
        "height_cm": height,
        "position": general_code,
        "position_detail": detail_code,
        "position_label": normalize_name(
            detail or general
        ),
        "team": {
            "name": team["name"],
            "slug": team["slug"],
            "code": team["code"],
            "url": team["url"],
        },
        "source": "promiedos",
        "source_url": team["url"],
    }


def parse_roster_from_text(
    text: str,
    team: dict[str, str],
) -> list[dict]:

    lines = [
        clean_text(line)
        for line in text.splitlines()
    ]

    lines = [
        line
        for line in lines
        if line
    ]

    try:
        start = next(
            index
            for index, line in enumerate(lines)
            if line == "PLANTEL"
        )

    except StopIteration:
        return []

    players = []

    current_general = None

    for index in range(
        start + 1,
        len(lines),
    ):

        line = lines[index]

        if line in {
            "Arq",
            "Def",
            "Med",
            "Del",
        }:
            current_general = line
            continue

        # Fin aproximado del plantel.
        if line == "Apodo":
            break

        # Formato observado:
        #
        # 3
        # Marco Di Cesare
        # Defensa Central
        # 24
        # 30/01/2002
        # 1.86
        #
        # Por lo tanto buscamos una secuencia.

        if not re.fullmatch(
            r"\d{1,2}",
            line,
        ):
            continue

        if index + 4 >= len(lines):
            continue

        name = lines[index + 1]
        position = lines[index + 2]
        age_text = lines[index + 3]
        birth_text = lines[index + 4]

        height_text = (
            lines[index + 5]
            if index + 5 < len(lines)
            else None
        )

        if not re.fullmatch(
            r"\d{1,2}/\d{1,2}/\d{4}",
            birth_text or "",
        ):
            continue

        birth_date = parse_birth_date(
            birth_text
        )

        if not birth_date:
            continue

        try:
            age = int(age_text)

            if not 15 <= age <= 60:
                continue

        except (TypeError, ValueError):
            age = calculate_age(
                birth_date
            )

        height = parse_height_cm(
            height_text
        )

        general, detail = (
            normalize_position(
                current_general,
                position,
            )
        )

        players.append(
            {
                "name": normalize_name(name),
                "age": age,
                "birth_date": birth_date,
                "height_cm": height,
                "position": general,
                "position_detail": detail,
                "position_label": normalize_name(
                    position
                ),
                "team": {
                    "name": team["name"],
                    "slug": team["slug"],
                    "code": team["code"],
                    "url": team["url"],
                },
                "source": "promiedos",
                "source_url": team["url"],
            }
        )

    return players


# ---------------------------------------------------------------------------
# ID / DEDUP
# ---------------------------------------------------------------------------

def player_key(
    player: dict,
) -> str:

    birth_date = (
        player.get("birth_date")
        or ""
    )

    team = (
        player.get("team", {})
        .get("slug", "")
    )

    return (
        normalize_key(
            player.get("name")
        )
        + "|"
        + birth_date
        + "|"
        + team
    )


# ---------------------------------------------------------------------------
# IMPORT
# ---------------------------------------------------------------------------

def import_players(
    delay: float = 0.5,
) -> tuple[list[dict], dict]:

    session = requests.Session()
    session.headers.update(
        HEADERS
    )

    print()
    print(
        "Fuente:",
        LEAGUE_URL,
    )
    print()

    league_html = get_html(
        session,
        LEAGUE_URL,
    )

    teams = discover_teams(
        league_html
    )

    if not teams:
        raise PromiedosError(
            "No se encontraron equipos "
            "en la página de Liga Profesional."
        )

    print(
        f"Equipos encontrados: "
        f"{len(teams)}"
    )
    print()

    all_players = []

    failed_teams = []

    for index, team in enumerate(
        teams,
        start=1,
    ):

        print(
            f"[{index:02d}/{len(teams):02d}] "
            f"{team['name']}"
        )

        try:

            html = get_html(
                session,
                team["url"],
            )

            players = parse_roster(
                html,
                team,
            )

            print(
                f"    Jugadores: "
                f"{len(players)}"
            )

            all_players.extend(
                players
            )

        except Exception as exc:

            print(
                f"    ERROR: {exc}"
            )

            failed_teams.append(
                {
                    "team": team["name"],
                    "url": team["url"],
                    "error": str(exc),
                }
            )

        time.sleep(
            max(0, delay)
        )

    # ---------------------------------------------------------------
    # DEDUP GLOBAL
    # ---------------------------------------------------------------

    unique = {}
    duplicates = 0

    for player in all_players:

        key = player_key(
            player
        )

        if key in unique:
            duplicates += 1
            continue

        unique[key] = player

    players = list(
        unique.values()
    )

    players.sort(
        key=lambda player: (
            normalize_key(
                player.get("name")
            ),
            player.get("team", {})
            .get("name", ""),
        )
    )

    report = {
        "teams_found": len(teams),
        "teams_processed": (
            len(teams)
            - len(failed_teams)
        ),
        "teams_with_errors": len(
            failed_teams
        ),
        "players_found": len(
            all_players
        ),
        "players_unique": len(
            players
        ),
        "players_with_age": sum(
            1
            for p in players
            if p.get("age") is not None
        ),
        "players_with_birth_date": sum(
            1
            for p in players
            if p.get("birth_date")
        ),
        "players_with_height": sum(
            1
            for p in players
            if p.get("height_cm")
            is not None
        ),
        "players_with_position": sum(
            1
            for p in players
            if p.get("position")
        ),
        "players_with_position_detail": sum(
            1
            for p in players
            if p.get("position_detail")
        ),
        "preferred_foot": 0,
        "duplicates_removed": duplicates,
        "failed_teams": failed_teams,
    }

    return players, report


# ---------------------------------------------------------------------------
# GUARDAR
# ---------------------------------------------------------------------------

def save_players(
    players: list[dict],
    report: dict,
    output: Path,
) -> None:

    output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    document = {
        "source": "Promiedos",
        "league": {
            "name": "Liga Profesional Argentina",
            "url": LEAGUE_URL,
        },
        "generated_at": (
            datetime.now()
            .astimezone()
            .isoformat()
        ),
        "report": report,
        "players": players,
    }

    with output.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            document,
            file,
            ensure_ascii=False,
            indent=2,
        )

        file.write("\n")


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main() -> int:

    parser = argparse.ArgumentParser(
        description=(
            "Importa jugadores de la Liga "
            "Profesional desde Promiedos."
        )
    )

    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
    )

    args = parser.parse_args()

    try:

        players, report = (
            import_players(
                delay=max(
                    0,
                    args.delay,
                )
            )
        )

        save_players(
            players,
            report,
            args.output,
        )

        print()
        print(
            "===================================="
        )
        print(
            " REPORTE"
        )
        print(
            "===================================="
        )

        print(
            f"Jugadores encontrados: "
            f"{report['players_found']}"
        )

        print(
            f"Jugadores únicos:      "
            f"{report['players_unique']}"
        )

        print(
            f"Con edad:              "
            f"{report['players_with_age']}"
        )

        print(
            f"Con nacimiento:        "
            f"{report['players_with_birth_date']}"
        )

        print(
            f"Con altura:            "
            f"{report['players_with_height']}"
        )

        print(
            f"Con posición:          "
            f"{report['players_with_position']}"
        )

        print(
            f"Con posición detallada:"
            f" {report['players_with_position_detail']}"
        )

        print(
            f"Con pierna hábil:      "
            f"{report['preferred_foot']}"
        )

        print(
            f"Duplicados eliminados: "
            f"{report['duplicates_removed']}"
        )

        print()

        print(
            f"Guardado en: "
            f"{args.output.resolve()}"
        )

        if report["failed_teams"]:
            print()
            print(
                "Equipos con errores:"
            )

            for error in report[
                "failed_teams"
            ]:
                print(
                    f"- {error['team']}: "
                    f"{error['error']}"
                )

        return 0

    except KeyboardInterrupt:

        print(
            "\nCancelado."
        )

        return 130

    except Exception as exc:

        print(
            f"\nERROR: {exc}"
        )

        return 1


if __name__ == "__main__":
    raise SystemExit(
        main()
    )