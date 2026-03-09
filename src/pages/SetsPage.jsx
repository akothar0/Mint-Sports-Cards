import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogoImage } from '../components/LogoImage'
import { useAppContext } from '../context/AppContext'
import { cards } from '../data/cards'
import { getLeagueLogo } from '../utils/logos'

const SORT_OPTIONS = ['Most Complete', 'Most Valuable', 'Alphabetical']
const SPORT_FILTERS = ['All', 'NBA', 'NFL', 'MLB']

export function SetsPage() {
  const navigate = useNavigate()
  const { collection } = useAppContext()
  const [sortBy, setSortBy] = useState('Most Complete')
  const [sportFilter, setSportFilter] = useState('All')

  const collectionById = useMemo(
    () => new Map(collection.map((entry) => [entry.cardId, entry])),
    [collection],
  )

  const groupedSets = useMemo(() => {
    const grouped = new Map()
    cards.forEach((card) => {
      const key = card.setInfo?.setKey
      if (!key) return
      if (!grouped.has(key)) {
        grouped.set(key, {
          setKey: key,
          setName: card.setInfo.setName,
          sport: card.sport,
          cards: [],
        })
      }
      grouped.get(key).cards.push(card)
    })

    return [...grouped.values()].map((group) => {
      const sortedCards = [...group.cards].sort((a, b) => {
        const left = Number.parseInt(String(a.id).replace('card-', ''), 10)
        const right = Number.parseInt(String(b.id).replace('card-', ''), 10)
        return left - right
      })
      const ownedCards = sortedCards.filter((card) => collectionById.has(card.id))
      const ownedCount = ownedCards.length
      const totalCount = sortedCards.length
      const completionPct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0
      const setValue = ownedCards.reduce((sum, card) => sum + card.currentPrice, 0)
      const missingValue = sortedCards
        .filter((card) => !collectionById.has(card.id))
        .reduce((sum, card) => sum + card.currentPrice, 0)

      return {
        ...group,
        cards: sortedCards,
        ownedIds: new Set(ownedCards.map((card) => card.id)),
        ownedCount,
        totalCount,
        completionPct,
        setValue,
        missingValue,
      }
    })
  }, [collectionById])

  const visibleSets = useMemo(() => {
    const filtered = groupedSets.filter((setGroup) => setGroup.ownedCount > 0)
    const bySport =
      sportFilter === 'All'
        ? filtered
        : filtered.filter((setGroup) => setGroup.sport === sportFilter)

    const sorted = [...bySport]
    if (sortBy === 'Most Valuable') {
      sorted.sort((a, b) => b.setValue - a.setValue)
    } else if (sortBy === 'Alphabetical') {
      sorted.sort((a, b) => a.setName.localeCompare(b.setName))
    } else {
      sorted.sort((a, b) => b.completionPct - a.completionPct || b.ownedCount - a.ownedCount)
    }
    return sorted
  }, [groupedSets, sortBy, sportFilter])

  if (collection.length === 0) {
    return (
      <div className="sets-page">
        <header className="sets-page-head">
          <h1>Sets</h1>
          <p>Track your progress across card sets</p>
        </header>
        <section className="sets-empty-state">
          <h2>Start a set by adding cards to your collection</h2>
          <Link to="/explore" className="sets-empty-cta">
            Browse Cards →
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="sets-page">
      <header className="sets-page-head">
        <h1>Sets</h1>
        <p>Track your progress across card sets</p>
      </header>

      <section className="sets-toolbar">
        <label className="sets-sort-control">
          <span>Sort By</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="sets-filter-pills">
          {SPORT_FILTERS.map((sport) => (
            <button
              key={sport}
              type="button"
              className={`sets-filter-pill${sportFilter === sport ? ' active' : ''}`}
              onClick={() => setSportFilter(sport)}
            >
              {sport}
            </button>
          ))}
        </div>
      </section>

      <section className="sets-grid">
        {visibleSets.map((setGroup) => (
          <article
            key={setGroup.setKey}
            className={`set-tracker-card${setGroup.completionPct >= 75 ? ' almost-complete' : ''}`}
          >
            <div className="set-tracker-header">
              <div className="set-tracker-name">
                <LogoImage
                  src={getLeagueLogo(setGroup.sport)}
                  alt={`${setGroup.sport} logo`}
                  size={24}
                />
                <h2>{setGroup.setName}</h2>
                {setGroup.completionPct >= 75 && (
                  <span className="set-almost-badge">Almost Complete!</span>
                )}
              </div>
              <p className="set-count">{`${setGroup.ownedCount} of ${setGroup.totalCount}`}</p>
            </div>

            <div className="set-progress-row">
              <div className="set-progress-track">
                <div
                  className="set-progress-fill"
                  style={{ width: `${setGroup.completionPct}%` }}
                />
              </div>
              <span className="set-progress-pct">{`${setGroup.completionPct}%`}</span>
            </div>

            <div className="set-thumbnails">
              {setGroup.cards.map((setCard) => {
                const owned = setGroup.ownedIds.has(setCard.id)
                return (
                  <button
                    key={setCard.id}
                    type="button"
                    className={`set-tracker-thumb${owned ? ' owned' : ' missing'}`}
                    onClick={() => navigate(`/card/${setCard.id}`, { state: { fromNav: '/sets' } })}
                    aria-label={`${owned ? 'Owned' : 'Missing'} ${setCard.playerName}`}
                  >
                    <img
                      src={setCard.image}
                      alt={`${setCard.playerName} — ${setCard.set} ${setCard.parallel}`}
                    />
                    {!owned && <span className="set-missing-plus">+</span>}
                  </button>
                )
              })}
            </div>

            <div className="set-value-row">
              <p>{`Set Value: $${Math.round(setGroup.setValue).toLocaleString()}`}</p>
              <p>{`Missing cards value: ~$${Math.round(setGroup.missingValue).toLocaleString()}`}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
