// components/Dial.js
// The signature element: a radio-tuning dial. The needle points
// from "ferne Frequenz" (far / foreign-sounding) to "klare Frequenz"
// (clear / native-sounding) based on the Sprachgefühl score (0-100).

// components/Dial.js
// Modern hero stats card - bold, simple, impactful

export default function Dial({ score = 50, level = 1, xpCurrent = 50, xpMax = 100, streak = 0 }) {
  const progressPercent = (xpCurrent / xpMax) * 100;

  return (
    <div className="hero-stats-card">
      <div className="hero-stats-top">
        <span className="hero-label">Sprachgefühl</span>
        <div className="hero-score">{Math.round(score)}</div>
        <span className="hero-sublabel">Dein Fortschritt</span>
      </div>

      <div className="hero-progress-wrap">
        <div className="hero-progress-track">
          <div 
            className="hero-progress-fill" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="hero-progress-label">
          <span>{xpCurrent}</span>
          <span>/ {xpMax} XP</span>
        </div>
      </div>

      <div className="hero-stats-grid">
        <div className="hero-stat">
          <div className="hero-stat-value">Lvl {level}</div>
          <div className="hero-stat-label">Level</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">🔥 {streak}</div>
          <div className="hero-stat-label">Streak</div>
        </div>
      </div>
    </div>
  );
}
