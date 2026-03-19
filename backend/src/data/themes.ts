import type { CollectionId, ThemeOption } from "../types.js";

type ThemeDefinition = Omit<ThemeOption, "questionCount">;

export const themeDefinitions: ThemeDefinition[] = [
  {
    id: "all",
    label: "Глобальный микс",
    description: "Разные типы вопросов подряд: города, знаковые места и чудеса света."
  },
  {
    id: "iconic-landmarks",
    label: "Иконические места",
    description: "Мосты, башни, статуи и горы, которые знают даже вне учебников."
  },
  {
    id: "world-wonders",
    label: "Чудеса света",
    description: "Подборка легендарных объектов, которые приятно угадывать по карте."
  },
  {
    id: "capitals",
    label: "Столицы и города",
    description: "Городской режим для тех, кто любит столицы и урбанистические точки."
  }
];

export function getThemeDefinition(id: CollectionId): ThemeDefinition {
  return (
    themeDefinitions.find((theme) => theme.id === id) ?? themeDefinitions[0]
  );
}
