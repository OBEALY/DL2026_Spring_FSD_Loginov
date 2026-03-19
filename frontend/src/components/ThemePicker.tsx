import type { CollectionId, ThemeOption } from "../types";

interface ThemePickerProps {
  themes: ThemeOption[];
  selectedThemeId: CollectionId;
  onSelect: (themeId: CollectionId) => void;
}

export function ThemePicker({
  themes,
  selectedThemeId,
  onSelect
}: ThemePickerProps): JSX.Element {
  return (
    <section className="theme-picker">
      <div className="theme-picker__header">
        <div>
          <span className="eyebrow">Тематические подборки</span>
          <h3 className="panel-title">Выбери формат экспедиции</h3>
        </div>
      </div>

      <div className="theme-grid">
        {themes.map((theme) => {
          const isSelected = theme.id === selectedThemeId;

          return (
            <button
              key={theme.id}
              type="button"
              className={`theme-card${isSelected ? " is-selected" : ""}`}
              onClick={() => onSelect(theme.id)}
            >
              <span className="theme-card__badge">Маршрут</span>
              <div className="theme-card__topline">
                <strong>{theme.label}</strong>
                <span className="theme-card__count">{theme.questionCount} вопросов</span>
              </div>
              <p>{theme.description}</p>
              <div className="theme-card__footer">
                <span className="theme-card__meta">
                  {isSelected ? "Режим выбран" : "Нажми, чтобы выбрать"}
                </span>
                <span className="theme-card__cta">
                  {isSelected ? "Готово" : "Выбрать"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
