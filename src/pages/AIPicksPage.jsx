import { ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogoImage } from '../components/LogoImage'
import { useAppContext } from '../context/AppContext'
import { cards } from '../data/cards'
import { userPreferences } from '../data/userPreferences'
import { getTeamLogo } from '../utils/logos'

function parseQuery(query) {
  const text = query.toLowerCase()
  const parsed = {
    sports: [],
    maxPrice: null,
    cardTypes: [],
    setKeywords: [],
    players: [],
    cheap: false,
    expensive: false,
  }

  ;['nba', 'nfl', 'mlb', 'soccer'].forEach((sport) => {
    if (text.includes(sport)) parsed.sports.push(sport.toUpperCase())
  })

  const priceMatch = text.match(/under\s*\$?\s*(\d{2,5})/)
  if (priceMatch) parsed.maxPrice = Number.parseInt(priceMatch[1], 10)
  if (text.includes('cheap') || text.includes('budget') || text.includes('undervalued')) {
    parsed.cheap = true
  }
  if (text.includes('expensive') || text.includes('high-end') || text.includes('premium')) {
    parsed.expensive = true
  }

  ;['rookie', 'vintage', 'parallel', 'insert', 'graded', 'numbered', 'prizm', 'optic', 'mosaic'].forEach(
    (term) => {
      if (text.includes(term)) {
        if (['prizm', 'optic', 'mosaic'].includes(term)) {
          parsed.setKeywords.push(term)
        } else {
          parsed.cardTypes.push(term)
        }
      }
    },
  )

  cards.forEach((card) => {
    const playerLower = card.playerName.toLowerCase()
    const lastName = playerLower.split(' ').at(-1)
    if (text.includes(playerLower) || (lastName && text.includes(lastName))) {
      parsed.players.push(card.playerName)
    }
  })

  parsed.players = [...new Set(parsed.players)]
  return parsed
}

function cardMatchesParsed(card, parsed) {
  const tagText = card.tags.join(' ').toLowerCase()
  const knowledgeLabels = (card.cardKnowledge ?? []).map((badge) => badge.label.toLowerCase())

  if (parsed.sports.length > 0 && !parsed.sports.includes(card.sport)) return false
  if (parsed.maxPrice !== null && card.currentPrice > parsed.maxPrice) return false
  if (parsed.cheap && card.currentPrice > 120) return false
  if (parsed.expensive && card.currentPrice < 200) return false
  if (parsed.players.length > 0 && !parsed.players.includes(card.playerName)) return false

  if (
    parsed.setKeywords.length > 0 &&
    !parsed.setKeywords.some((keyword) => card.set.toLowerCase().includes(keyword))
  ) {
    return false
  }

  if (parsed.cardTypes.length > 0) {
    const typeMatch = parsed.cardTypes.every((type) => {
      if (type === 'rookie') return tagText.includes('rookie')
      if (type === 'vintage') return card.year < 2000 || tagText.includes('vintage')
      if (type === 'parallel') return tagText.includes('parallel')
      if (type === 'insert') return tagText.includes('insert')
      if (type === 'graded') return /psa|bgs|sgc/i.test(card.condition)
      if (type === 'numbered') return tagText.includes('numbered') || knowledgeLabels.some((label) => label.includes('/'))
      return true
    })
    if (!typeMatch) return false
  }

  return true
}

function buildQueryResponse(query, parsed, resultCount, fallback = false) {
  const terms = []
  if (parsed.sports.length > 0) terms.push(parsed.sports.join('/'))
  if (parsed.maxPrice !== null) terms.push(`under $${parsed.maxPrice}`)
  if (parsed.cardTypes.length > 0) terms.push(parsed.cardTypes.join(', '))
  if (parsed.setKeywords.length > 0) terms.push(parsed.setKeywords.join(', '))
  if (parsed.players.length > 0) terms.push(parsed.players.slice(0, 2).join(' & '))
  const termText = terms.length > 0 ? terms.join(' · ') : query

  if (fallback) {
    return `I couldn't find exact matches for "${query}", so I prioritized momentum and fit with your profile. These cards align with your interests and still capture similar market themes to ${termText}.`
  }

  return `Based on your interest in ${termText}, here are ${resultCount} cards that match this dataset snapshot. I prioritized liquidity, recent movement, and card-type relevance so these picks are both collectible and actionable.`
}

