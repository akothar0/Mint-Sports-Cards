import { Gem, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogoImage } from '../components/LogoImage'
import { useAppContext } from '../context/AppContext'
import { cards } from '../data/cards'
import {
  BUDGET_OPTIONS,
  EXPERIENCE_OPTIONS,
  SPORTS,
  STYLE_OPTIONS,
  TEAM_MAP,
} from '../data/preferencesConfig'
import { getLeagueLogo, getTeamLogo } from '../utils/logos'

const SPORT_EMOJI_MAP = {
  NBA: '🏀',
  NFL: '🏈',
  MLB: '⚾',
  Soccer: '⚽',
  Other: '🃏',
}

function ProgressDots({ step }) {
  return (
    <div className="onboarding-progress" aria-label={`Step ${step} of 4`}>
      {[1, 2, 3, 4].map((dot) => (
        <span key={dot} className={`progress-dot${dot === step ? ' active' : ''}`} />
      ))}
    </div>
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const {
    onboardingComplete,
    userPreferences,
    completeOnboarding: saveOnboarding,
    skipOnboardingWithDefaults,
  } = useAppContext()

  const [step, setStep] = useState(1)
  const [visible, setVisible] = useState(true)
  const [name, setName] = useState(userPreferences.name || 'Jordan')
  const [email, setEmail] = useState(userPreferences.email || 'Jordan@example.com')
  const [sports, setSports] = useState(userPreferences.sports)
  const [teams, setTeams] = useState(userPreferences.teams)
  const [players, setPlayers] = useState(userPreferences.players)
  const [styles, setStyles] = useState(userPreferences.style)
  const [notes, setNotes] = useState(userPreferences.notes)
  const [selectedBudget, setSelectedBudget] = useState(userPreferences.budget)
  const [selectedExperience, setSelectedExperience] = useState(userPreferences.experience)
  const [playerQuery, setPlayerQuery] = useState('')

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

  const availableTeams = useMemo(() => {
    const merged = sports.flatMap((sport) => TEAM_MAP[sport] ?? [])
    return [...new Set(merged)]
  }, [sports])

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

  if (onboardingComplete) {
    return <Navigate to="/swipe" replace />
  }

  const goToStep = (nextStep) => {
    setVisible(false)
    window.setTimeout(() => {
      setStep(nextStep)
      setVisible(true)
    }, 250)
  }

  const toggleValue = (value, currentValues, setter) => {
    setter(
      currentValues.includes(value)
        ? currentValues.filter((entry) => entry !== value)
        : [...currentValues, value],
    )
  }

  const handleSkip = () => {
    skipOnboardingWithDefaults()
    navigate('/swipe')
  }

  const isProfileValid =
    name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const completeOnboarding = () => {
    saveOnboarding({
      name: name.trim(),
      email: email.trim(),
      sports,
      teams,
      players,
      style: styles,
      notes: notes.trim(),
      budget: selectedBudget,
      experience: selectedExperience,
    })
    navigate('/swipe')
  }

  return (
    <div className={`onboarding-shell${step === 1 ? ' is-welcome' : ' is-form'}`}>
      <div className="onboarding-progress-wrap">
        <ProgressDots step={step} />
      </div>

      <div className={`onboarding-step${visible ? ' is-visible' : ''}`}>
        {step === 1 && (
          <section className="onboarding-content onboarding-welcome">
            <div className="onboarding-logo">
              <Gem size={28} />
              <span>Mint</span>
            </div>
            <h1 className="onboarding-title">Your AI-powered card discovery platform</h1>
            <p className="onboarding-subtext">
              Mint learns what you collect and surfaces the right cards at the right
              time. Let&apos;s set up your feed.
            </p>
            <div className="onboarding-profile-row">
              <input
                className="onboarding-inline-input"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
              <input
                className="onboarding-inline-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
              />
            </div>
            <button
              className="cta-button"
              type="button"
              disabled={!isProfileValid}
              onClick={() => goToStep(2)}
            >
              Get Started
            </button>
            <button
              className="text-link"
              type="button"
              disabled={!isProfileValid}
              onClick={handleSkip}
            >
              Skip Onboarding
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="onboarding-content">
            <h1 className="onboarding-title">What sports do you collect?</h1>
            <p className="onboarding-subtext">
              Select all that apply. This helps us personalize your discovery feed.
            </p>
            <div className="sport-grid">
              {SPORTS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  className={`tile-button sport-tile${
                    sports.includes(sport) ? ' selected' : ''
                  }`}
                  onClick={() => toggleValue(sport, sports, setSports)}
                >
                  {['NBA', 'NFL', 'MLB'].includes(sport) ? (
                    <LogoImage
                      src={getLeagueLogo(sport)}
                      alt={`${sport} logo`}
                      size={48}
                      className="sport-logo"
                    />
                  ) : (
                    <span className="sport-icon">{SPORT_EMOJI_MAP[sport]}</span>
                  )}
                  <span>{sport}</span>
                </button>
              ))}
            </div>
            <button className="text-link back-link" type="button" onClick={() => goToStep(1)}>
              ← Back
            </button>
            <button
              className="cta-button"
              type="button"
              disabled={sports.length === 0}
              onClick={() => goToStep(3)}
            >
              Continue
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="onboarding-content">
            <h1 className="onboarding-title">Pick your teams &amp; favorite players</h1>
            <p className="onboarding-subtext">
              We&apos;ll prioritize cards from these teams and players in your feed.
            </p>

            <div className="teams-grid">
              {availableTeams.map((team) => {
                const teamLogo = getTeamLogo(team)
                return (
                  <button
                    key={team}
                    type="button"
                    className={`tile-button team-tile${teams.includes(team) ? ' selected' : ''}`}
                    onClick={() => toggleValue(team, teams, setTeams)}
                  >
                    <span className="team-tile-content">
                      {teamLogo ? (
                        <LogoImage
                          src={teamLogo}
                          alt={`${team} logo`}
                          size={36}
                          className="team-tile-logo"
                        />
                      ) : null}
                      <span className={`team-tile-name${!teamLogo ? ' fallback' : ''}`}>{team}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="player-picker">
              <label htmlFor="player-search" className="sr-only">
                Search players to follow
              </label>
              <input
                id="player-search"
                className="player-input"
                type="text"
                value={playerQuery}
                onChange={(event) => setPlayerQuery(event.target.value)}
                placeholder="Search players to follow..."
              />
              {playerQuery.trim().length > 0 && playerSuggestions.length > 0 && (
                <div className="player-dropdown">
                  {playerSuggestions.slice(0, 8).map(({ playerName, team }) => (
                    <button
                      key={playerName}
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setPlayers((prev) => [...prev, playerName])
                        setPlayerQuery('')
                      }}
                    >
                      <span>{playerName}</span>
                      <span className="dropdown-team">{team}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="chip-wrap">
                {players.map((player) => (
                  <span key={player} className="chip">
                    {player}
                    <button
                      type="button"
                      className="chip-x"
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

            <button className="text-link back-link" type="button" onClick={() => goToStep(2)}>
              ← Back
            </button>
            <button className="cta-button" type="button" onClick={() => goToStep(4)}>
              Continue
            </button>
          </section>
        )}

        {step === 4 && (
          <section className="onboarding-content">
            <h1 className="onboarding-title">What&apos;s your collecting style?</h1>
            <p className="onboarding-subtext">
              This helps our AI surface cards that match your interests.
            </p>

            <div className="pill-wrap">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`pill-button${styles.includes(style) ? ' selected' : ''}`}
                  onClick={() => toggleValue(style, styles, setStyles)}
                >
                  {style}
                </button>
              ))}
            </div>

            <div className="form-divider" />

            <div className="single-choice">
              <p className="choice-label">Monthly budget</p>
              <div className="pill-wrap compact">
                {BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`pill-button compact${selectedBudget === option ? ' selected' : ''}`}
                    onClick={() => setSelectedBudget(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="single-choice">
              <p className="choice-label">Experience level</p>
              <div className="pill-wrap compact">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`pill-button compact${
                      selectedExperience === option ? ' selected' : ''
                    }`}
                    onClick={() => setSelectedExperience(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="single-choice notes-field">
              <label htmlFor="collecting-notes" className="choice-label">
                Or tell us what you are collecting
              </label>
              <textarea
                id="collecting-notes"
                className="collecting-notes-input"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="I'm looking for Luka rookies and vintage wax packs..."
              />
            </div>

            <button className="text-link back-link" type="button" onClick={() => goToStep(3)}>
              ← Back
            </button>
            <button className="cta-button" type="button" onClick={completeOnboarding}>
              Start Discovering →
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
