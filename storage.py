import json
import os
import re
from pathlib import Path

from settings import DATA_DIR

_ID_RE = re.compile(r"^[0-9a-f]{8,32}$")
_ROOT = Path(DATA_DIR)


def _path(cid: str) -> Path:
    if not isinstance(cid, str) or not _ID_RE.fullmatch(cid):
        raise ValueError("bad character id")
    return _ROOT / f"{cid}.json"


def list_all() -> list[dict]:
    _ROOT.mkdir(parents=True, exist_ok=True)
    out = []
    for p in _ROOT.glob("*.json"):
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
            info = d.get("info", {})
            out.append({
                "id": p.stem,
                "name": info.get("name", ""),
                "race": info.get("race", ""),
                "cls": info.get("class", ""),
                "level": info.get("level", 1),
                "mtime": p.stat().st_mtime,
            })
        except (OSError, ValueError, AttributeError):
            continue
    out.sort(key=lambda x: x["mtime"], reverse=True)
    return out


def load(cid: str) -> str | None:
    p = _path(cid)
    return p.read_text(encoding="utf-8") if p.exists() else None


def save(cid: str, raw: str) -> bool:
    p = _path(cid)
    if not isinstance(json.loads(raw), dict):
        raise ValueError("character must be a JSON object")
    _ROOT.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(raw, encoding="utf-8")
    os.replace(tmp, p)  # атомарно: нет полуфайлов при падении
    return True


def delete(cid: str) -> bool:
    p = _path(cid)
    if p.exists():
        p.unlink()
    return True


_SETTINGS = _ROOT.parent / "settings.json"


def load_settings() -> dict:
    try:
        d = json.loads(_SETTINGS.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


def save_settings(raw: str) -> bool:
    if not isinstance(json.loads(raw), dict):
        raise ValueError("settings must be a JSON object")
    _SETTINGS.parent.mkdir(parents=True, exist_ok=True)
    tmp = _SETTINGS.with_suffix(".tmp")
    tmp.write_text(raw, encoding="utf-8")
    os.replace(tmp, _SETTINGS)
    return True
