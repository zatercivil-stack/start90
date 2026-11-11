import {
  KEY,
  DEPARTMENTS,
  CATEGORIES,
  CHECKPOINTS,
  QUESTIONS,
  STATUS,
  today,
  addDays,
  dayNumber,
  dueDate,
  signals,
  createSeed,
  validateState,
  dispatch,
} from "./domain.js";
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  people:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m0 3h.01"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  flag: '<path d="M5 21V4m0 0c5-5 9 5 14 0v10c-5 5-9-5-14 0"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 9M3 3v7h7"/>',
  shield:
    '<path d="m12 3 8 4v6c0 5-8 8-8 8s-8-3-8-8V7z"/><path d="m8 12 3 3 5-6"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.flag}</svg>`;
const dateLabel = (d) =>
  new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(d));
const fullDate = (d) =>
  new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(d));
const stamp = (d) =>
  new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Minsk",
  }).format(new Date(d));
let state,
  storageError = "",
  loadFailed = false,
  role = "manager",
  page = "overview",
  selected = "employee-1",
  tab = "plan",
  query = "",
  dept = "",
  filter = "active",
  saveTime = "";
try {
  const raw = localStorage.getItem(KEY);
  state = raw ? validateState(JSON.parse(raw)) : createSeed();
  if (!raw) localStorage.setItem(KEY, JSON.stringify(state));
} catch (e) {
  state = createSeed();
  storageError =
    "Не удалось прочитать или сохранить данные. Исходная запись не изменена. Экспортируйте её или сбросьте демо, чтобы продолжить.";
  loadFailed = true;
}
const activeIssues = () => state.issues.filter((i) => i.status !== "resolved");
const employeeBy = (id) => state.employees.find((e) => e.id === id);
const initials = (name) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
const avatar = (e) =>
  `<span class="avatar tone-${DEPARTMENTS.indexOf(e.department)}" aria-hidden="true">${esc(initials(e.name))}</span>`;
const badge = (text, type = "neutral") =>
  `<span class="badge ${type}">${esc(text)}</span>`;
