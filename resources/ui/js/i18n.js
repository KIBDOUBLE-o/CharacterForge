// Словари интерфейса и имён по умолчанию. Язык хранится в data/settings.json (через Python).
window.I18N = (() => {
  const D = {
    en: {
      characters: "Characters", new_char: "New character", import: "Import JSON", no_chars: "No characters yet. Create one or import a JSON file.",
      no_rc: "no race or class", lvl: "level", duplicate: "Duplicate", export: "Export", delete: "Delete", back: "Back", export_json: "Export JSON",
      add: "Add", cast: "Cast", roll: "Roll", damage: "Damage", heal: "Heal", cancel: "Cancel", loading: "Loading…", saving: "saving…", saved: "saved",
      "tab.sheet": "Sheet", "tab.spells": "Spells", "tab.inv": "Inventory", "tab.feat": "Features", "tab.notes": "Notes", "tab.cfg": "Setup",
      "ph.race": "Race", "ph.class": "Class", "ph.subclass": "Subclass", "ph.bg": "Background", "ph.align": "Alignment", level: "Level", xp: "XP",
      saves: "Saving throws", skills: "Skills", skills_hint: "Click the circle to cycle: none, half, proficient, expert", extra_bonus: "Extra bonus",
      hp: "Hit points", temp: "Temp", prof_bonus: "Proficiency bonus", resources: "Resources", no_res: "No resources yet. Add them in Setup.",
      attacks: "Attacks", no_atk: "No attacks yet.", dice: "Dice", custom: "Custom fields", name: "Name", to_hit: "To-hit formula", dmg_dice: "Damage dice", dmg_bonus: "Damage bonus formula",
      check_suffix: "{n} check", save_suffix: "{n} save", attack_suffix: "{n} attack", natural20: "natural 20", natural1: "natural 1",
      filter_ph: "Filter by name or school", add_spell: "Add spell", no_spells: "No spells yet.", lvl0: "Cantrips (level 0)", lvl_n: "Level {n}",
      cost: "Cost", add_cost: "Add cost", desc: "Description", prepared: "Prepared", delete_spell: "Delete spell", school: "School or tag", cast_time: "Casting time", free: "free",
      total_weight: "Total weight", add_item: "Add item", empty_inv: "Inventory is empty.", qty: "Qty", weight: "Weight", notes: "Notes",
      add_feature: "Add feature", no_feat: "No features yet.", source: "Source",
      formulas: "Formulas", mod_formula: "Modifier formula (uses score, level)", prof_formula: "Proficiency bonus (uses level)", maxhp_formula: "Max HP formula (empty = fixed value)", maxhp_static: "Fixed max HP",
      vars_hint: "Variables: level, prof, {vars}. Functions: floor ceil round min max abs pow sqrt. Operators: + - * / % ( ), comparisons, ?:. A stat sees only the stats above it. Renaming an id does not rewrite formulas.",
      abilities: "Abilities", stats: "Derived stats", resources_cfg: "Resources (mana, ki, rage, anything)", rests: "Rests and triggers", skills_cfg: "Skills", custom_cfg: "Custom fields",
      max_formula: "Max formula", static_max: "Fixed max", rest_rules: "Rest rules", on_rest: "On {name}", rest_hint: "max refills, +formula (or a bare formula) adds, =formula sets, empty does nothing.",
      hp_rule: "HP rule", formula: "formula", empty: "Empty.", type_text: "Text", type_number: "Number", type_check: "Checkbox", label: "Label", color: "Color",
      move_up: "Move up", move_down: "Move down", remove: "Remove", formula_id: "Formula id",
      load_fail: "Could not load the character", broken_file: "Broken character file: {e}", res_missing: "Resource missing for {n}", not_enough: "Not enough {r}: {cur} of {need}",
      cast_done: "Cast {n}", rest_done: "{n} applied", rule_error: "Rest rule error: {e}", dice_fmt: "Use the form 2d6+3", bad_id: "Invalid or duplicate id",
      import_fail: "Import failed: {e}", imported: "Imported {n}", not_char: "not a character file", exported: "Saved to {path}",
      del_title: "Delete character", del_body: "“{n}” will be removed permanently.", unnamed: "Unnamed", lang: "Language",
      "d.char": "New character", "d.ability": "New", "d.stat": "Stat", "d.skill": "Skill", "d.resource": "Resource", "d.rest": "Rest", "d.spell": "New spell", "d.attack": "Attack", "d.item": "Item", "d.feature": "Feature", "d.field": "Field",
      "d.ab.str": "STR", "d.ab.dex": "DEX", "d.ab.con": "CON", "d.ab.int": "INT", "d.ab.wis": "WIS", "d.ab.cha": "CHA",
      "d.st.ac": "AC", "d.st.initiative": "Initiative", "d.st.speed": "Speed", "d.res.mana": "Mana", "d.rest.short": "Short rest", "d.rest.long": "Long rest",
      "d.sk.acrobatics": "Acrobatics", "d.sk.animal_handling": "Animal Handling", "d.sk.arcana": "Arcana", "d.sk.athletics": "Athletics", "d.sk.deception": "Deception", "d.sk.history": "History",
      "d.sk.insight": "Insight", "d.sk.intimidation": "Intimidation", "d.sk.investigation": "Investigation", "d.sk.medicine": "Medicine", "d.sk.nature": "Nature", "d.sk.perception": "Perception",
      "d.sk.performance": "Performance", "d.sk.persuasion": "Persuasion", "d.sk.religion": "Religion", "d.sk.sleight_of_hand": "Sleight of Hand", "d.sk.stealth": "Stealth", "d.sk.survival": "Survival",
    },
    ru: {
      characters: "Персонажи", new_char: "Новый персонаж", import: "Импорт JSON", no_chars: "Персонажей пока нет. Создайте нового или импортируйте JSON.",
      no_rc: "раса и класс не указаны", lvl: "уровень", duplicate: "Копия", export: "Экспорт", delete: "Удалить", back: "Назад", export_json: "Экспорт JSON",
      add: "Добавить", cast: "Сотворить", roll: "Бросить", damage: "Урон", heal: "Лечение", cancel: "Отмена", loading: "Загрузка…", saving: "сохранение…", saved: "сохранено",
      "tab.sheet": "Лист", "tab.spells": "Заклинания", "tab.inv": "Инвентарь", "tab.feat": "Умения", "tab.notes": "Заметки", "tab.cfg": "Настройка",
      "ph.race": "Раса", "ph.class": "Класс", "ph.subclass": "Подкласс", "ph.bg": "Предыстория", "ph.align": "Мировоззрение", level: "Уровень", xp: "Опыт",
      saves: "Спасброски", skills: "Навыки", skills_hint: "Клик по кружку переключает: нет, половина, владение, мастерство", extra_bonus: "Доп. бонус",
      hp: "Здоровье", temp: "Врем.", prof_bonus: "Бонус мастерства", resources: "Ресурсы", no_res: "Ресурсов пока нет. Добавьте их в разделе «Настройка».",
      attacks: "Атаки", no_atk: "Атак пока нет.", dice: "Кубики", custom: "Свои поля", name: "Название", to_hit: "Формула попадания", dmg_dice: "Кубики урона", dmg_bonus: "Формула бонуса урона",
      check_suffix: "{n}: проверка", save_suffix: "{n}: спасбросок", attack_suffix: "{n}: атака", natural20: "натуральная 20", natural1: "натуральная 1",
      filter_ph: "Поиск по названию или школе", add_spell: "Добавить заклинание", no_spells: "Заклинаний пока нет.", lvl0: "Заговоры (уровень 0)", lvl_n: "Уровень {n}",
      cost: "Стоимость", add_cost: "Добавить стоимость", desc: "Описание", prepared: "Подготовлено", delete_spell: "Удалить заклинание", school: "Школа или тег", cast_time: "Время сотворения", free: "бесплатно",
      total_weight: "Общий вес", add_item: "Добавить предмет", empty_inv: "Инвентарь пуст.", qty: "Кол-во", weight: "Вес", notes: "Заметки",
      add_feature: "Добавить умение", no_feat: "Умений пока нет.", source: "Источник",
      formulas: "Формулы", mod_formula: "Формула модификатора (score, level)", prof_formula: "Бонус мастерства (level)", maxhp_formula: "Формула макс. здоровья (пусто = фикс.)", maxhp_static: "Фиксированное макс. здоровье",
      vars_hint: "Переменные: level, prof, {vars}. Функции: floor ceil round min max abs pow sqrt. Операторы: + - * / % ( ), сравнения, ?:. Параметр видит только параметры выше себя. Смена id не переписывает формулы.",
      abilities: "Характеристики", stats: "Производные параметры", resources_cfg: "Ресурсы (мана, ки, ярость, что угодно)", rests: "Отдых и триггеры", skills_cfg: "Навыки", custom_cfg: "Свои поля",
      max_formula: "Формула максимума", static_max: "Фикс. максимум", rest_rules: "Правила отдыха", on_rest: "{name}", rest_hint: "max восполняет, +формула (или просто формула) добавляет, =формула задаёт, пусто — без изменений.",
      hp_rule: "Правило для здоровья", formula: "формула", empty: "Пусто.", type_text: "Текст", type_number: "Число", type_check: "Флажок", label: "Название", color: "Цвет",
      move_up: "Выше", move_down: "Ниже", remove: "Убрать", formula_id: "Идентификатор в формулах",
      load_fail: "Не удалось загрузить персонажа", broken_file: "Повреждённый файл персонажа: {e}", res_missing: "Нет ресурса для «{n}»", not_enough: "Не хватает «{r}»: {cur} из {need}",
      cast_done: "Сотворено: {n}", rest_done: "Применено: {n}", rule_error: "Ошибка в правиле отдыха: {e}", dice_fmt: "Формат: 2d6+3", bad_id: "Неверный или повторяющийся id",
      import_fail: "Ошибка импорта: {e}", imported: "Импортировано: {n}", not_char: "это не файл персонажа", exported: "Сохранено: {path}",
      del_title: "Удалить персонажа", del_body: "«{n}» будет удалён без возможности восстановления.", unnamed: "Без имени", lang: "Язык",
      "d.char": "Новый персонаж", "d.ability": "Новая", "d.stat": "Параметр", "d.skill": "Навык", "d.resource": "Ресурс", "d.rest": "Отдых", "d.spell": "Новое заклинание", "d.attack": "Атака", "d.item": "Предмет", "d.feature": "Умение", "d.field": "Поле",
      "d.ab.str": "СИЛ", "d.ab.dex": "ЛОВ", "d.ab.con": "ТЕЛ", "d.ab.int": "ИНТ", "d.ab.wis": "МДР", "d.ab.cha": "ХАР",
      "d.st.ac": "КД", "d.st.initiative": "Инициатива", "d.st.speed": "Скорость", "d.res.mana": "Мана", "d.rest.short": "Короткий отдых", "d.rest.long": "Длинный отдых",
      "d.sk.acrobatics": "Акробатика", "d.sk.animal_handling": "Уход за животными", "d.sk.arcana": "Магия", "d.sk.athletics": "Атлетика", "d.sk.deception": "Обман", "d.sk.history": "История",
      "d.sk.insight": "Проницательность", "d.sk.intimidation": "Запугивание", "d.sk.investigation": "Анализ", "d.sk.medicine": "Медицина", "d.sk.nature": "Природа", "d.sk.perception": "Восприятие",
      "d.sk.performance": "Выступление", "d.sk.persuasion": "Убеждение", "d.sk.religion": "Религия", "d.sk.sleight_of_hand": "Ловкость рук", "d.sk.stealth": "Скрытность", "d.sk.survival": "Выживание",
    },
  };
  let lang = String(navigator.language || "en").toLowerCase().startsWith("ru") ? "ru" : "en";
  const t = (k, v) => {
    let s = (D[lang] && D[lang][k]) ?? D.en[k] ?? k;
    if (v) for (const x of Object.keys(v)) s = s.split("{" + x + "}").join(v[x]);
    return s;
  };
  return { t, get lang() { return lang; }, set(l) { if (D[l]) lang = l; } };
})();
