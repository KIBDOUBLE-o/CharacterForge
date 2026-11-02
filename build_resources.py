import json
import os

from wac.data_operator import DataOperator
from wac.interface.web_constructor import WebConstructor
from wac.resource.resources_bundle import ResourcesBundle

from utils import get_key

if __name__ == "__main__":
    bundle = ResourcesBundle(get_key())
    bundle.set_header({})
    bundle.create_category("interface")

    constructor = WebConstructor()
    constructor.include_index(DataOperator.read("resources/ui/index.html").decode())
    for item in sorted(os.listdir("resources/ui/css")):
        constructor.include_style(DataOperator.read(f"resources/ui/css/{item}").decode())
    for item in ["api", "i18n", "model", "app"]:  # порядок важен: глобальный скоуп
        constructor.include_script(DataOperator.read(f"resources/ui/js/{item}.js").decode())
    bundle.put("interface", "main", json.dumps(constructor.create_dump()).encode())

    bundle.save("resources.bundle")
