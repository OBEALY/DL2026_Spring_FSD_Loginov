import type { LeaderboardEntry } from "../types";

interface LeaderboardPanelProps {
  items: LeaderboardEntry[];
  currentSessionId?: string | null;
}

const scoreFormatter = new Intl.NumberFormat("ru-RU");

export function LeaderboardPanel({
  items,
  currentSessionId
}: LeaderboardPanelProps): JSX.Element {
  return (
    <section className="panel leaderboard-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Таблица лидеров</span>
          <h3 className="panel-title">Лучшие сессии</h3>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="muted-copy">
          Лидерборд пока пуст. Заверши игру, чтобы заполнить его первой записью.
        </p>
      ) : (
        <ul className="leaderboard-list">
          {items.map((item, index) => {
            const isCurrent = item.sessionId === currentSessionId;

            return (
              <li
                key={item.sessionId}
                className={`leaderboard-item${isCurrent ? " is-current" : ""}`}
              >
                <span className="leaderboard-rank">#{index + 1}</span>
                <div className="leaderboard-meta">
                  <strong>{item.playerName}</strong>
                  <span>{item.answeredQuestions} ответов</span>
                </div>
                <strong className="leaderboard-score">
                  {scoreFormatter.format(item.totalScore)}
                </strong>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

