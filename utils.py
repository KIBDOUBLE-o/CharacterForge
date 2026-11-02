import os
import secrets


def get_key() -> str:
    """Ключ бандла. secrets вместо random: random не криптостойкий."""
    if os.path.exists("key"):
        with open("key", "rb") as f:
            key = f.read().decode()
        if key:
            return key
    key = secrets.token_hex(16)
    with open("key", "wb") as f:
        f.write(key.encode())
    return key
