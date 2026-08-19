import json
import re
import time
import shutil
import unicodedata
from pathlib import Path
from datetime import datetime

# curl_cffi suplanta el TLS handshake exacto de Chrome
from curl_cffi import requests


# ============================================================
# CONFIGURACIÓN
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = ROOT / "data" / "players.json"
OUTPUT_FILE = ROOT / "data" / "players.json"
BACKUP_FILE = ROOT / "data" / "players.before-nationality.json"

ESPN_TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/teams"
ESPN_ROSTER_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/teams/{team_id}/roster"

REQUEST_TIMEOUT = 25
REQUEST_DELAY = 0.25


# ============================================================
# HTTP (SESIÓN CON IMPERSONACIÓN REAL DE CHROME)
# ============================================================

SESSION = requests.Session(impersonate="chrome124")


def get_json(url):
    """
    Descarga JSON desde ESPN emulando un navegador real.
    """
    last_error = None

    for attempt in range(3):
        try:
            response = SESSION.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            last_error = exc
            print(f"  ERROR HTTP (intento {attempt + 1}/3): {exc}")
            if attempt < 2:
                time.sleep(2.0 * (attempt + 1))

    raise RuntimeError(
        f"No se pudo descargar: {url}\n"
        f"Último error: {last_error}"
    )


# ============================================================
# NORMALIZACIÓN
# ============================================================

def normalize_text(value):
    if value is None:
        return ""

    value = str(value).strip().upper()
    value = unicodedata.normalize("NFD", value)
    value = "".join(
        char for char in value
        if unicodedata.category(char) != "Mn"
    )
    value = value.replace("Ñ", "N")
    value = re.sub(r"[^A-Z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def normalize_date(value):
    if not value:
        return None

    value = str(value).strip()

    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return value

    if value.startswith(("19", "20", "21")) and "T" in value:
        return value[:10]

    return None


# ============================================================
# EXTRACCIÓN DE DATOS ESPN
# ============================================================

def extract_nationality(athlete):
    candidates = []

    for key in ("nationality", "country", "citizenship"):
        val = athlete.get(key)
        if val:
            candidates.append(val)

    birth_place = athlete.get("birthPlace")
    if isinstance(birth_place, dict):
        for key in ("country", "countryName", "name"):
            val = birth_place.get(key)
            if val:
                candidates.append(val)
    elif isinstance(birth_place, str):
        candidates.append(birth_place)

    citizenship = athlete.get("citizenship")
    if isinstance(citizenship, dict):
        for key in ("name", "displayName", "country"):
            val = citizenship.get(key)
            if val:
                candidates.append(val)

    for value in candidates:
        value = str(value).strip()
        if value and len(value) >= 2:
            return value

    return None


def extract_birth_date(athlete):
    for key in ("dateOfBirth", "birthDate", "birth_date"):
        value = athlete.get(key)
        if value:
            date = normalize_date(value)
            if date:
                return date
    return None


def extract_name(athlete):
    for key in ("displayName", "fullName", "name"):
        value = athlete.get(key)
        if value:
            return str(value).strip()

    first = athlete.get("firstName", "")
    last = athlete.get("lastName", "")
    return f"{first} {last}".strip()


# ============================================================
# BASE DE DATOS LOCAL
# ============================================================

def load_database():
    if not INPUT_FILE.exists():
        raise FileNotFoundError(f"No existe:\n{INPUT_FILE}")

    with INPUT_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, dict):
        raise ValueError("players.json debe ser un objeto JSON.")

    if not isinstance(data.get("players"), list):
        raise ValueError("players.json no contiene el array 'players'.")

    return data


# ============================================================
# OBTENCIÓN DE DATOS ESPN
# ============================================================

