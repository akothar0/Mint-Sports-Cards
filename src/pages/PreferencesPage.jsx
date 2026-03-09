import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { cards } from '../data/cards'
import {
  BUDGET_OPTIONS,
  EXPERIENCE_OPTIONS,
  SPORTS,
  STYLE_OPTIONS,
  TEAM_MAP,
} from '../data/preferencesConfig'

export function PreferencesPage() {
  const {
    userPreferences,
    notifications,
    theme,
    updateUserPreferences,
    updateNotifications,
    setTheme,
    showToast,
  } = useAppContext()

  const [sports, setSports] = useState(userPreferences.sports ?? [])
  const [name, setName] = useState(userPreferences.name ?? '')
  const [email, setEmail] = useState(userPreferences.email ?? '')
  const [teams, setTeams] = useState(userPreferences.teams ?? [])
  const [players, setPlayers] = useState(userPreferences.players ?? [])
  const [style, setStyle] = useState(userPreferences.style ?? [])
  const [budget, setBudget] = useState(userPreferences.budget ?? '')
  const [experience, setExperience] = useState(userPreferences.experience ?? '')
  const [playerQuery, setPlayerQuery] = useState('')
  const [priceDropAlerts, setPriceDropAlerts] = useState(notifications.priceDropAlerts)
  const [newListings, setNewListings] = useState(notifications.newListings)
  const [marketIntel, setMarketIntel] = useState(notifications.marketIntel)
  const isDark = theme !== 'light'

  const availableTeams = useMemo(() => {
    const source = sports.flatMap((sport) => TEAM_MAP[sport] ?? [])
    return [...new Set(source)]
  }, [sports])

  const allPlayers = useMemo(
    () =>
      [...new Map(cards.map((card) => [card.playerName, card.team])).entries()].map(
        ([playerName, team]) => ({
          playerName,
          team,
        }),
      ),
    [],
  )

  const playerSuggestions = useMemo(() => {
    if (!playerQuery.trim()) {
      return allPlayers.filter(({ playerName }) => !players.includes(playerName))
    }
    const query = playerQuery.toLowerCase()
    return allPlayers.filter(
      ({ playerName }) =>
        playerName.toLowerCase().includes(query) && !players.includes(playerName),
    )
  }, [allPlayers, playerQuery, players])

  const toggleValue = (value, currentValues, setter) => {
    setter(
      currentValues.includes(value)
        ? currentValues.filter((entry) => entry !== value)
        : [...currentValues, value],
    )
  }

  const savePreferences = () => {
    updateUserPreferences({
      name: name.trim(),
      email: email.trim(),
      sports,
      teams,
      players,
      style,
      budget,
      experience,
    })
    updateNotifications({
      priceDropAlerts,
      newListings,
      marketIntel,
    })
    showToast('Preferences saved ✓')
  }

  return (
    <div className="preferences-page">
      <h1>Preferences</h1>

      <section className="preferences-panel">
        <h2>Your Profile</h2>

        <div className="pref-select-row">
          <label>
            <span className="pref-label">Name</span>
            <input
              className="pref-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </label>
          <label>
            <span className="pref-label">Email</span>
            <input
              className="pref-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
        </div>

        <div className="pref-group">
          <p className="pref-label">Sports</p>
          <div className="pref-pill-wrap">
            {SPORTS.map((option) => (
              <button
                key={option}
                type="button"
                className={`pref-pill${sports.includes(option) ? ' active' : ''}`}
                onClick={() => toggleValue(option, sports, setSports)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="pref-group">
          <p className="pref-label">Favorite Teams</p>
          <div className="pref-team-grid">
            {availableTeams.map((team) => (
              <button
                key={team}
                type="button"
                className={`pref-team${teams.includes(team) ? ' active' : ''}`}
                onClick={() => toggleValue(team, teams, setTeams)}
              >
                {team}
              </button>
            ))}
          </div>
        </div>

        <div className="pref-group">
          <p className="pref-label">Favorite Players</p>
          <input
            className="pref-input"
            type="text"
            value={playerQuery}
            onChange={(event) => setPlayerQuery(event.target.value)}
            placeholder="Search players..."
          />
          {playerQuery.trim().length > 0 && playerSuggestions.length > 0 && (
            <div className="pref-player-menu">
              {playerSuggestions.slice(0, 8).map(({ playerName, team }) => (
                <button
                  key={playerName}
                  type="button"
                  onClick={() => {
                    setPlayers((prev) => [...prev, playerName])
                    setPlayerQuery('')
                  }}
                >
                  <span>{playerName}</span>
                  <span>{team}</span>
                </button>
              ))}
            </div>
          )}
          <div className="pref-chip-wrap">
            {players.map((player) => (
              <span key={player} className="pref-chip">
                {player}
                <button
                  type="button"
                  aria-label={`Remove ${player}`}
                  onClick={() =>
                    setPlayers((prev) => prev.filter((entry) => entry !== player))
                  }
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="pref-group">
          <p className="pref-label">Collecting Style</p>
          <div className="pref-pill-wrap">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`pref-pill${style.includes(option) ? ' active' : ''}`}
                onClick={() => toggleValue(option, style, setStyle)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="pref-select-row">
          <label>
            <span className="pref-label">Budget Range</span>
            <select value={budget} onChange={(event) => setBudget(event.target.value)}>
              <option value="">Select</option>
              {BUDGET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="pref-label">Experience Level</span>
            <select value={experience} onChange={(event) => setExperience(event.target.value)}>
              <option value="">Select</option>
              {EXPERIENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="preferences-panel">
        <h2>Display</h2>
        <div className="pref-toggle-row">
          <span>Dark Mode</span>
          <button
            type="button"
            className={`pref-switch${isDark ? ' on' : ''}`}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label="Toggle dark mode"
          >
            <span />
          </button>
        </div>
      </section>

      <section className="preferences-panel">
        <h2>Notifications</h2>
        <label className="pref-toggle-row">
          <span>Price drop alerts</span>
          <input
            type="checkbox"
            checked={priceDropAlerts}
            onChange={(event) => setPriceDropAlerts(event.target.checked)}
          />
        </label>
        <label className="pref-toggle-row">
          <span>New listings for watchlist cards</span>
          <input
            type="checkbox"
            checked={newListings}
            onChange={(event) => setNewListings(event.target.checked)}
          />
        </label>
        <label className="pref-toggle-row">
          <span>Market intel updates</span>
          <input
            type="checkbox"
            checked={marketIntel}
            onChange={(event) => setMarketIntel(event.target.checked)}
          />
        </label>
      </section>

      <button type="button" className="preferences-save-btn" onClick={savePreferences}>
        Save Preferences
      </button>
    </div>
  )
}
