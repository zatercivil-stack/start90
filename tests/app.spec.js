import { test, expect } from "@playwright/test";
const key = "start90.demo.v1";
async function person(page) {
  await page
    .getByRole("button", { name: /Новички/ })
    .first()
    .click();
  await page.getByLabel("Поиск новичка").fill("Алексей");
  await page.getByRole("button", { name: /Алексей Ветров Склад/ }).click();
}
async function request(page) {
  await page
    .getByRole("button", { name: "Посмотреть глазами новичка" })
    .click();
  await page.getByRole("button", { name: "Нужна помощь", exact: true }).click();
  await page.getByLabel("Короткая тема").fill("Нет доступа к ТСД");
  await page
    .getByLabel("Что случилось и какая помощь нужна")
    .fill("Не могу собрать заказ. Прошу выдать доступ.");
  await page.getByRole("button", { name: "Отправить запрос" }).click();
}
test("complete checkin → manager action → employee confirmation → reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Кому нужна помощь сегодня" }),
  ).toBeVisible();
  await person(page);
  await page
    .getByRole("button", { name: "Посмотреть глазами новичка" })
    .click();
  await page.locator('[data-action="checkin"][data-day="7"]').click();
  await page.locator('input[name="q0"][value="yes"]').check();
  await page.locator('input[name="q1"][value="no"]').check();
  await page.locator('input[name="q2"][value="yes"]').check();
  await page
    .getByLabel("Есть ли что-то, что мешает?")
    .fill("Нет доступа к ТСД, не могу собирать заказы.");
  await page.getByRole("button", { name: "Отправить ответы" }).click();
  await expect(
    page
      .locator(".issue-row")
      .filter({ hasText: "Нужна помощь · проверка дня 7" }),
  ).toBeVisible();
  await page.getByLabel("Демонстрационная роль").selectOption("manager");
  await page
    .getByRole("button", { name: /Запросы помощи/ })
    .first()
    .click();
  await page
    .locator(".issue-row")
    .filter({ hasText: "Нужна помощь · проверка дня 7" })
    .click();
  await page
    .getByLabel("Первое действие")
    .fill("Передам заявку администратору склада сегодня.");
  await page
    .getByRole("button", { name: "Взять в работу", exact: true })
    .click();
  await page
    .locator(".issue-row")
    .filter({ hasText: "Нужна помощь · проверка дня 7" })
    .click();
  await page
    .getByLabel("Решение для новичка")
    .fill("Доступ к ТСД выдан. Войдите повторно и проверьте заказ.");
  await page.getByRole("button", { name: "Передать на подтверждение" }).click();
  await expect(
    page
      .locator(".issue-row")
      .filter({ hasText: "Нужна помощь · проверка дня 7" }),
  ).toContainText("Ждёт подтверждения");
  await page.getByLabel("Демонстрационная роль").selectOption("employee");
  await page.getByRole("button", { name: /^Запросы \(/ }).click();
  await page
    .locator(".issue-row")
    .filter({ hasText: "Нужна помощь · проверка дня 7" })
    .click();
  await page
    .getByLabel("Обратная связь", { exact: true })
    .fill("Вошёл в ТСД и собрал первый заказ. Спасибо.");
  await page.getByRole("button", { name: "Да, вопрос решён" }).click();
  await expect(
    page
      .locator(".issue-row")
      .filter({ hasText: "Нужна помощь · проверка дня 7" }),
  ).toContainText("Решён");
  await page.reload();
  await page
    .getByRole("button", { name: /Запросы помощи/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Решённые", exact: true }).click();
  await page
    .locator(".issue-row")
    .filter({ hasText: "Нужна помощь · проверка дня 7" })
    .click();
  await expect(
    page.getByText("Вошёл в ТСД и собрал первый заказ. Спасибо.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Доступ к ТСД выдан. Войдите повторно и проверьте заказ.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("request can be reopened; HR routing and filter work", async ({
  page,
}) => {
  await page.goto("/");
  await person(page);
  await request(page);
  await page.getByLabel("Демонстрационная роль").selectOption("manager");
  await page
    .locator(".issue-row")
    .filter({ hasText: "Нет доступа к ТСД" })
    .click();
  await page.getByLabel("Первое действие").fill("Проверяю");
  await page
    .getByRole("button", { name: "Взять в работу", exact: true })
    .click();
  await page
    .locator(".issue-row")
    .filter({ hasText: "Нет доступа к ТСД" })
    .click();
  await page.getByLabel("Решение для новичка").fill("Готово");
  await page.getByRole("button", { name: "Передать на подтверждение" }).click();
  await page.getByLabel("Демонстрационная роль").selectOption("employee");
  await page.getByRole("button", { name: /^Запросы \(/ }).click();
  await page
    .locator(".issue-row")
    .filter({ hasText: "Нет доступа к ТСД" })
    .click();
  await page
    .getByLabel("Обратная связь", { exact: true })
    .fill("Ошибка осталась");
  await page.getByRole("button", { name: "Проблема осталась" }).click();
  await expect(
    page.locator(".issue-row").filter({ hasText: "Нет доступа к ТСД" }),
  ).toContainText("В работе");
  await page.getByRole("button", { name: "Нужна помощь", exact: true }).click();
  await page.getByLabel("Короткая тема").fill("Вопрос по графику");
  await page
    .getByLabel("Что случилось и какая помощь нужна")
    .fill("Хочу обсудить с HR");
  await page.getByLabel("Кому передать").selectOption("hr");
  await page.getByRole("button", { name: "Отправить запрос" }).click();
  await page.getByLabel("Демонстрационная роль").selectOption("manager");
  await page
    .locator(".issue-row")
    .filter({ hasText: "Вопрос по графику" })
    .click();
  await expect(
    page.getByText("Обработать этот запрос может HR. Переключите демороль."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByLabel("Демонстрационная роль").selectOption("hr");
  await page
    .locator(".issue-row")
    .filter({ hasText: "Вопрос по графику" })
    .click();
  await expect(page.getByLabel("Первое действие")).toBeVisible();
});
test("add employee, assign mentor, complete plan and search safely", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Добавить новичка" }).click();
  await page.getByLabel("Имя и фамилия").fill("Тестовый <b>Коллега</b>");
  await page.getByLabel("Должность", { exact: true }).fill("Консультант");
  await page
    .getByLabel("Подразделение", { exact: true })
    .selectOption("Магазин");
  await page
    .getByLabel("Руководитель", { exact: true })
    .fill("Тестовый Руководитель");
  await page.getByRole("button", { name: "Создать план адаптации" }).click();
  await expect(
    page.getByRole("heading", { name: "Тестовый <b>Коллега</b>" }),
  ).toBeVisible();
  await expect(page.locator("h1 b")).toHaveCount(0);
  await page.getByRole("button", { name: "Назначить наставника" }).click();
  await page
    .getByLabel("Наставник", { exact: true })
    .fill("Тестовый Наставник");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.getByText("Тестовый Наставник", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Выполнить: Познакомиться с командой и графиком",
    })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: /Новички/ })
    .first()
    .click();
  await page.getByLabel("Поиск новичка").fill("Тестовый");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Подразделение", { exact: true }).selectOption("Склад");
  await expect(page.getByText("Никого не нашли")).toBeVisible();
});
test("checkin validates explanation and prevents repeat submission", async ({
  page,
}) => {
  await page.goto("/");
  await person(page);
  await page
    .getByRole("button", { name: "Посмотреть глазами новичка" })
    .click();
  await page.locator('[data-action="checkin"][data-day="7"]').click();
  for (let n = 0; n < 3; n++)
    await page.locator(`input[name="q${n}"][value="no"]`).check();
  await page.getByRole("button", { name: "Отправить ответы" }).click();
  await expect(page.locator(".form-error")).toContainText("Расскажите");
  await page
    .getByLabel("Есть ли что-то, что мешает?")
    .fill("Нужно объяснить работу");
  await page.getByRole("button", { name: "Отправить ответы" }).click();
  await page.getByRole("button", { name: "Проверки", exact: true }).click();
  await expect(
    page.locator('[data-action="checkin"][data-day="7"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-action="checkin"][data-day="90"]'),
  ).toBeDisabled();
});
test("storage write failure does not falsely report success", async ({
  page,
}) => {
  await page.goto("/");
  await person(page);
  await page.getByRole("button", { name: "Назначить наставника" }).count();
  await page.getByRole("button", { name: "Изменить наставника" }).click();
  await page.getByLabel("Наставник", { exact: true }).fill("Не сохранится");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.locator(".form-error")).toContainText(
    "Не удалось сохранить",
  );
  const s = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(s.employees[0].mentor).toBe("Ирина Лесная");
});
test("corrupt data is preserved and reset is explicit", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((k) => localStorage.setItem(k, "broken-json"), key);
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Исходная запись не изменена",
  );
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(
    "broken-json",
  );
  await page
    .getByRole("button", { name: "Сбросить демо", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Начать демонстрацию заново?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Да, сбросить демо" }).click();
  await expect(page.locator(".error-banner")).toHaveCount(0);
});
test("mobile layouts have no horizontal overflow and support primary actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "artifacts/mobile-overview.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await person(page);
  await request(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".issue-row")
    .filter({ hasText: "Нет доступа к ТСД" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Запрос помощи", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/mobile-request.png",
    fullPage: true,
  });
});
test("desktop screenshot and help/export", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({
    path: "artifacts/desktop-overview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Как проверить демо" }).click();
  await expect(
    page.getByRole("heading", { name: "Проверить «Старт 90» за 3 минуты" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^start90-demo-.*\.json$/,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
