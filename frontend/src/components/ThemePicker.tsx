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
              <div className="theme-card__topline">
                <strong>{theme.label}</strong>
                <span>{theme.questionCount} вопросов</span>
              </div>
              <p>{theme.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