export function AIPicksPage() {
  const navigate = useNavigate()
  const { collection } = useAppContext()
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const dateText = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [],
  )

  const datasetSnapshotLabel = 'Feb 28, 2025'

  const trendingCards = useMemo(
    () => [...cards].sort((a, b) => b.priceChange30d - a.priceChange30d).slice(0, 6),
    [],
  )

  const priceDropCards = useMemo(
    () => [...cards].filter((card) => card.priceChange30d < 0).sort((a, b) => a.priceChange30d - b.priceChange30d).slice(0, 6),
    [],
  )

  const newSetCards = useMemo(
    () =>
      cards
        .filter((card) => card.set.includes('2024') || card.year === 2024)
        .sort((a, b) => b.priceChange30d - a.priceChange30d)
        .slice(0, 6),
    [],
  )

  const collectionSetSuggestions = useMemo(() => {
    if (collection.length === 0) return []
    const owned = new Set(collection.map((entry) => entry.cardId))

    const grouped = new Map()
    cards.forEach((card) => {
      const key = card.setInfo?.setKey
      if (!key) return
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(card)
    })

    const recommendations = []
    grouped.forEach((setCards) => {
      const ownedCards = setCards.filter((card) => owned.has(card.id))
      if (ownedCards.length === 0 || ownedCards.length === setCards.length) return

      setCards
        .filter((card) => !owned.has(card.id))
        .slice(0, 2)
        .forEach((card) => {
          recommendations.push({
            ...card,
            completionNote: `Completes your ${card.setInfo?.setName ?? card.set} run`,
          })
        })
    })

    return recommendations.slice(0, 6)
  }, [collection])

  const queryResults = useMemo(() => {
    if (!submittedQuery.trim()) return null
    const parsed = parseQuery(submittedQuery)
    const matched = cards
      .filter((card) => cardMatchesParsed(card, parsed))
      .sort((a, b) => b.priceChange30d - a.priceChange30d)
      .slice(0, 6)

    if (matched.length === 0) {
      return {
        cards: trendingCards.slice(0, 6),
        response: buildQueryResponse(submittedQuery, parsed, 6, true),
        fallback: true,
      }
    }

    return {
      cards: matched,
      response: buildQueryResponse(submittedQuery, parsed, matched.length, false),
      fallback: false,
    }
  }, [submittedQuery, trendingCards])

  const submitQuery = (event) => {
    event.preventDefault()
    if (!query.trim()) return
    setSubmittedQuery(query.trim())
  }

  const sportSubtext = `Cards gaining momentum across the full ${cards.length}-card market this week`

  return (
    <div className="ai-picks-page">
      <section className="ai-greeting">
        <h1>
          Good morning, <span>{userPreferences.name}</span>. Here&apos;s what I&apos;m watching for you
          today.
        </h1>
        <p>{dateText}</p>
      </section>

      <form className="ai-query-form" onSubmit={submitQuery}>
        <label htmlFor="ai-query" className="sr-only">
          Ask AI what cards you are looking for
        </label>
        <Sparkles size={16} className="ai-query-icon" />
        <input
          id="ai-query"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tell me what you're looking for... (e.g., 'undervalued NBA rookies under $100' or 'best Prizm parallels to invest in')"
        />
        <button type="submit">Search</button>
      </form>

      {queryResults && (
        <section className="ai-query-results">
          <h2>{`✨ Results for '${submittedQuery}'`}</h2>
          <HorizontalSection
            title=""
            subtext=""
            cards={queryResults.cards}
            onCardClick={(id) => navigate(`/card/${id}`, { state: { fromNav: '/ai-picks' } })}
            hideHeader
          />
          <p className="ai-query-copy">{queryResults.response}</p>
          {queryResults.fallback && (
            <p className="ai-query-fallback">
              I couldn&apos;t find exact matches, but here are some cards you might like based on your
              profile.
            </p>
          )}
        </section>
      )}

      <HorizontalSection
        title="🔥 Trending in Your Interests"
        subtext={sportSubtext}
        cards={trendingCards}
        ranked
        onCardClick={(id) => navigate(`/card/${id}`, { state: { fromNav: '/ai-picks' } })}
      />

      <HorizontalSection
        title="💰 Price Drops"
        subtext="Cards with the largest recent pullbacks across the market"
        cards={priceDropCards}
        onCardClick={(id) => navigate(`/card/${id}`, { state: { fromNav: '/ai-picks' } })}
      />

      <HorizontalSection
        title="🆕 New Set Drop: 2024 Topps & Mosaic"
        subtext="Fresh 2024 releases with active collector momentum."
        cards={newSetCards}
        aiPick
        onCardClick={(id) => navigate(`/card/${id}`, { state: { fromNav: '/ai-picks' } })}
      />

      <section className="market-intel-panel">
        <div className="market-intel-head">✨ AI-Generated</div>
        <p className="market-intel-updated">{`Dataset snapshot: ${datasetSnapshotLabel}`}</p>
        <h2>📊 Market Intel</h2>
        <p>
          Across this 50-card universe, NBA rookies and modern inserts are driving the strongest
          short-term velocity, with top movers clustering in Prizm and Optic products. Depth has
          improved in the under-$150 segment, where liquidity is highest and buy/sell spreads are
          tighter.
        </p>
        <p>
          NFL momentum remains selective rather than broad: premium rookies and high-visibility
          quarterbacks are still leading while veteran base cards are mostly range-bound. This
          market structure favors targeted entries instead of broad exposure.
        </p>
        <p>
          In MLB, 2024 Topps/Chrome cards are acting as steady volume anchors. If your goal is
          portfolio stability, mixing one to two liquid modern cards with a higher-upside rookie
          insert remains the most balanced approach.
        </p>
      </section>

      {collection.length > 0 ? (
        <HorizontalSection
          title="🎯 Complete Your Sets"
          subtext="Cards that would fill gaps in your collection"
          cards={collectionSetSuggestions}
          notesById={Object.fromEntries(collectionSetSuggestions.map((card) => [card.id, card.completionNote]))}
          onCardClick={(id) => navigate(`/card/${id}`, { state: { fromNav: '/ai-picks' } })}
        />
      ) : (
        <section className="ai-section">
          <h2>🎯 Complete Your Sets</h2>
          <p>Add cards to your collection to get set completion recommendations.</p>
        </section>
      )}
    </div>
  )
}

