# Geo-quiz

`Geo-quiz` — интерактивная географическая викторина, где игрок отвечает на вопросы кликом по карте мира. После каждого ответа приложение показывает расстояние до правильной точки, начисленные очки и краткий факт об объекте. После 10 вопросов игрок видит итоговый счёт, место в рейтинге и персональный паспорт экспедиции.

## Структура проекта

- `frontend/` — клиентское приложение на `React + TypeScript + Vite`
- `backend/` — REST API на `Fastify + TypeScript`
- `database/` — SQL-скрипты для `Supabase Postgres`
- `docs/` — проектирование, AI-рефлексия, тест-кейсы и скриншоты

## Документация

- [design.md](./docs/design.md)
- [AI_REFLECTION.md](./docs/AI_REFLECTION.md)
- [test-cases.md](./docs/test-cases.md)

## Что реализовано

Обязательная часть ТЗ:

- запуск игровой сессии;
- загрузка вопросов без перезагрузки страницы;
- ответ кликом по карте;
- расчёт расстояния и очков;
- мгновенная обратная связь после ответа;
- финальный результат после 10 вопросов;
- лидерборд;
- документация по проекту.

Дополнительные продуктовые фичи:

- тематические подборки: `Global Mix`, `Iconic Landmarks`, `World Wonders`, `Capitals and Cities`;
- форма предложения пользовательского вопроса;
- фото объекта в карточке вопроса;
- подсказка открывается только по нажатию;
- картографический слой с английскими подписями;
- `Паспорт экспедиции` с титулом игрока, средней ошибкой, лучшим попаданием, количеством открытых подсказок и рекомендацией следующего режима.

## Быстрый запуск

Это основной сценарий для проверяющего. Он не требует `Supabase` и секретных ключей.

Требования:

- `Docker`
- `Docker Compose`

Запуск:

```bash
docker compose up --build
```

После запуска:

- frontend: `http://localhost:5173`
- backend health: `http://localhost:4000/api/health`

Остановка:

```bash
docker compose down
```

По умолчанию Docker запускает backend в режиме `in-memory`, поэтому свежий клон репозитория должен работать без дополнительной настройки.

## Локальный запуск без Docker

Требования:

- `Node.js 20+`
- `npm 10+`

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Для PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

В `backend/.env.example` уже указано:

```env
USE_IN_MEMORY_DATA=true
```

поэтому backend запускается без `Supabase`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Для PowerShell:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Пример `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## Опционально: запуск с Supabase

Этот режим не обязателен для проверки, но полезен для демонстрации persistent-данных.

### 1. Подготовка базы данных

1. Создайте проект в `Supabase`.
2. Выполните [database/schema.sql](./database/schema.sql).
3. Выполните [database/seed.sql](./database/seed.sql).

### 2. Локальный запуск через Node.js

Отредактируйте `backend/.env`:

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVER_KEY=sb_secret_xxx
USE_IN_MEMORY_DATA=false
```

После этого backend будет работать через `Supabase`.

### 3. Запуск через Docker

Если хотите использовать `Supabase` вместе с Docker, перед `docker compose up --build` задайте переменные окружения в shell или создайте локальный корневой `.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVER_KEY=sb_secret_xxx
USE_IN_MEMORY_DATA=false
```

Не коммитьте реальные ключи в Git.

## Режимы данных

- `USE_IN_MEMORY_DATA=true` — быстрый локальный запуск без `Supabase`
- `USE_IN_MEMORY_DATA=false` — работа через `Supabase Postgres`

Если `SUPABASE_URL` или серверный ключ не указаны, backend автоматически переключается в `in-memory`.

## Автоматические тесты

В проекте есть реальные backend-тесты:

- [api.test.ts](./backend/tests/api.test.ts) — API и полный игровой цикл
- [geo.test.ts](./backend/tests/geo.test.ts) — unit-тесты расстояния, scoring и accuracy labels

Локальный запуск тестов:

```bash
cd backend
npm install
npm test
```

На каждый `push` и `pull_request` GitHub Actions выполняет:

- сборку backend;
- backend-тесты;
- сборку frontend.

Конфигурация CI:

- [ci.yml](./.github/workflows/ci.yml)

## Покрытие требований ТЗ

- `Часть 1. Проектирование и анализ` — описана в [design.md](./docs/design.md)
- `Часть 2. Разработка` — реализована в `frontend/`, `backend/`, `database/`
- `Часть 2.3. Документация по запуску` — описана в этом `README.md`
- `Часть 2.4. Использование AI` — отражена в [AI_REFLECTION.md](./docs/AI_REFLECTION.md)
- `Часть 3. Работа с AI` — оформлена в [AI_REFLECTION.md](./docs/AI_REFLECTION.md)
- `Тест-кейсы` — описаны в [test-cases.md](./docs/test-cases.md) и частично автоматизированы через CI

## Скриншоты

Скриншоты лежат в [docs/images](./docs/images):

- `home.png` — стартовый экран с подборками, лидербордом и формой предложения вопроса
- `game.png` — игровой экран с картой, фото и карточкой вопроса
- `result.png` — финальный экран с итогом, рейтингом и паспортом экспедиции
