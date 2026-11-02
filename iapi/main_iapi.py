from wac.interface.interface_api import InterfaceApi

from settings import WINDOW_NAME


class MainIAPI(InterfaceApi):
    """Python -> JS. Каждый метод вызывает функцию в window (один аргумент-объект)."""

    def __init__(self):
        super().__init__(WINDOW_NAME)

    def notify(self, text: str):
        self.call("UI.toast", text)

    def notify_key(self, key: str, **params):
        """Тост по ключу словаря: перевод делает JS."""
        self.call("UI.toast", {"key": key, "vars": params})

    def push_settings(self, settings: dict):
        self.call("App.setSettings", {"settings": settings})

    def push_list(self, items: list):
        self.call("Chars.setList", {"items": items})

    def push_loaded(self, cid: str, raw: str | None, purpose: str):
        self.call("Chars.loaded", {"id": cid, "raw": raw, "purpose": purpose})
