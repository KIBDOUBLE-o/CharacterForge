import json
import re
from pathlib import Path

import webview

import storage
from iapi.main_iapi import MainIAPI
from settings import WINDOW_NAME
from utils import get_key

from wac.interface.user_interface import UserInterface
from wac.interface.web_constructor import WebConstructor
from wac.interface.windows_manager import WindowsManager
from wac.resource.resources_bundle import ResourcesBundle


class App:
    def __init__(self):
        self.resources = ResourcesBundle.load_from("resources.bundle", get_key())
        self.ui = UserInterface(
            interface_api_interface=MainIAPI(),
            on_inited=self._on_inited,
            on_loaded=self._on_loaded,
        )
        self._register_api()
        self.ui.run()

    @property
    def interface(self) -> MainIAPI:
        return self.ui.interface

    def _register_api(self):
        reg = self.ui.register_api_function
        reg("close", lambda: WindowsManager.terminate_window(WINDOW_NAME))
        reg("minimize", lambda: WindowsManager.minimize_window(WINDOW_NAME))
        reg("maximize", lambda: WindowsManager.maximize_window(WINDOW_NAME))

        reg("load_settings", self._safe(self._load_settings))
        reg("save_settings", self._safe(self._save_settings))
        reg("list_characters", self._safe(self._list))
        reg("load_character", self._safe(self._load))
        reg("save_character", self._safe(self._save))
        reg("delete_character", self._safe(self._delete))
        reg("import_characters", self._safe(self._import))
        reg("export_character", self._safe(self._export))

    def _safe(self, fn):
        def wrapper(*args):
            try:
                return fn(*args)
            except Exception as e:  # ошибки показываем в UI, а не теряем в консоли
                self.interface.notify(f"{fn.__name__.strip('_')}: {e}")
        return wrapper

    def _load_settings(self):
        self.interface.push_settings(storage.load_settings())

    def _save_settings(self, raw: str):
        storage.save_settings(raw)

    def _list(self):
        self.interface.push_list(storage.list_all())

    def _load(self, cid: str, purpose: str = "open"):
        self.interface.push_loaded(cid, storage.load(cid), purpose)

    def _save(self, cid: str, raw: str, after: str = ""):
        storage.save(cid, raw)
        if after == "list":
            self._list()
        elif after == "open":
            self._load(cid, "open")

    def _delete(self, cid: str):
        storage.delete(cid)
        self._list()

    def _import(self, raws: list):
        for raw in raws:
            storage.save(json.loads(raw)["id"], raw)
        self._list()

    def _export(self, name: str, raw: str):
        json.loads(raw)  # валидируем до диалога
        safe = re.sub(r'[\\/:*?"<>|]+', "_", name or "").strip() or "character"
        mode = webview.FileDialog.SAVE if hasattr(webview, "FileDialog") else webview.SAVE_DIALOG
        res = webview.windows[0].create_file_dialog(
            mode, save_filename=f"{safe}.json", file_types=("JSON (*.json)",)
        )
        if not res:
            return
        path = res if isinstance(res, str) else res[0]
        Path(path).write_text(raw, encoding="utf-8")
        self.interface.notify_key("exported", path=str(path))

    def _on_inited(self):
        item = self.resources.take_decoded("interface", "main")
        interface = WebConstructor.load(json.loads(item.content))
        WindowsManager.create_window(
            name=WINDOW_NAME,
            constructor=interface,
            api=self.ui.api,
            frameless=True,
            width=1360,
            height=860,
        )

    def _on_loaded(self):
        pass


if __name__ == "__main__":
    App()
