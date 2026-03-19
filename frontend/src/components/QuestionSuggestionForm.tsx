import { type FormEvent, useEffect, useState } from "react";
import type { QuestionSuggestionPayload, QuestionTheme } from "../types";

interface QuestionSuggestionFormProps {
  defaultPlayerName: string;
  isSubmitting: boolean;
  successMessage: string | null;
  errorMessage: string | null;
  onSubmit: (payload: QuestionSuggestionPayload) => Promise<boolean>;
}

const themeLabels: Record<QuestionTheme, string> = {
  "iconic-landmarks": "Иконические места",
  "world-wonders": "Чудеса света",
  capitals: "Столицы и города"
};

export function QuestionSuggestionForm({
  defaultPlayerName,
  isSubmitting,
  successMessage,
  errorMessage,
  onSubmit
}: QuestionSuggestionFormProps): JSX.Element {
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [prompt, setPrompt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [themeId, setThemeId] = useState<QuestionTheme>("iconic-landmarks");
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    if (!defaultPlayerName) {
      return;
    }

    setPlayerName(defaultPlayerName);
  }, [defaultPlayerName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const isSuccessful = await onSubmit({
      playerName: playerName.trim() || "Explorer",
      prompt,
      locationName,
      themeId,
      notes: notes.trim() || null,
      sourceUrl: sourceUrl.trim() || null
    });

    if (isSuccessful) {
      setPrompt("");
      setLocationName("");
      setThemeId("iconic-landmarks");
      setNotes("");
      setSourceUrl("");
    }
  }

  return (
    <section className="panel suggestion-panel">
      <span className="eyebrow">Предложить вопрос</span>
      <h3 className="panel-title">Добавь место, которого не хватает</h3>
      <p className="muted-copy">
        Это закрывает опциональный сценарий из ТЗ и делает проект живее: коллекция
        может расти не только силами автора.
      </p>

      <form className="suggestion-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="suggestion-player-name">
          Имя автора
        </label>
        <input
          id="suggestion-player-name"
          className="text-input"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          maxLength={40}
          placeholder="Например, Alex"
        />

        <label className="field-label" htmlFor="suggestion-prompt">
          Текст вопроса
        </label>
        <input
          id="suggestion-prompt"
          className="text-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={160}
          placeholder="Например, Где находится Колизей?"
          required
        />

        <label className="field-label" htmlFor="suggestion-location-name">
          Правильный объект или город
        </label>
        <input
          id="suggestion-location-name"
          className="text-input"
          value={locationName}
          onChange={(event) => setLocationName(event.target.value)}
          maxLength={100}
          placeholder="Например, Колизей"
          required
        />

        <label className="field-label" htmlFor="suggestion-theme">
          Подборка
        </label>
        <select
          id="suggestion-theme"
          className="text-input text-select"
          value={themeId}
          onChange={(event) => setThemeId(event.target.value as QuestionTheme)}
        >
          {Object.entries(themeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="suggestion-source">
          Источник
        </label>
        <input
          id="suggestion-source"
          className="text-input"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          maxLength={240}
          placeholder="https://..."
        />

        <label className="field-label" htmlFor="suggestion-notes">
          Комментарий
        </label>
        <textarea
          id="suggestion-notes"
          className="text-area"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={400}
          placeholder="Почему это место стоит добавить в игру?"
        />

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Сохраняем..." : "Отправить предложение"}
        </button>
      </form>

      {successMessage ? <div className="success-banner">{successMessage}</div> : null}
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
    </section>
  );
}
