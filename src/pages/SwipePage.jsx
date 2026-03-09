import {
  ArrowUpRight,
  DollarSign,
  Heart,
  RotateCw,
  Shield,
  Star,
  TrendingUp,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { useNavigate } from 'react-router-dom'
import { LogoImage } from '../components/LogoImage'
import { useAppContext } from '../context/AppContext'
import { cards } from '../data/cards'
import { getLeagueLogo, getTeamLogo } from '../utils/logos'

const SPORT_FILTERS = ['NBA', 'NFL', 'MLB']
const CATEGORY_FILTERS = ['Rookies', 'Trending', 'Under $100', 'Graded Only']
const HIGH_SIGNAL_TYPES = new Set(['rookie', 'numbered', 'vintage', 'graded', 'insert'])

const FILTER_ICON_MAP = {
  Rookies: Star,
  Trending: TrendingUp,
  'Under $100': DollarSign,
  'Graded Only': Shield,
}

function getFirstSentence(text = '') {
  const match = text.trim().match(/^.*?[.!?](?:\s|$)/)
  return match ? match[0].trim() : text.trim()
}

function isRookieCard(card) {
  return card.tags.some((tag) => tag.toLowerCase().includes('rookie'))
}

function isGradedCard(card) {
  const normalized = card.condition.toLowerCase()
  return normalized.includes('psa') || normalized.includes('bgs') || normalized.includes('sgc')
}

function matchesFilters(card, selectedFilters) {
  if (selectedFilters.length === 0) {
    return true
  }

  const activeSports = selectedFilters.filter((filter) => SPORT_FILTERS.includes(filter))
  const activeCategories = selectedFilters.filter((filter) =>
    CATEGORY_FILTERS.includes(filter),
  )

  const sportMatch = activeSports.length === 0 || activeSports.includes(card.sport)

  const categoryMatch = activeCategories.every((filter) => {
    if (filter === 'Rookies') {
      return isRookieCard(card)
    }
    if (filter === 'Trending') {
      return card.priceChange30d > 5
    }
    if (filter === 'Under $100') {
      return card.currentPrice < 100
    }
    if (filter === 'Graded Only') {
      return isGradedCard(card)
    }
    return true
  })

  return sportMatch && categoryMatch
}

export function SwipePage() {
  const navigate = useNavigate()
  const { addToWatchlist } = useAppContext()

  const [selectedFilters, setSelectedFilters] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardStage, setCardStage] = useState('idle')
  const [isAnimating, setIsAnimating] = useState(false)
  const [showBackImage, setShowBackImage] = useState(false)
  const [showFullInsight, setShowFullInsight] = useState(false)

  const filteredCards = useMemo(
    () => cards.filter((card) => matchesFilters(card, selectedFilters)),
    [selectedFilters],
  )

  const currentCard = filteredCards[currentIndex]
  const hasBackImage = Boolean(currentCard?.imageBack)

  const advanceCard = useCallback(() => {
    if (filteredCards.length === 0) {
      return
    }
    setShowBackImage(false)
    setShowFullInsight(false)
    setCardStage('incoming')
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length)
    window.setTimeout(() => setCardStage('idle'), 220)
  }, [filteredCards.length])

  const dismissCard = useCallback(
    (direction) => {
      if (!currentCard || isAnimating) {
        return
      }

      setIsAnimating(true)
      setCardStage(`out-${direction}`)

      window.setTimeout(() => {
        if (direction === 'right') {
          addToWatchlist(currentCard.id)
          advanceCard()
        } else if (direction === 'left') {
          advanceCard()
        } else {
          navigate(`/card/${currentCard.id}`, { state: { fromNav: '/swipe' } })
          setCardStage('idle')
        }

        setIsAnimating(false)
      }, 260)
    },
    [addToWatchlist, advanceCard, currentCard, isAnimating, navigate],
  )

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        dismissCard('left')
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        dismissCard('right')
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        dismissCard('up')
      } else if (event.key === 'Enter' && hasBackImage) {
        event.preventDefault()
        setShowBackImage((prev) => !prev)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dismissCard, hasBackImage])

  const imageHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (hasBackImage) {
        setShowBackImage(true)
      }
    },
    onSwipedRight: () => {
      if (hasBackImage) {
        setShowBackImage(false)
      }
    },
    onSwipedUp: () => dismissCard('up'),
    trackMouse: true,
    preventScrollOnSwipe: true,
    delta: 28,
    stopPropagation: true,
  })

  const toggleFilter = (filter) => {
    setShowBackImage(false)
    setShowFullInsight(false)
    setCardStage('incoming')
    setCurrentIndex(0)
    setSelectedFilters((prev) =>
      prev.includes(filter) ? prev.filter((entry) => entry !== filter) : [...prev, filter],
    )
    window.setTimeout(() => setCardStage('idle'), 220)
  }

  if (!currentCard) {
    return (
      <div className="swipe-page">
        <div className="swipe-empty">
          <h2>No cards match your filters</h2>
          <p>Try removing a filter pill to widen your discovery feed.</p>
        </div>
      </div>
    )
  }

  const isPositive = currentCard.priceChange30d >= 0
  const teamLogo = getTeamLogo(currentCard.team)
  const priceRangeLow = currentCard.priceLow30d
  const priceRangeHigh = currentCard.priceHigh30d
  const rangeSpan = priceRangeHigh - priceRangeLow
  const rangePosition =
    rangeSpan === 0
      ? 1
      : Math.max(0, Math.min(1, (currentCard.currentPrice - priceRangeLow) / rangeSpan))

  const highSignalBadges = (currentCard.cardKnowledge ?? [])
    .filter((badge) => HIGH_SIGNAL_TYPES.has(badge.type))
    .filter((badge, index, self) => self.findIndex((b) => b.label === badge.label && b.type === badge.type) === index)

  const insightCollapsedText = getFirstSentence(currentCard.aiInsight)
  const insightText = showFullInsight ? currentCard.aiInsight : insightCollapsedText

  return (
    <div className="swipe-page">
      <div className="swipe-filter-bar swipe-filter-top">
        {[...SPORT_FILTERS, ...CATEGORY_FILTERS].map((filter) => {
          const FilterIcon = FILTER_ICON_MAP[filter]
          return (
            <button
              key={filter}
              type="button"
              className={`filter-pill${selectedFilters.includes(filter) ? ' active' : ''}`}
              onClick={() => toggleFilter(filter)}
            >
              <span className="filter-pill-content">
                {SPORT_FILTERS.includes(filter) ? (
                  <LogoImage
                    src={getLeagueLogo(filter)}
                    alt={`${filter} logo`}
                    size={16}
                    className="filter-pill-logo"
                  />
                ) : (
                  FilterIcon && <FilterIcon size={14} className="filter-pill-icon" />
                )}
                <span>{filter}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="swipe-grid">
        <section className="swipe-left-column">
          <div className={`swipe-card-shell ${cardStage}`}>
            <div className="swipe-card-glow" />
            <div {...imageHandlers} className="swipe-image-stage">
              {hasBackImage ? (
                <div className={`swipe-flip-card${showBackImage ? ' flipped' : ''}`}>
                  <div className="swipe-flip-face front">
                    <img
                      src={currentCard.image}
                      alt={`${currentCard.playerName} — ${currentCard.set} ${currentCard.parallel} front`}
                      className="swipe-card-image"
                    />
                  </div>
                  <div className="swipe-flip-face back">
                    <img
                      src={currentCard.imageBack ?? currentCard.image}
                      alt={`${currentCard.playerName} — ${currentCard.set} ${currentCard.parallel} back`}
                      className="swipe-card-image"
                    />
                  </div>
                </div>
              ) : (
                <img
                  src={currentCard.image}
                  alt={`${currentCard.playerName} — ${currentCard.set} ${currentCard.parallel}`}
                  className="swipe-card-image"
                />
              )}
            </div>
            {hasBackImage && (
              <button
                type="button"
                className="swipe-flip-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  setShowBackImage((prev) => !prev)
                }}
                aria-label={showBackImage ? 'Show front image' : 'Show back image'}
              >
                <RotateCw size={14} />
                <span>Flip</span>
              </button>
            )}
          </div>

          <div className="swipe-actions">
            <div className="swipe-action-dismiss">
              <button
                type="button"
                className="action-btn muted"
                aria-label="Pass card"
                onClick={() => dismissCard('left')}
              >
                <X size={16} />
                Pass
              </button>
            </div>
            <div className="swipe-action-divider" />
            <div className="swipe-action-primary">
              <button
                type="button"
                className="action-btn outlined"
                aria-label="Add card to watchlist"
                onClick={() => dismissCard('right')}
              >
                <Heart size={16} />
                Watchlist
              </button>
              <button
                type="button"
                className="action-btn accent"
                aria-label="Browse card listings"
                onClick={() => dismissCard('up')}
              >
                <ArrowUpRight size={16} />
                Browse Listings
              </button>
            </div>
          </div>
        </section>

        <aside className="swipe-right-column">
          <div className="swipe-panel">
            <div className="card-meta">
              <div className="card-meta-header">
                <div className="card-meta-text">
                  <h2>{currentCard.playerName}</h2>
                  <p className="card-meta-team">{currentCard.team}</p>
                  <p className="card-meta-set">{`${currentCard.set} · ${currentCard.parallel}`}</p>
                </div>
                {teamLogo && (
                  <LogoImage
                    src={teamLogo}
                    alt={`${currentCard.team} logo`}
                    size={48}
                    className="card-meta-team-logo"
                  />
                )}
              </div>
            </div>

            {highSignalBadges.length > 0 && (
              <div className="knowledge-badges">
                {highSignalBadges.map((badge, index) => (
                  <button
                    key={`${badge.label}-${index}`}
                    type="button"
                    className={`knowledge-badge ${badge.type}`}
                  >
                    <strong>{badge.label}</strong>
                    <span className="knowledge-tooltip">{badge.description}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="quick-stats">
              <div className="quick-stats-head">
                <p className="price-value font-number">{`$${currentCard.currentPrice}`}</p>
                <p className={`change-value ${isPositive ? 'positive' : 'negative'}`}>
                  {`${isPositive ? '↑' : '↓'} ${Math.abs(currentCard.priceChange30d)}%`}
                </p>
              </div>
              <div className="swipe-stats-grid">
                <div className="swipe-stat-cell">
                  <p className="swipe-stat-label">PSA 10 POP</p>
                  <p className="swipe-stat-value font-number">{currentCard.psaPop['10'].toLocaleString()}</p>
                </div>
                <div className="swipe-stat-cell">
                  <p className="swipe-stat-label">MEDIAN</p>
                  <p className="swipe-stat-value font-number">{`$${currentCard.priceMedian30d}`}</p>
                </div>
                <div className="swipe-stat-cell">
                  <p className="swipe-stat-label">30D RANGE</p>
                  <p className="swipe-stat-value font-number">{`$${priceRangeLow} - $${priceRangeHigh}`}</p>
                </div>
              </div>
              <div className="swipe-range-wrap">
                <div className="swipe-range-bar" role="img" aria-label="30 day price range">
                  <span
                    className="swipe-range-fill"
                    style={{ width: `${rangePosition * 100}%` }}
                  />
                  <span
                    className="swipe-range-dot"
                    style={{ left: `${rangePosition * 100}%` }}
                  />
                </div>
                <div className="swipe-range-axis">
                  <span>{`$${priceRangeLow}`}</span>
                  <span>{`$${priceRangeHigh}`}</span>
                </div>
              </div>
            </div>

            <h3 className="swipe-ai-title">✨ Why This Card</h3>
            <div className="ai-insight-box">
              <p className={`swipe-ai-copy ${showFullInsight ? 'expanded' : 'collapsed'}`}>
                {insightText}
              </p>
              <button
                type="button"
                className="swipe-ai-toggle"
                onClick={() => setShowFullInsight((prev) => !prev)}
              >
                {showFullInsight ? 'Show less' : 'Read more →'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
