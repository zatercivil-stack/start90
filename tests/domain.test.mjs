import test from "node:test";
import assert from "node:assert/strict";
import {
  createSeed,
  dispatch,
  signals,
  dayNumber,
  dueDate,
  validDate,
  validateState,
  addDays,
} from "../dist/domain.js";
const date = "2026-11-11",
  at = "2026-11-11T10:00:00.000Z";
const run = (s, type, payload, role = "employee") =>
  dispatch(s, { type, payload, role }, date, at);
const issue = {
  employeeId: "employee-1",
  title: "Нет доступа к ТСД",
  category: "Доступы и оборудование",
  description: "Нужен доступ для комплектации",
  recipient: "manager",
};
test("seed has 8 fictional employees, four departments and valid references", () => {
  const s = createSeed(date);
  assert.equal(validateState(s), s);
  assert.equal(s.employees.length, 8);
  assert.equal(new Set(s.employees.map((e) => e.department)).size, 4);
  assert.equal(s.issues.length, 3);
});
test("start day is day 1; checkpoint dates respect month/year/leap boundaries", () => {
  assert.equal(dayNumber({ start: "2026-11-11" }, date), 1);
  assert.equal(dayNumber({ start: "2026-11-12" }, date), 0);
  assert.equal(dueDate({ start: "2026-12-30" }, 3), "2027-01-01");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(validDate("2026-02-30"), false);
});
test("negative checkin creates exactly one issue and rejects duplicate submission", () => {
  let s = createSeed(date);
  s = run(s, "checkin", {
    employeeId: "employee-1",
    day: 7,
    answers: [true, false, false],
    note: "Нужен доступ",
    recipient: "manager",
  });
  assert.equal(s.issues.length, 4);
  assert.equal(
    s.checkins.filter((c) => c.employeeId === "employee-1" && c.day === 7)
      .length,
    1,
  );
  assert.equal(s.issues[0].owner, "Павел Орлов");
  assert.match(s.issues[0].description, /Есть всё необходимое/);
  assert.throws(
    () =>
      run(s, "checkin", {
        employeeId: "employee-1",
        day: 7,
        answers: [true, true, true],
      }),
    /уже отправлена/,
  );
});
test("positive checkin creates no issue unless a blocker is described", () => {
  let s = createSeed(date);
  s = run(s, "checkin", {
    employeeId: "employee-1",
    day: 7,
    answers: [true, true, true],
    note: "",
  });
  assert.equal(s.issues.length, 3);
  let b = run(createSeed(date), "checkin", {
    employeeId: "employee-1",
    day: 7,
    answers: [true, true, true],
    note: "Не совпал график",
    recipient: "hr",
  });
  assert.equal(b.issues[0].recipient, "hr");
});
test("negative checkin requires detail and remains atomic on error", () => {
  const s = createSeed(date),
    before = JSON.stringify(s);
  assert.throws(
    () =>
      run(s, "checkin", {
        employeeId: "employee-1",
        day: 7,
        answers: [true, false, true],
        note: "  ",
      }),
    /Расскажите/,
  );
  assert.equal(JSON.stringify(s), before);
});
test("future and incomplete checkins are rejected", () => {
  const s = createSeed(date);
  assert.throws(
    () =>
      run(s, "checkin", {
        employeeId: "employee-1",
        day: 90,
        answers: [true, true, true],
      }),
    /ещё не доступна/,
  );
  assert.throws(
    () =>
      run(s, "checkin", { employeeId: "employee-1", day: 7, answers: [true] }),
    /все вопросы/,
  );
  assert.throws(
    () =>
      run(
        s,
        "checkin",
        { employeeId: "employee-1", day: 7, answers: [true, true, true] },
        "manager",
      ),
    /роль новичка/,
  );
});
test("full issue lifecycle, reopening, confirmation and persistence", () => {
  let s = run(createSeed(date), "issue", issue);
  const id = s.issues[0].id;
  const base = {
    issueId: id,
    owner: "Павел Орлов",
    due: date,
    note: "Проверяю доступ",
  };
  s = run(s, "transition", { ...base, status: "working" }, "manager");
  s = run(
    s,
    "transition",
    { ...base, status: "confirmation", note: "Доступ выдан" },
    "manager",
  );
  s = run(s, "transition", {
    issueId: id,
    employeeId: "employee-1",
    status: "working",
    note: "ТСД ещё не пускает",
  });
  assert.equal(s.issues[0].due, "2026-11-12");
  s = run(
    s,
    "transition",
    { ...base, status: "confirmation", note: "Повторно проверили" },
    "manager",
  );
  s = run(s, "transition", {
    issueId: id,
    employeeId: "employee-1",
    status: "resolved",
    note: "Всё работает",
  });
  s = validateState(JSON.parse(JSON.stringify(s)));
  assert.equal(s.issues[0].status, "resolved");
  assert.equal(s.issues[0].events.length, 6);
  assert.equal(
    signals(s, s.employees[0], date).some((x) => x.issueId === id),
    false,
  );
});
test("manager cannot close request on behalf of employee", () => {
  const s = createSeed(date);
  assert.throws(
    () =>
      run(
        s,
        "transition",
        {
          issueId: "issue-seed-3",
          status: "resolved",
          note: "Готово",
          owner: "Елена",
          due: date,
        },
        "manager",
      ),
    /недоступен/,
  );
});
test("other newcomer cannot confirm and manager cannot handle HR route", () => {
  const s = createSeed(date);
  assert.throws(
    () =>
      run(s, "transition", {
        issueId: "issue-seed-3",
        employeeId: "employee-1",
        status: "resolved",
        note: "Готово",
      }),
    /другого новичка/,
  );
  const h = run(s, "issue", { ...issue, recipient: "hr" });
  assert.throws(
    () =>
      run(
        h,
        "transition",
        {
          issueId: h.issues[0].id,
          status: "working",
          owner: "HR",
          due: date,
          note: "Уточню",
        },
        "manager",
      ),
    /обрабатывает HR/,
  );
  assert.equal(
    run(
      h,
      "transition",
      {
        issueId: h.issues[0].id,
        status: "working",
        owner: "HR",
        due: date,
        note: "Уточню",
      },
      "hr",
    ).issues[0].status,
    "working",
  );
});
test("staff must provide future or current due date, owner and comment", () => {
  const s = createSeed(date),
    p = {
      issueId: "issue-seed-1",
      status: "working",
      due: date,
      owner: "Анна",
      note: "Покажу возврат",
    };
  assert.throws(
    () => run(s, "transition", { ...p, due: "2026-11-10" }, "manager"),
    /срок/,
  );
  assert.throws(
    () => run(s, "transition", { ...p, owner: "" }, "manager"),
    /Ответственный/,
  );
  assert.throws(
    () => run(s, "transition", { ...p, note: "" }, "manager"),
    /Комментарий/,
  );
});
test("newcomer only completes own tasks; staff can verify team tasks", () => {
  const s = createSeed(date);
  assert.throws(
    () => run(s, "task", { employeeId: "employee-1", taskId: "task-1" }),
    /ответственный/,
  );
  const n = run(s, "task", { employeeId: "employee-1", taskId: "task-2" });
  assert.equal(n.employees[0].tasks[2].done, true);
  assert.equal(
    run(n, "task", { employeeId: "employee-1", taskId: "task-1" }, "manager")
      .employees[0].tasks[1].done,
    true,
  );
});
test("future employee cannot submit issues or complete tasks", () => {
  const s = createSeed(date);
  assert.throws(
    () => run(s, "issue", { ...issue, employeeId: "employee-8" }),
    /не наступила/,
  );
  assert.throws(
    () =>
      run(s, "task", { employeeId: "employee-8", taskId: "task-1" }, "manager"),
    /не наступила/,
  );
  assert.deepEqual(signals(s, s.employees[7], date), []);
});
test("new employee gets appropriate template and missing mentor signal", () => {
  const s = run(
    createSeed(date),
    "addEmployee",
    {
      name: "Тестовый Коллега",
      position: "Консультант",
      department: "Магазин",
      start: date,
      manager: "Тестовый Руководитель",
      mentor: "",
    },
    "hr",
  );
  assert.equal(s.employees[0].tasks.length, 7);
  assert.match(s.employees[0].tasks[2].title, /продажу/);
  assert.equal(signals(s, s.employees[0], date)[0].kind, "mentor");
  const n = run(
    s,
    "mentor",
    { employeeId: s.employees[0].id, mentor: "Тестовый Наставник" },
    "manager",
  );
  assert.equal(
    signals(n, n.employees[0], date).some((x) => x.kind === "mentor"),
    false,
  );
});
test("missed checkpoint is overdue only after the due day", () => {
  const s = createSeed(date),
    e = s.employees[0];
  assert.equal(
    signals(s, e, date).some((x) => x.kind === "checkin"),
    false,
  );
  assert.equal(
    signals(s, e, addDays(date, 1)).some((x) => x.kind === "checkin"),
    true,
  );
});
test("invalid department, date, blank name and oversized payload rejected", () => {
  const s = createSeed(date),
    p = {
      name: "Имя",
      position: "Роль",
      department: "Склад",
      start: date,
      manager: "Руководитель",
    };
  for (const patch of [
    { department: "Нет" },
    { start: "2026-02-30" },
    { name: "  " },
    { name: "x".repeat(81) },
  ])
    assert.throws(() => run(s, "addEmployee", { ...p, ...patch }, "hr"));
  assert.throws(() => run(s, "issue", { ...issue, title: "x".repeat(121) }));
});
test("unknown storage version, duplicate IDs and broken references rejected", () => {
  for (const mutate of [
    (s) => (s.version = 999),
    (s) => s.employees.push(s.employees[0]),
    (s) => (s.issues[0].employeeId = "missing"),
    (s) => s.checkins.push(s.checkins[0]),
  ]) {
    const s = createSeed(date);
    mutate(s);
    assert.throws(() => validateState(s));
  }
});
test("malformed saved events and strings are rejected before rendering", () => {
  for (const mutate of [
    (s) => (s.issues[0].events[0].at = "bad date"),
    (s) => (s.employees[0].name = {}),
    (s) => (s.checkins[0].note = {}),
    (s) => (s.employees = []),
    (s) => (s.revision = -1),
  ]) {
    const s = createSeed(date);
    mutate(s);
    assert.throws(() => validateState(s));
  }
});