def get_teams():
    print("\nObteniendo equipos de ESPN...")
    data = get_json(ESPN_TEAMS_URL)
    teams = []

    try:
        raw_teams = data["sports"][0]["leagues"][0]["teams"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError("No se pudo encontrar la lista de equipos de ESPN.")

    for item in raw_teams:
        team = item.get("team", {})
        team_id = team.get("id")

        if not team_id:
            continue

        teams.append({
            "id": str(team_id),
            "name": team.get("displayName", ""),
            "slug": team.get("slug", "")
        })

    print(f"Equipos encontrados: {len(teams)}")
    return teams


def get_roster(team):
    url = ESPN_ROSTER_URL.format(team_id=team["id"])

    try:
        data = get_json(url)
    except Exception as exc:
        print(f"  No se pudo obtener roster de {team['name']}: {exc}")
        return []

    athletes = []
    raw = data.get("athletes", [])

    if isinstance(raw, list):
        for athlete in raw:
            if isinstance(athlete, dict):
                athletes.append(athlete)
    elif isinstance(raw, dict):
        for group in raw.values():
            if not isinstance(group, list):
                continue
            for athlete in group:
                if isinstance(athlete, dict):
                    athletes.append(athlete)

    return athletes


def build_espn_index(teams):
    print("\nDescargando rosters ESPN...\n")

    index = {}
    total_athletes = 0

    for number, team in enumerate(teams, start=1):
        print(f"[{number}/{len(teams)}] {team['name']}")
        athletes = get_roster(team)
        print(f"  Jugadores: {len(athletes)}")
        total_athletes += len(athletes)

        for athlete in athletes:
            name = extract_name(athlete)
            normalized_name = normalize_text(name)

            if not normalized_name:
                continue

            birth_date = extract_birth_date(athlete)
            nationality = extract_nationality(athlete)

            record = {
                "name": name,
                "name_normalized": normalized_name,
                "birth_date": birth_date,
                "nationality": nationality,
                "espn_id": athlete.get("id"),
                "team": team["name"],
            }

            index.setdefault(normalized_name, []).append(record)

        time.sleep(REQUEST_DELAY)

    print(f"\nJugadores ESPN procesados: {total_athletes}")
    print(f"Nombres únicos ESPN: {len(index)}")
    return index


# ============================================================
# MATCHING
# ============================================================

def find_match(player, espn_index):
    player_name = normalize_text(player.get("name"))

    if not player_name:
        return None, "none"

    candidates = espn_index.get(player_name, [])

    if not candidates:
        return None, "none"

    player_birth = normalize_date(player.get("birth_date"))
    if player_birth:
        same_birth = [
            c for c in candidates
            if c.get("birth_date") == player_birth
        ]

        if len(same_birth) == 1:
            return same_birth[0], "name+birthdate"
        if len(same_birth) > 1:
            return None, "ambiguous"

    if len(candidates) == 1:
        return candidates[0], "name"

    return None, "ambiguous"


# ============================================================
# PERSISTENCIA & BACKUP
# ============================================================

def create_backup():
    if BACKUP_FILE.exists():
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = ROOT / "data" / f"players.before-nationality.{timestamp}.json"
    else:
        backup = BACKUP_FILE

    shutil.copy2(INPUT_FILE, backup)
    print(f"\nBackup creado:\n{backup}")


def save_database(data):
    temp_file = OUTPUT_FILE.with_suffix(".tmp.json")

    with temp_file.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")

    temp_file.replace(OUTPUT_FILE)


# ============================================================
# MAIN
# ============================================================

def main():
    print("\n==============================================")
    print(" FUTBOLLE — ENRIQUECER NACIONALIDADES")
    print("==============================================")

    data = load_database()
    players = data["players"]
    print(f"\nJugadores en la base: {len(players)}")

    create_backup()

    teams = get_teams()
    espn_index = build_espn_index(teams)

    found = 0
    not_found = 0
    ambiguous = 0
    already_had = 0

    print("\nBuscando coincidencias...\n")

    for player in players:
        if player.get("nationality"):
            already_had += 1
            continue

        match, method = find_match(player, espn_index)

        if match:
            nationality = match.get("nationality")

            if nationality:
                player["nationality"] = nationality
                player["nationality_source"] = "espn"
                player["nationality_match"] = method

                if match.get("espn_id"):
                    player["espn_id"] = match["espn_id"]

                found += 1
                print(f"[OK] {player.get('name')} -> {nationality}")
            else:
                not_found += 1
        elif method == "ambiguous":
            ambiguous += 1
            print(f"[AMBIGUO] {player.get('name')}")
        else:
            not_found += 1

    for player in players:
        if "nationality" not in player:
            player["nationality"] = None

    report = data.setdefault("report", {})
    report["nationality_enrichment"] = {
        "source": "espn",
        "processed": len(players),
        "found": found,
        "already_had": already_had,
        "not_found": not_found,
        "ambiguous": ambiguous,
        "generated_at": datetime.now().isoformat(timespec="seconds")
    }

    save_database(data)

    print("\n==============================================")
    print(" RESULTADO")
    print("==============================================")
    print(f"Jugadores procesados:       {len(players)}")
    print(f"Nacionalidades nuevas:      {found}")
    print(f"Ya tenían nacionalidad:     {already_had}")
    print(f"Sin coincidencia:           {not_found}")
    print(f"Coincidencias ambiguas:     {ambiguous}")
    print(f"\nGuardado en:\n{OUTPUT_FILE}")
    print("\nNo se inventaron nacionalidades.")
    print("Las coincidencias dudosas quedaron sin modificar.")
    print("==============================================")


if __name__ == "__main__":
    main()