function HorizontalSection({
  title,
  subtext,
  cards,
  onCardClick,
  aiPick = false,
  notesById = null,
  ranked = false,
  hideHeader = false,
}) {
  const rowRef = useRef(null)

  const scrollByAmount = (amount) => {
    if (!rowRef.current) return
    rowRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="ai-section">
      {!hideHeader && (
        <>
          <h2>{title}</h2>
          <p>{subtext}</p>
        </>
      )}
      <div className="ai-row-wrap">
        <button
          type="button"
          className="row-arrow left"
          aria-label="Scroll cards left"
          onClick={() => scrollByAmount(-360)}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="ai-row" ref={rowRef}>
          {cards.map((card, index) => {
            const up = card.priceChange30d >= 0
            const teamLogo = getTeamLogo(card.team)
            return (
              <article
                key={card.id}
                className="ai-card-tile"
                onClick={() => onCardClick(card.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onCardClick(card.id)
                }}
              >
                {aiPick && <span className="ai-pick-badge">AI Pick</span>}
                {ranked && <span className="ai-rank-badge">{`#${index + 1}`}</span>}
                <div className="ai-card-image-wrap">
                  <img src={card.image} alt={`${card.playerName} — ${card.set} ${card.parallel}`} />
                  {teamLogo && (
                    <span className="card-team-logo-overlay" aria-hidden="true">
                      <LogoImage
                        src={teamLogo}
                        alt={`${card.team} logo`}
                        size={18}
                      />
                    </span>
                  )}
                </div>
                <div className="ai-card-body">
                  <p className="ai-player">{card.playerName}</p>
                  <p className="ai-price font-number">{`$${card.currentPrice}`}</p>
                  <span className={`ai-trend ${up ? 'up' : 'down'}`}>
                    {`${up ? '↑' : '↓'} ${Math.abs(card.priceChange30d).toFixed(1)}%`}
                  </span>
                  {notesById?.[card.id] && <p className="ai-note">{notesById[card.id]}</p>}
                </div>
              </article>
            )
          })}
        </div>
        <button
          type="button"
          className="row-arrow right"
          aria-label="Scroll cards right"
          onClick={() => scrollByAmount(360)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  )
}