const action = (name, label, extra = "", cls = "button") =>
  `<button type="button" class="${cls}" data-action="${name}" ${extra}>${label}</button>`;
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 4500);
}
function commit(type, payload) {
  if (loadFailed)
    throw new Error(
      "Сохранение заблокировано: сначала экспортируйте повреждённые данные и сбросьте демо.",
    );
  const raw = localStorage.getItem(KEY);
  if (raw && JSON.parse(raw).revision !== state.revision)
    throw new Error(
      "Данные изменились в другой вкладке. Обновите страницу и повторите действие.",
    );
  const next = dispatch(state, { type, payload, role });
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error(
      "Не удалось сохранить изменения. Проверьте доступ к хранилищу браузера. Действие не применено.",
    );
  }
  state = next;
  saveTime = "Сохранено в этом браузере";
  storageError = "";
}
function shell() {
  const count = activeIssues().length;
  $("#app").innerHTML =
    `<aside class="sidebar"><a class="brand" href="#" data-action="navigate" data-page="overview"><img src="favicon.svg" alt="" width="38" height="38"><span>СТАРТ<span class="brand-number">/ 90</span><small>Рабочая адаптация</small></span></a><div class="workspace-label">НАВИГАЦИЯ</div><nav aria-label="Основная навигация">${nav("overview", "grid", "Обзор адаптации")}${nav("people", "people", "Новички", state.employees.length)}${nav("issues", "flag", "Запросы помощи", count)}</nav><div class="side-note"><span class="tiny-label">ПЕРВЫЕ 90 ДНЕЙ</span><p>Рабочий маршрут:<br>сигнал → действие → ответ.</p><div class="mini-path"><i></i><span></span><i></i><span></span><i></i></div></div><div class="sidebar-bottom">${action("help", icon("help") + " Как проверить демо", "", "nav-button")}<div class="org"><span class="org-mark">Т</span><div><b>ТГТ · демопространство</b><small>Все данные вымышлены</small></div></div></div></aside>
 <div class="workspace"><header class="topbar"><div class="breadcrumb">Рабочее пространство <span>/</span> <b>${page === "person" ? "Карточка новичка" : page === "people" ? "Новички" : page === "issues" ? "Запросы помощи" : "Обзор адаптации"}</b></div><div class="role-control"><span class="demo-dot"></span><label for="role">Демороль</label><select id="role" aria-label="Демонстрационная роль"><option value="manager" ${role === "manager" ? "selected" : ""}>Руководитель</option><option value="hr" ${role === "hr" ? "selected" : ""}>HR</option><option value="employee" ${role === "employee" ? "selected" : ""}>Новичок</option></select></div></header>
 <div class="demo-strip">${icon("shield")}<span>Демонстрация · роли переключаются без авторизации. Данные сохраняются только в этом браузере.</span>${action("help", "О демо", "", "text-button")}</div>
 ${storageError ? `<div class="error-banner" role="alert">${esc(storageError)} ${action("export", "Экспорт данных")} ${action("reset", "Сбросить демо")}</div>` : ""}
 <main id="main">${page === "person" ? personView() : page === "people" ? peopleView() : page === "issues" ? issuesView() : overview()}</main>
 <footer><span>Старт 90 <span class="separator">/</span> Сначала помощь, потом отметка</span><span>${saveTime || "Локальное сохранение"}</span></footer></div>`;
}
function nav(id, i, label, n) {
  return `<button class="nav-button ${page === id ? "active" : ""}" data-action="navigate" data-page="${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(i)}<span>${label}</span>${n != null ? `<span class="nav-count">${n}</span>` : ""}</button>`;
}
function heading(kicker, title, sub, button = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${sub}</p></div>${button}</div>`;
}
function overview() {
  const active = state.employees.filter(
    (e) => dayNumber(e) > 0 && dayNumber(e) <= 90,
  );
  const need = active.filter((e) => signals(state, e).length);
  const open = activeIssues();
  const overdue = open.filter(
    (i) => i.due < today() && i.status !== "confirmation",
  );
  const priority = [...open]
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);
  return `${heading("РАБОЧИЙ ЖУРНАЛ / 90 ДНЕЙ", "Кому нужна помощь сегодня", "Очередь конкретных препятствий и следующий шаг по каждому из них.", action("add", icon("plus") + " Добавить новичка", "", "button primary"))}
  <div class="journal-summary"><span>В РАБОТЕ СЕГОДНЯ</span><strong>${open.length} ${plural(open.length, "запрос", "запроса", "запросов")}</strong><span>${overdue.length ? `Просрочено: ${overdue.length}` : "Просроченных запросов нет"}</span><span>Нужна внимательность: ${need.length} ${plural(need.length, "новичок", "новичка", "новичков")}</span></div>
  <div class="journal-layout"><section class="section journal-queue"><div class="section-heading"><div><div class="eyebrow">01 / ОТВЕТИТЬ</div><h2>Открытые вопросы</h2><p>Ближайшие сроки ответа первыми</p></div>${action("navigate", "Вся очередь " + icon("arrow"), 'data-page="issues"', "text-button")}</div><div class="issue-list">${priority.length ? priority.map(issueRow).join("") : empty("Нет открытых запросов", "Проверьте контрольные точки в карточках новичков.")}</div></section><aside class="journal-note"><div class="note-index">02 / ПРОВЕРИТЬ</div><h2>Помощь считается оказанной, когда новичок это подтвердил.</h2><p>В очереди видны владелец, срок и история ответа. Если решение не сработало, вопрос возвращается в работу.</p>${action("navigate", "Открыть всех новичков " + icon("arrow"), 'data-page="people"', "text-button")}<div class="note-count"><b>${active.length}</b><span>человек проходят<br>первые 90 дней</span></div></aside></div>
  <section class="section journal-roster"><div class="section-heading"><div><div class="eyebrow">03 / СОПРОВОЖДАТЬ</div><h2>На маршруте</h2><p>Контрольные точки и наблюдаемые сигналы</p></div>${action("navigate", "Все новички " + icon("arrow"), 'data-page="people"', "text-button")}</div>${employeeTable(state.employees.slice(0, 5))}</section>`;
}
function plural(n, a, b, c) {
  return n % 10 === 1 && n % 100 !== 11
    ? a
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? b
      : c;
}
function empty(title, sub) {
  return `<div class="empty">${icon("check")}<h3>${title}</h3><p>${sub}</p></div>`;
}
function issueRow(i) {
  const e = employeeBy(i.employeeId);
  const overdue =
    i.due < today() && !["confirmation", "resolved"].includes(i.status);
  return `<button class="issue-row" data-action="issueDetail" data-id="${esc(i.id)}"><span class="issue-symbol ${overdue ? "late" : ""}">${icon(i.status === "confirmation" ? "check" : "flag")}</span><span class="issue-main"><strong>${esc(i.title)}</strong><small>${esc(e.name)} <span>·</span> ${esc(e.department)} <span>·</span> ${esc(i.owner)}</small></span><span class="issue-status">${badge(STATUS[i.status], i.status === "resolved" ? "green" : i.status === "confirmation" ? "blue" : i.status === "open" ? "amber" : "neutral")}<small class="${overdue ? "late-text" : ""}">${overdue ? "Просрочен · " : i.status === "resolved" ? "Срок был · " : "Срок · "}${dateLabel(i.due)}</small></span>${icon("arrow", "row-arrow")}</button>`;
}
function employeeTable(list) {
  if (!list.length)
    return empty(
      "Никого не нашли",
      "Попробуйте изменить имя или подразделение.",
    );
  return `<div class="table-wrap"><table><thead><tr><th>Новичок</th><th>Этап</th><th>План</th><th>Сейчас</th><th><span class="sr-only">Открыть</span></th></tr></thead><tbody>${list
    .map((e) => {
      const d = dayNumber(e),
        sg = signals(state, e),
        done = e.tasks.filter((t) => t.done).length;
      return `<tr><td><button class="person-link" data-action="person" data-id="${esc(e.id)}">${avatar(e)}<span><strong>${esc(e.name)}</strong><small>${esc(e.department)} · ${esc(e.position)}</small></span></button></td><td><b class="day">${d < 1 ? "До выхода" : d > 90 ? "После 90 дней" : `День ${d} <span>/ 90</span>`}</b><small class="cell-sub">с ${dateLabel(e.start)}</small></td><td><div class="progress-label">${done} из ${e.tasks.length}</div><div class="progress"><span style="width:${(done / e.tasks.length) * 100}%"></span></div></td><td>${d < 1 ? badge("Выход " + dateLabel(e.start)) : sg.length ? badge(sg[0].kind === "issue" ? "Есть запрос помощи" : sg[0].text, "amber") : badge("Нет открытых сигналов", "green")}</td><td>${action("person", icon("arrow"), `data-id="${esc(e.id)}" aria-label="Открыть: ${esc(e.name)}"`, "icon-button")}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}
function peopleView() {
  return `${heading("КОМАНДА / НОВИЧКИ", "Каждому — понятный старт", "План, контакт для помощи и обратная связь в одной карточке.", role !== "employee" ? action("add", icon("plus") + " Добавить новичка", "", "button primary") : "")}<div class="filters"><label class="search">${icon("search")}<input id="search" aria-label="Поиск новичка" placeholder="Найти по имени или должности" value="${esc(query)}"></label><label class="sr-only" for="department">Подразделение</label><select id="department"><option value="">Все подразделения</option>${DEPARTMENTS.map((d) => `<option ${dept === d ? "selected" : ""}>${d}</option>`).join("")}</select><span class="results-count" id="result-count"></span></div><div id="people-results">${filteredEmployees()}</div>`;
}
function filteredEmployees() {
  const list = state.employees.filter(
    (e) =>
      (!dept || e.department === dept) &&
      `${e.name} ${e.position}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return employeeTable(list);
}
function issuesView() {
  const list = state.issues
    .filter(
      (i) =>
        filter === "all" ||
        (filter === "active" && i.status !== "resolved") ||
        filter === i.status,
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  return `${heading("ОБРАТНАЯ СВЯЗЬ / ЗАПРОСЫ", "Помощь не должна теряться", "Один запрос — один ответственный. Решение подтверждает новичок.")}<div class="queue-notice">${icon("help")} Это общая демоочередь. Обращения к HR обрабатываются в роли HR. Конфиденциальность в демо не обеспечивается.</div><div class="filter-tabs" role="group" aria-label="Фильтр запросов">${[
    ["active", "Открытые"],
    ["open", "Новые"],
    ["working", "В работе"],
    ["confirmation", "На подтверждении"],
    ["resolved", "Решённые"],
    ["all", "Все"],
  ]
    .map(([v, t]) =>
      action(
        "filter",
        t,
        `data-value="${v}" aria-pressed="${filter === v}"`,
        filter === v ? "filter-tab selected" : "filter-tab",
      ),
    )
    .join(
      "",
    )}</div><section class="issue-list">${list.length ? list.map(issueRow).join("") : empty("Здесь пока нет запросов", "Выберите другой фильтр или отправьте запрос из карточки новичка.")}</section>`;
}
function personView() {
  const e = employeeBy(selected) || state.employees[0];
  selected = e.id;
  const d = dayNumber(e),
    sg = signals(state, e),
    issues = state.issues.filter((i) => i.employeeId === e.id),
    done = e.tasks.filter((t) => t.done).length;
  return `<div class="person-top">${action("navigate", icon("back") + " Все новички", 'data-page="people"', "text-button")}${role === "employee" ? `<label class="employee-picker">Я в демо <select id="employee-choice" aria-label="Выбрать новичка">${state.employees.map((x) => `<option value="${esc(x.id)}" ${x.id === e.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>` : badge("Карточка адаптации")}</div>
 <div class="profile-heading">${avatar(e)}<div><div class="eyebrow">${esc(e.department)} / ${esc(e.position)}</div><h1>${esc(e.name)}</h1><p>Выход ${fullDate(e.start)} <span>·</span> ${d < 1 ? "Ещё не вышел" : `День ${d} в команде`}</p></div>${role === "employee" ? action("newIssue", icon("plus") + " Нужна помощь", d < 1 ? "disabled" : "", "button primary") : action("switchEmployee", "Посмотреть глазами новичка " + icon("arrow"), "", "button")}</div>
 <div class="profile-layout"><div class="profile-main"><div class="tabs" role="group" aria-label="Раздел карточки">${[
   ["plan", "План адаптации"],
   ["checkins", "Проверки"],
   [
     "requests",
     `Запросы (${issues.filter((i) => i.status !== "resolved").length})`,
   ],
 ]
   .map(([v, t]) =>
     action(
       "tab",
       t,
       `data-value="${v}" aria-pressed="${tab === v}"`,
       tab === v ? "tab active" : "tab",
     ),
   )
   .join("")}</div>
 ${tab === "plan" ? `<section class="panel"><div class="section-heading"><div><h2>Первые шаги</h2><p>Шаблон для подразделения «${esc(e.department)}»</p></div><span class="muted">${done} / ${e.tasks.length}</span></div><div class="plan-progress"><span style="width:${(done / e.tasks.length) * 100}%"></span></div><div class="tasks">${e.tasks.map((t) => `<div class="task ${t.done ? "done" : ""}"><button class="task-check" data-action="task" data-id="${esc(t.id)}" aria-label="${t.done ? "Снять отметку" : "Выполнить"}: ${esc(t.title)}" aria-pressed="${t.done}" ${d < 1 || (role === "employee" && t.owner !== "Новичок") ? "disabled" : ""}>${t.done ? icon("check") : ""}</button><div><strong>${esc(t.title)}</strong><small>${esc(t.owner)} <span>·</span> День ${t.day} <span>·</span> до ${dateLabel(dueDate(e, t.day))}</small></div>${!t.done && dueDate(e, t.day) < today() && d > 0 ? badge("Просрочен", "amber") : t.done ? badge("Готово", "green") : ""}</div>`).join("")}</div><p class="panel-footnote">${role === "employee" ? "Вы отмечаете свои пункты. Остальные подтверждает руководитель или HR." : "В демо руководитель и HR могут подтвердить любой пункт после проверки."} Отметка в плане не закрывает запрос помощи.</p></section>` : tab === "checkins" ? checkinsView(e) : `<section class="issue-list">${issues.length ? issues.map(issueRow).join("") : empty("Пока нет обращений", "Если что-то мешает работе, сообщите об этом — не ждите следующей проверки.")}</section>`}
 </div><aside class="profile-aside"><section class="panel contact-card"><span class="eyebrow">РЯДОМ С НОВИЧКОМ</span><h3>Есть к кому обратиться</h3><div class="contact"><span class="contact-dot">Р</span><div><small>Руководитель</small><strong>${esc(e.manager)}</strong></div></div><div class="contact"><span class="contact-dot mentor">Н</span><div><small>Наставник</small><strong>${esc(e.mentor || "Не назначен")}</strong></div></div>${role !== "employee" ? action("mentor", e.mentor ? "Изменить наставника" : "Назначить наставника", "", "text-button") : ""}</section><section class="panel signal-card"><span class="eyebrow">СИГНАЛЫ, А НЕ ПРОГНОЗЫ</span><h3>На что обратить внимание</h3>${sg.length ? sg.map((s) => `<div class="signal"><span class="signal-dot"></span><div><b>${esc(s.text)}</b><small>${esc(s.action)}</small></div></div>`).join("") : '<p class="muted">Открытых сигналов нет. Продолжайте регулярные разговоры.</p>'}</section><div class="aside-hint">${icon("help")}<p>Сложно обсудить вопрос с руководителем? В форме запроса можно выбрать HR.</p></div></aside></div>`;
}
function checkinsView(e) {
  return `<section class="panel"><div class="section-heading"><div><h2>Как проходит адаптация?</h2><p>Три коротких вопроса и место для того, что мешает</p></div></div><div class="checkpoints">${CHECKPOINTS.map(
    (day) => {
      const c = state.checkins.find(
          (x) => x.employeeId === e.id && x.day === day,
        ),
        due = dueDate(e, day),
        future = due > today();
      return `<div class="checkpoint"><div class="checkpoint-day ${c ? "complete" : ""}">${c ? icon("check") : day}</div><div><h3>День ${day}</h3><p>${dateLabel(due)} · ${c ? "Ответы получены" : future ? "Проверка откроется позже" : due < today() ? "Проверка пропущена" : "Можно пройти сегодня"}</p>${c ? `<small>${c.answers.every(Boolean) && !c.note ? "По ответам препятствий нет" : "Сообщил о трудностях · создан запрос"}</small>` : ""}</div>${c ? action("viewCheck", "Ответы", `data-id="${esc(c.id)}"`, "text-button") : role === "employee" ? action("checkin", "Пройти", `data-day="${day}" ${future ? "disabled" : ""}`, "button small") : badge(future ? "Запланирована" : "Ждём новичка", future ? "neutral" : "amber")}</div>`;
    },
  ).join(
    "",
  )}</div>${role !== "employee" ? '<p class="panel-footnote">Проверку проходит сам новичок. Переключите демороль, чтобы проверить сценарий.</p>' : ""}</section>`;
}
function openModal(title, body, wide = false) {
  const m = $("#modal");
  m.className = wide ? "wide" : "";
  m.innerHTML = `<div class="modal-heading"><h2 id="modal-title">${title}</h2>${action("close", icon("close"), 'aria-label="Закрыть"', "icon-button")}</div>${body}`;
  m.showModal();
}
const formError = '<p class="form-error" role="alert"></p>';
const buttons = (label) =>
  `<div class="modal-actions">${action("close", "Отмена", "", "button")}<button class="button primary" type="submit">${label}</button></div>`;
const field = (
  label,
  name,
  value = "",
  type = "text",
  required = true,
  max = 80,
) =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} maxlength="${max}"></label>`;
const recipientField = `<label class="field">Кому передать<select name="recipient"><option value="manager">Моему руководителю</option><option value="hr">HR · команда адаптации</option></select><small>В демо все роли видят данные. Это не конфиденциальный канал.</small></label>`;
function newIssueModal() {
  openModal(
    "Что мешает работе?",
    `<p class="modal-intro">Опишите ситуацию и помощь, которая нужна. Запрос появится у ответственного.</p><form data-form="issue">${field("Короткая тема", "title", "", "text", true, 120)}<label class="field">Категория<select name="category">${CATEGORIES.map((c) => `<option>${c}</option>`).join("")}</select></label><label class="field">Что случилось и какая помощь нужна<textarea name="description" required maxlength="800" placeholder="Например: не могу войти в систему склада. Нужен доступ к ТСД."></textarea></label>${recipientField}${formError}${buttons("Отправить запрос")}</form>`,
  );
}
function checkinModal(day) {
  openModal(
    `Проверка · день ${day}`,
    `<p class="modal-intro">Здесь нет правильных ответов. Если нужна помощь, создадим запрос ответственному.</p><form data-form="checkin" data-day="${day}">${QUESTIONS.map((q, n) => `<fieldset class="question"><legend>${q}</legend><label><input type="radio" name="q${n}" value="yes" required> Да</label><label><input type="radio" name="q${n}" value="no" required> Нет, нужна помощь</label></fieldset>`).join("")}<label class="field">Есть ли что-то, что мешает?<textarea name="note" maxlength="600" placeholder="При ответе «Нет» расскажите, какая помощь нужна."></textarea><small>Комментарий обязателен, если хотя бы один ответ — «Нет».</small></label>${recipientField}${formError}${buttons("Отправить ответы")}</form>`,
  );
}
function issueModal(id) {
  const i = state.issues.find((x) => x.id === id),
    e = employeeBy(i.employeeId);
  const isEmployee = role === "employee",
    canStaff = !isEmployee && (i.recipient !== "hr" || role === "hr"),
    canConfirm =
      isEmployee && i.employeeId === selected && i.status === "confirmation";
  let controls = "";
  if (canStaff && ["open", "working"].includes(i.status))
    controls = `<form data-form="transition" data-id="${esc(i.id)}" data-status="${i.status === "open" ? "working" : "confirmation"}"><h3>${i.status === "open" ? "Взять ответственность" : "Что сделано для решения?"}</h3><div class="form-row">${field("Ответственный", "owner", i.owner)}${field("Срок следующего действия", "due", i.due < today() ? today() : i.due, "date")}</div><label class="field">${i.status === "open" ? "Первое действие" : "Решение для новичка"}<textarea name="note" required maxlength="800" placeholder="${i.status === "open" ? "Что сделаете и когда вернётесь с ответом?" : "Что изменилось и как новичку это проверить?"}"></textarea></label>${formError}<div class="modal-actions"><button class="button primary">${i.status === "open" ? "Взять в работу" : "Передать на подтверждение"}</button></div></form>`;
  else if (canConfirm)
    controls = `<form data-form="confirm" data-id="${esc(i.id)}"><h3>Помощь сработала?</h3><label class="field">Обратная связь<textarea name="note" required maxlength="800" placeholder="Удалось ли продолжить работу? Если нет — что осталось?"></textarea></label>${formError}<div class="modal-actions"><button class="button" name="decision" value="working">Проблема осталась</button><button class="button primary" name="decision" value="resolved">Да, вопрос решён</button></div></form>`;
  else
    controls = `<div class="inline-info">${i.status === "resolved" ? "Новичок подтвердил решение. История сохранена." : i.status === "confirmation" ? "Ждём подтверждения от новичка. В демо откройте его карточку и переключите роль." : i.recipient === "hr" && role === "manager" ? "Обработать этот запрос может HR. Переключите демороль." : "Запрос передан ответственному. Ответ появится здесь."}</div>`;
  openModal(
    "Запрос помощи",
    `<div class="issue-modal-meta">${badge(STATUS[i.status], i.status === "resolved" ? "green" : "amber")}<span>${esc(e.name)} · ${esc(e.department)}</span></div><h3 class="issue-title">${esc(i.title)}</h3><p class="description">${esc(i.description)}</p><div class="issue-facts"><span>Категория<strong>${esc(i.category)}</strong></span><span>Ответственный<strong>${esc(i.owner)}</strong></span><span>Срок действия<strong>${fullDate(i.due)}</strong></span></div><h3>История действий</h3><ol class="timeline">${i.events.map((v) => `<li><span>${esc(v.actor)} · ${stamp(v.at)}</span><p>${esc(v.text)}</p></li>`).join("")}</ol>${controls}`,
    true,
  );
}
function addModal() {
  openModal(
    "Новый коллега",
    `<p class="modal-intro">План появится по шаблону подразделения. Используйте только вымышленные данные.</p><form data-form="addEmployee">${field("Имя и фамилия", "name")}${field("Должность", "position", "", "text", true, 100)}<div class="form-row"><label class="field">Подразделение<select name="department" aria-label="Подразделение">${DEPARTMENTS.map((d) => `<option>${d}</option>`).join("")}</select></label>${field("Дата выхода", "start", today(), "date")}</div>${field("Руководитель", "manager")}${field("Наставник (необязательно)", "mentor", "", "text", false)}${formError}${buttons("Создать план адаптации")}</form>`,
  );
}
function helpModal() {
  openModal(
    "Проверить «Старт 90» за 3 минуты",
    `<p class="modal-intro">Инструмент помогает заметить препятствие, назначить ответственного и проверить, что помощь сработала.</p><ol class="guide"><li>Откройте карточку <b>Алексея Ветрова</b> и нажмите «Посмотреть глазами новичка».</li><li>В «Проверках» пройдите день 7: отметьте нехватку средств работы и опишите проблему.</li><li>Переключитесь на <b>руководителя</b>. Откройте новый запрос, возьмите в работу и укажите действие.</li><li>Повторно откройте запрос и передайте решение на подтверждение.</li><li>В роли новичка подтвердите результат или верните вопрос в работу. Обновите страницу — история сохранится.</li></ol><div class="inline-info"><b>Границы демонстрации</b><p>Вымышленные люди и шаблоны. Данные только в этом браузере, не синхронизируются между устройствами. Переключение ролей не является авторизацией. Нет реального подключения Битрикс24, внешних уведомлений и прогноза увольнений.</p></div><div class="modal-actions split">${action("export", icon("download") + " Экспорт JSON")}${action("reset", icon("reset") + " Сбросить демо", "", "button danger")}</div>`,
  );
}
function exportData() {
  let raw;
  try {
    raw = localStorage.getItem(KEY) || JSON.stringify(state, null, 2);
  } catch {
    raw = JSON.stringify(state, null, 2);
  }
  const url = URL.createObjectURL(
    new Blob([raw], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `start90-demo-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Файл данных подготовлен");
}
document.addEventListener("click", (event) => {
  const b = event.target.closest("[data-action]");
  if (!b) return;
  event.preventDefault();
  const a = b.dataset.action;
  try {
    switch (a) {
      case "navigate":
        page = b.dataset.page;
        if (role === "employee" && page === "overview") {
          page = "person";
          tab = "plan";
        }
        shell();
        break;
      case "person":
        selected = b.dataset.id;
        page = "person";
        tab = "plan";
        shell();
        window.scrollTo(0, 0);
        break;
      case "switchEmployee":
        role = "employee";
        tab = "checkins";
        shell();
        break;
      case "tab":
        tab = b.dataset.value;
        shell();
        break;
      case "filter":
        filter = b.dataset.value;
        shell();
        break;
      case "close":
        $("#modal").close();
        break;
      case "help":
        helpModal();
        break;
      case "add":
        if (role === "employee")
          throw new Error("Переключитесь на руководителя или HR.");
        addModal();
        break;
      case "newIssue":
        newIssueModal();
        break;
      case "checkin":
        checkinModal(Number(b.dataset.day));
        break;
      case "issueDetail":
        issueModal(b.dataset.id);
        break;
      case "task":
        commit("task", { employeeId: selected, taskId: b.dataset.id });
        shell();
        toast("План сохранён");
        break;
      case "mentor":
        openModal(
          "Контакт для помощи",
          `<form data-form="mentor">${field("Наставник", "mentor", employeeBy(selected).mentor)}${formError}${buttons("Сохранить")}</form>`,
        );
        break;
      case "viewCheck": {
        const c = state.checkins.find((x) => x.id === b.dataset.id);
        openModal(
          `Ответы · день ${c.day}`,
          `<p class="modal-intro">${stamp(c.at)} · ${esc(employeeBy(c.employeeId).name)}</p>${QUESTIONS.map((q, n) => `<div class="answer"><span>${q}</span>${badge(c.answers[n] ? "Да" : "Нужна помощь", c.answers[n] ? "green" : "amber")}</div>`).join("")}<p class="description">${esc(c.note || "Без комментария")}</p>`,
        );
        break;
      }
      case "export":
        exportData();
        break;
      case "reset":
        openModal(
          "Начать демонстрацию заново?",
          `<p class="modal-intro">Все изменения «Старт 90» в этом браузере будут заменены исходными вымышленными данными. Перед сбросом можно сохранить JSON.</p><div class="modal-actions">${action("export", "Экспорт данных")}${action("resetConfirm", "Да, сбросить демо", "", "button danger")}</div>`,
        );
        break;
      case "resetConfirm": {
        const next = createSeed();
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          throw new Error("Хранилище недоступно. Сброс не выполнен.");
        }
        state = next;
        storageError = "";
        loadFailed = false;
        role = "manager";
        page = "overview";
        selected = "employee-1";
        query = "";
        dept = "";
        $("#modal").close();
        shell();
        toast("Демонстрация сброшена");
        break;
      }
    }
  } catch (e) {
    toast(e.message);
  }
});
document.addEventListener("change", (event) => {
  if (event.target.id === "role") {
    role = event.target.value;
    if (role === "employee") {
      page = "person";
      tab = "checkins";
    }
    shell();
  }
  if (event.target.id === "department") {
    dept = event.target.value;
    $("#people-results").innerHTML = filteredEmployees();
  }
  if (event.target.id === "employee-choice") {
    selected = event.target.value;
    shell();
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "search") {
    query = event.target.value;
    $("#people-results").innerHTML = filteredEmployees();
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  try {
    const kind = form.dataset.form;
    if (kind === "checkin")
      commit("checkin", {
        employeeId: selected,
        day: Number(form.dataset.day),
        answers: [0, 1, 2].map((n) => f["q" + n] === "yes"),
        note: f.note,
        recipient: f.recipient,
      });
    else if (kind === "transition")
      commit("transition", {
        issueId: form.dataset.id,
        status: form.dataset.status,
        ...f,
      });
    else if (kind === "confirm")
      commit("transition", {
        employeeId: selected,
        issueId: form.dataset.id,
        status: event.submitter?.value,
        note: f.note,
      });
    else commit(kind, { employeeId: selected, ...f });
    if (kind === "addEmployee") {
      selected = state.employees[0].id;
      page = "person";
      tab = "plan";
    }
    if (kind === "issue" || kind === "checkin") tab = "requests";
    $("#modal").close();
    shell();
    toast(
      kind === "checkin"
        ? "Ответы сохранены. Если нужна помощь — запрос создан."
        : kind === "confirm"
          ? "Обратная связь сохранена"
          : "Изменения сохранены",
    );
  } catch (e) {
    form.querySelector(".form-error").textContent = e.message;
  }
});
window.addEventListener("storage", (event) => {
  if (event.key === KEY) {
    storageError =
      "Данные изменились в другой вкладке. Обновите страницу перед следующим действием.";
    shell();
  }
});
shell();
