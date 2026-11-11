import { chromium } from "@playwright/test";
import { rename, mkdir } from "node:fs/promises";
const browser = await chromium.launch({ headless: true, slowMo: 180 });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: "artifacts/video", size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4173");
async function caption(text) {
  await page.evaluate((t) => {
    let el = document.querySelector("#demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText =
        "position:fixed;bottom:18px;left:270px;right:36px;background:#183d2f;color:white;padding:17px 24px;border:1px solid #9bbd80;border-radius:9px;z-index:99999;font:500 18px/1.5 system-ui;box-shadow:0 5px 25px #0003;pointer-events:none";
      document.body.append(el);
    }
    el.textContent = t;
  }, text);
  await page.waitForTimeout(2800);
}
await caption(
  "Старт 90 · заметить препятствие, помочь и получить подтверждение новичка. Только вымышленные данные.",
);
await page
  .getByRole("button", { name: /Новички/ })
  .first()
  .click();
await page.getByLabel("Поиск новичка").fill("Алексей");
await page.getByRole("button", { name: /Алексей Ветров Склад/ }).click();
await caption(
  "1 / 5 · Алексей — седьмой день на складе. Есть план, наставник и короткие проверки адаптации.",
);
await page.getByRole("button", { name: "Посмотреть глазами новичка" }).click();
await page.locator('[data-action="checkin"][data-day="7"]').click();
await page.locator('input[name="q0"][value="yes"]').check();
await page.locator('input[name="q1"][value="no"]').check();
await page.locator('input[name="q2"][value="yes"]').check();
await page
  .getByLabel("Есть ли что-то, что мешает?")
  .fill("Нет доступа к ТСД. Не могу самостоятельно собирать заказы.");
await page.waitForTimeout(2200);
await page.getByRole("button", { name: "Отправить ответы" }).click();
await caption(
  "2 / 5 · Из ответа создан запрос помощи: проблема больше не остаётся только у новичка.",
);
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
  .fill("Передам заявку администратору склада. Вернусь с ответом сегодня.");
await page.waitForTimeout(1800);
await page.getByRole("button", { name: "Взять в работу", exact: true }).click();
await caption(
  "3 / 5 · Руководитель взял запрос в работу. Сохранены ответственный, срок и конкретное действие.",
);
await page
  .locator(".issue-row")
  .filter({ hasText: "Нужна помощь · проверка дня 7" })
  .click();
await page
  .getByLabel("Решение для новичка")
  .fill("Доступ к ТСД выдан. Войдите повторно и попробуйте собрать заказ.");
await page.waitForTimeout(1800);
await page.getByRole("button", { name: "Передать на подтверждение" }).click();
await caption(
  "4 / 5 · Решение передано новичку. Руководитель не может закрыть проблему за него.",
);
await page.getByLabel("Демонстрационная роль").selectOption("employee");
await page.getByRole("button", { name: /^Запросы \(/ }).click();
await page
  .locator(".issue-row")
  .filter({ hasText: "Нужна помощь · проверка дня 7" })
  .click();
await page
  .getByLabel("Обратная связь", { exact: true })
  .fill("Вошёл в систему и собрал первый заказ. Теперь всё работает.");
await page.waitForTimeout(2200);
await page.getByRole("button", { name: "Да, вопрос решён" }).click();
await caption(
  "5 / 5 · Новичок подтвердил результат. Если помощь не сработала, он мог вернуть запрос в работу.",
);
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
await page.waitForTimeout(3500);
await page.getByRole("button", { name: "Закрыть", exact: true }).click();
await caption(
  "После перезагрузки история на месте. Демо хранит данные в этом браузере; реального подключения Битрикс24 нет.",
);
await page.waitForTimeout(2500);
const video = page.video();
await context.close();
const path = await video.path();
await mkdir("artifacts", { recursive: true });
await rename(path, "artifacts/start90-demo.webm");
await browser.close();
console.log(
  JSON.stringify({ video: "artifacts/start90-demo.webm", pageErrors: errors }),
);
if (errors.length) process.exitCode = 1;
