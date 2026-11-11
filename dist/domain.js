export const VERSION = 1;
export const KEY = "start90.demo.v1";
export const CHECKPOINTS = [3, 7, 14, 30, 60, 90];
export const DEPARTMENTS = ["Склад", "Магазин", "Продажи", "Офис"];
export const CATEGORIES = [
  "Доступы и оборудование",
  "Ожидания и задачи",
  "Обучение",
  "Наставник и помощь",
  "Условия работы",
  "Другое",
];
export const STATUS = {
  open: "Новый запрос",
  working: "В работе",
  confirmation: "Ждёт подтверждения",
  resolved: "Решён",
};
export const QUESTIONS = [
  "Понятно, чего от меня ожидают",
  "Есть всё необходимое для работы",
  "Знаю, к кому обратиться за помощью",
];
const DAY = 86400000;
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Minsk",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function validDate(s) {
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function addDays(date, n) {
  return new Date(Date.parse(date) + n * DAY).toISOString().slice(0, 10);
}
export function dayNumber(e, date = today()) {
  return Math.floor((Date.parse(date) - Date.parse(e.start)) / DAY) + 1;
}
export function dueDate(e, day) {
  return addDays(e.start, day - 1);
}
export function uid() {
  return crypto.randomUUID();
}
function required(s, label, max = 800) {
  if (typeof s !== "string" || !s.trim() || s.trim().length > max)
    throw new Error(`${label}: заполните поле (до ${max} символов).`);
  return s.trim();
}
const PLANS = {
  Склад: [
    ["Пройти инструктаж по безопасности", 1, "Наставник"],
    ["Получить форму и доступ к ТСД", 3, "Руководитель"],
    ["Собрать первый заказ с наставником", 7, "Новичок"],
    ["Разобрать ошибки при комплектации", 14, "Наставник"],
  ],
  Магазин: [
    ["Познакомиться с командой и графиком", 1, "Руководитель"],
    ["Изучить ассортимент своего отдела", 3, "Новичок"],
    ["Провести продажу с наставником", 7, "Наставник"],
    ["Разобрать возвраты и работу с кассой", 14, "Наставник"],
  ],
  Продажи: [
    ["Обсудить задачи и критерии результата", 1, "Руководитель"],
    ["Получить доступ к CRM и прайсам", 3, "Руководитель"],
    ["Разобрать запрос клиента с наставником", 7, "Новичок"],
    ["Провести первый звонок с обратной связью", 14, "Наставник"],
  ],
  Офис: [
    ["Уточнить задачи и рабочий график", 1, "Руководитель"],
    ["Получить рабочие доступы", 3, "Руководитель"],
    ["Выполнить первую задачу с обратной связью", 7, "Новичок"],
    ["Обсудить взаимодействие с командой", 14, "Наставник"],
  ],
};
export function makePlan(department) {
  return [
    ...PLANS[department],
    ["Обсудить первый месяц и следующие шаги", 30, "Руководитель"],
    ["Сверить прогресс и потребность в помощи", 60, "Руководитель"],
    ["Подвести итоги адаптации", 90, "Руководитель"],
  ].map(([title, day, owner], i) => ({
    id: `task-${i}`,
    title,
    day,
    owner,
    done: false,
  }));
}
export function signals(state, e, date = today()) {
  if (dayNumber(e, date) < 1) return [];
  const list = [];
  if (!e.mentor)
    list.push({
      kind: "mentor",
      text: "Не назначен наставник",
      action: "Назначить контакт для помощи",
      due: e.start,
    });
  const missed = CHECKPOINTS.filter(
    (day) =>
      dueDate(e, day) < date &&
      !state.checkins.some((c) => c.employeeId === e.id && c.day === day),
  );
  if (missed.length)
    list.push({
      kind: "checkin",
      text: `Пропущена проверка: день ${missed[0]}`,
      action: "Связаться с новичком",
      due: dueDate(e, missed[0]),
    });
  const tasks = e.tasks.filter((t) => !t.done && dueDate(e, t.day) < date);
  if (tasks.length)
    list.push({
      kind: "task",
      text: `Просрочены пункты плана: ${tasks.length}`,
      action: "Уточнить, что мешает",
      due: dueDate(e, tasks[0].day),
    });
  state.issues
    .filter((i) => i.employeeId === e.id && i.status !== "resolved")
    .forEach((i) =>
      list.push({
        kind: "issue",
        text: i.title,
        action: STATUS[i.status],
        due: i.due,
        issueId: i.id,
      }),
    );
  return list;
}
export function createSeed(date = today()) {
  const rows = [
    [
      "Алексей Ветров",
      "Склад",
      "Комплектовщик",
      7,
      "Павел Орлов",
      "Ирина Лесная",
    ],
    [
      "Мария Берест",
      "Магазин",
      "Продавец-консультант",
      14,
      "Анна Клёнова",
      "Сергей Речной",
    ],
    ["Илья Луговой", "Продажи", "Менеджер B2B", 3, "Денис Светлов", ""],
    [
      "Софья Ясная",
      "Офис",
      "Специалист по закупкам",
      30,
      "Елена Рощина",
      "Олег Заречный",
    ],
    ["Никита Вереск", "Склад", "Кладовщик", 12, "Павел Орлов", "Ирина Лесная"],
    [
      "Алиса Озёрная",
      "Магазин",
      "Продавец-консультант",
      4,
      "Анна Клёнова",
      "Сергей Речной",
    ],
    [
      "Марк Полянский",
      "Продажи",
      "Менеджер B2B",
      61,
      "Денис Светлов",
      "Вера Сосновая",
    ],
    [
      "Дарья Липовая",
      "Офис",
      "Ассистент отдела",
      -2,
      "Елена Рощина",
      "Олег Заречный",
    ],
  ];
  const state = {
    version: VERSION,
    revision: 0,
    created: date,
    employees: [],
    issues: [],
    checkins: [],
  };
  rows.forEach(([name, department, position, day, manager, mentor], n) => {
    const e = {
      id: `employee-${n + 1}`,
      name,
      department,
      position,
      start: addDays(date, 1 - day),
      manager,
      mentor,
      tasks: makePlan(department),
    };
    e.tasks.forEach((t) => {
      t.done = t.day < day && !(n === 0 && t.day === 3);
    });
    state.employees.push(e);
    CHECKPOINTS.filter((d) => d < day && !(n === 4 && d === 7)).forEach((d) =>
      state.checkins.push({
        id: `seed-check-${n}-${d}`,
        employeeId: e.id,
        day: d,
        answers: [true, true, true],
        note: "",
        at: `${dueDate(e, d)}T09:00:00.000Z`,
      }),
    );
  });
  state.issues = [
    {
      id: "issue-seed-1",
      employeeId: "employee-2",
      title: "Нужна практика оформления возвратов",
      category: "Обучение",
      description:
        "Теорию разобрали, но пока не умею самостоятельно оформить возврат. Нужна одна смена с наставником.",
      recipient: "manager",
      owner: "Анна Клёнова",
      due: addDays(date, -1),
      status: "open",
      created: `${addDays(date, -2)}T09:00:00.000Z`,
      events: [
        {
          at: `${addDays(date, -2)}T09:00:00.000Z`,
          actor: "Новичок",
          text: "Запрос создан",
        },
      ],
    },
    {
      id: "issue-seed-2",
      employeeId: "employee-5",
      title: "Не выдали форму нужного размера",
      category: "Доступы и оборудование",
      description: "Пока использую запасную форму. Нужен подходящий размер.",
      recipient: "manager",
      owner: "Павел Орлов",
      due: addDays(date, 1),
      status: "working",
      created: `${date}T07:00:00.000Z`,
      events: [
        {
          at: `${date}T07:00:00.000Z`,
          actor: "Новичок",
          text: "Запрос создан",
        },
        {
          at: `${date}T08:00:00.000Z`,
          actor: "Руководитель",
          text: "Взято в работу. Уточню наличие у снабжения.",
        },
      ],
    },
    {
      id: "issue-seed-3",
      employeeId: "employee-4",
      title: "Нет доступа к каталогу поставщиков",
      category: "Доступы и оборудование",
      description: "Не открывается общий каталог.",
      recipient: "manager",
      owner: "Елена Рощина",
      due: date,
      status: "confirmation",
      created: `${addDays(date, -1)}T09:00:00.000Z`,
      events: [
        {
          at: `${addDays(date, -1)}T09:00:00.000Z`,
          actor: "Новичок",
          text: "Запрос создан",
        },
        {
          at: `${date}T08:30:00.000Z`,
          actor: "Руководитель",
          text: "Доступ выдан. Проверьте открытие каталога.",
        },
      ],
    },
  ];
  return state;
}
export function validateState(s) {
  if (
    !s ||
    s.version !== VERSION ||
    !Number.isInteger(s.revision) ||
    s.revision < 0 ||
    !validDate(s.created) ||
    !Array.isArray(s.employees) ||
    s.employees.length === 0 ||
    !Array.isArray(s.issues) ||
    !Array.isArray(s.checkins)
  )
    throw new Error("Формат сохранённых данных не поддерживается.");
  const ids = new Set();
  for (const e of s.employees) {
    if (
      typeof e.id !== "string" ||
      !e.id ||
      ids.has(e.id) ||
      typeof e.name !== "string" ||
      !e.name ||
      typeof e.position !== "string" ||
      !DEPARTMENTS.includes(e.department) ||
      !validDate(e.start) ||
      !Array.isArray(e.tasks) ||
      typeof e.manager !== "string" ||
      typeof e.mentor !== "string"
    )
      throw new Error("Повреждены данные сотрудника.");
    ids.add(e.id);
    for (const t of e.tasks)
      if (
        typeof t.id !== "string" ||
        typeof t.title !== "string" ||
        !Number.isInteger(t.day) ||
        t.day < 1 ||
        typeof t.owner !== "string" ||
        typeof t.done !== "boolean"
      )
        throw new Error("Повреждён план.");
  }
  const issueIds = new Set();
  for (const i of s.issues) {
    if (
      typeof i.id !== "string" ||
      issueIds.has(i.id) ||
      typeof i.title !== "string" ||
      typeof i.description !== "string" ||
      typeof i.owner !== "string" ||
      !CATEGORIES.includes(i.category) ||
      !Number.isFinite(Date.parse(i.created)) ||
      !ids.has(i.employeeId) ||
      !STATUS[i.status] ||
      !validDate(i.due) ||
      !Array.isArray(i.events) ||
      !["manager", "hr"].includes(i.recipient)
    )
      throw new Error("Повреждены данные обращения.");
    issueIds.add(i.id);
    for (const v of i.events)
      if (
        typeof v.actor !== "string" ||
        typeof v.text !== "string" ||
        !Number.isFinite(Date.parse(v.at))
      )
        throw new Error("Повреждена история обращения.");
  }
  const checks = new Set();
  for (const c of s.checkins) {
    const k = `${c.employeeId}:${c.day}`;
    if (
      typeof c.id !== "string" ||
      typeof c.note !== "string" ||
      !Number.isFinite(Date.parse(c.at)) ||
      !ids.has(c.employeeId) ||
      !CHECKPOINTS.includes(c.day) ||
      checks.has(k) ||
      !Array.isArray(c.answers) ||
      c.answers.length !== 3 ||
      c.answers.some((v) => typeof v !== "boolean")
    )
      throw new Error("Повреждены данные проверки.");
    checks.add(k);
  }
  return s;
}
export function dispatch(
  current,
  command,
  date = today(),
  at = new Date().toISOString(),
) {
  const s = structuredClone(current),
    p = command.payload || {},
    role = command.role;
  const e = s.employees.find((x) => x.id === p.employeeId);
  function staff() {
    if (!["manager", "hr"].includes(role))
      throw new Error("Действие доступно руководителю или HR.");
  }
  function employee() {
    if (!e) throw new Error("Сотрудник не найден.");
  }
  function newcomer() {
    employee();
    if (role !== "employee") throw new Error("Переключитесь на роль новичка.");
    if (dayNumber(e, date) < 1)
      throw new Error("Дата выхода ещё не наступила.");
  }
  function newIssue(info) {
    const recipient = info.recipient === "hr" ? "hr" : "manager";
    s.issues.unshift({
      id: uid(),
      employeeId: e.id,
      title: required(info.title, "Тема", 120),
      category: info.category,
      description: required(info.description, "Описание"),
      recipient,
      owner: recipient === "hr" ? "HR · команда адаптации" : e.manager,
      due: addDays(date, 1),
      status: "open",
      created: at,
      events: [{ at, actor: "Новичок", text: "Запрос создан" }],
    });
  }
  switch (command.type) {
    case "addEmployee": {
      staff();
      if (!DEPARTMENTS.includes(p.department) || !validDate(p.start))
        throw new Error("Проверьте подразделение и дату выхода.");
      s.employees.unshift({
        id: uid(),
        name: required(p.name, "Имя", 80),
        position: required(p.position, "Должность", 100),
        department: p.department,
        start: p.start,
        manager: required(p.manager, "Руководитель", 80),
        mentor: (p.mentor || "").trim().slice(0, 80),
        tasks: makePlan(p.department),
      });
      break;
    }
    case "mentor":
      staff();
      employee();
      e.mentor = required(p.mentor, "Наставник", 80);
      break;
    case "task": {
      employee();
      const t = e.tasks.find((x) => x.id === p.taskId);
      if (!t) throw new Error("Пункт не найден.");
      if (dayNumber(e, date) < 1)
        throw new Error("Дата выхода ещё не наступила.");
      if (role === "employee" && t.owner !== "Новичок")
        throw new Error("Этот пункт подтверждает ответственный.");
      if (role !== "employee") staff();
      t.done = !t.done;
      break;
    }
    case "issue":
      newcomer();
      if (!CATEGORIES.includes(p.category))
        throw new Error("Выберите категорию.");
      newIssue(p);
      break;
    case "checkin": {
      newcomer();
      if (!CHECKPOINTS.includes(p.day) || dueDate(e, p.day) > date)
        throw new Error("Эта проверка ещё не доступна.");
      if (s.checkins.some((c) => c.employeeId === e.id && c.day === p.day))
        throw new Error("Эта проверка уже отправлена.");
      if (
        !Array.isArray(p.answers) ||
        p.answers.length !== 3 ||
        p.answers.some((a) => typeof a !== "boolean")
      )
        throw new Error("Ответьте на все вопросы.");
      const note = (p.note || "").trim();
      if (note.length > 600)
        throw new Error("Описание: не более 600 символов.");
      if (p.answers.includes(false))
        required(note, "Расскажите, какая помощь нужна");
      s.checkins.push({
        id: uid(),
        employeeId: e.id,
        day: p.day,
        answers: p.answers,
        note,
        at,
      });
      if (p.answers.includes(false) || note)
        newIssue({
          title: `Нужна помощь · проверка дня ${p.day}`,
          category: "Другое",
          description: [
            ...p.answers.flatMap((a, n) => (a ? [] : [`Нет: ${QUESTIONS[n]}`])),
            note,
          ]
            .filter(Boolean)
            .join("\n"),
          recipient: p.recipient,
        });
      break;
    }
    case "transition": {
      const i = s.issues.find((x) => x.id === p.issueId);
      if (!i) throw new Error("Запрос не найден.");
      if (role === "employee") {
        employee();
        if (i.employeeId !== e.id)
          throw new Error("Это запрос другого новичка.");
      } else {
        staff();
        if (i.recipient === "hr" && role !== "hr")
          throw new Error("Этот запрос обрабатывает HR.");
      }
      const allowed =
        role === "employee"
          ? { confirmation: ["resolved", "working"] }
          : { open: ["working"], working: ["confirmation"] };
      if (!(allowed[i.status] || []).includes(p.status))
        throw new Error("Этот переход недоступен. Обновите карточку.");
      const note = required(p.note, "Комментарий");
      if (role !== "employee") {
        if (!validDate(p.due) || p.due < date)
          throw new Error("Укажите срок не раньше сегодняшнего дня.");
        i.due = p.due;
        i.owner = required(p.owner, "Ответственный", 80);
      }
      if (role === "employee" && p.status === "working")
        i.due = addDays(date, 1);
      i.status = p.status;
      i.events.push({
        at,
        actor:
          role === "employee"
            ? "Новичок"
            : role === "hr"
              ? "HR"
              : "Руководитель",
        text: note,
      });
      break;
    }
    default:
      throw new Error("Неизвестное действие.");
  }
  s.revision++;
  return validateState(s);
}
