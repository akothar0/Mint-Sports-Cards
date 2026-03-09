import {
  Calendar,
  Check,
  ChevronDown,
  DollarSign,
  Heart,
  Layers,
  Search,
  Shield,
  Trophy,
} from 'lucide-react'
import { createElement, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogoImage } from '../components/LogoImage'
import { useAppContext } from '../context/AppContext'
import { cards } from '../data/cards'
import { getLeagueLogo, getTeamLogo } from '../utils/logos'

const SET_OPTIONS = [
  'Prizm',
  'Optic',
  'Mosaic',
  'Select',
  'Topps Chrome',
  'Donruss',
  'Upper Deck',
  'Fleer',
]

const SPORT_OPTIONS = ['NBA', 'NFL', 'MLB', 'Soccer']
const YEAR_OPTIONS = ['2024', '2023', '2022', '2021', 'Vintage']
const PRICE_RANGE_OPTIONS = ['Under $50', '$50-$150', '$150-$500', '$500+']
const GRADED_OPTIONS = ['All', 'Raw Only', 'Graded Only']
const SORT_OPTIONS = [
  'Trending',
  'Price: Low → High',
  'Price: High → Low',
  'Recently Listed',
  'Biggest Movers',
]

function isGradedCard(card) {
  const condition = card.condition.toLowerCase()
  return condition.includes('psa') || condition.includes('bgs') || condition.includes('sgc')
}

function matchesPriceRange(card, range) {
  if (range === 'All' || range === 'Any') return true
  if (range === 'Under $50') return card.currentPrice < 50
  if (range === '$50-$150') return card.currentPrice >= 50 && card.currentPrice <= 150
  if (range === '$150-$500') return card.currentPrice >= 150 && card.currentPrice <= 500
  if (range === '$500+') return card.currentPrice >= 500
  return true
}

function formatMultiLabel(defaultLabel, selections) {
  if (selections.length === 0) return defaultLabel
  if (selections.length === 1) return selections[0]
  return `${selections[0]} +${selections.length - 1}`
}

function MultiFilterChip({
  label,
  values,
  options,
  isOpen,
  onToggle,
  onChange,
  onClear,
  icon,
  iconOverride = null,
}) {
  const displayLabel = formatMultiLabel(label, values)

  return (
    <div className="filter-chip-wrap">
      <div className={`filter-chip${values.length > 0 ? ' active' : ''}`}>
        <button
          type="button"
          className="filter-chip-main"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          {iconOverride ?? (icon ? createElement(icon, { size: 14 }) : null)}
          <span className="filter-chip-text">{displayLabel}</span>
          <ChevronDown size={13} className={`filter-chip-caret${isOpen ? ' open' : ''}`} />
        </button>
        {values.length > 0 && (
          <button
            type="button"
            className="filter-chip-clear"
            onClick={(event) => {
              event.stopPropagation()
              onClear()
            }}
            aria-label={`Clear ${label}`}
          >
            ✕
          </button>
        )}
      </div>
      {isOpen && (
        <div className="filter-popover">
          {options.map((option) => {
            const selected = values.includes(option)
            return (
              <button
                type="button"
                key={option}
                className={`filter-option multi${selected ? ' active' : ''}`}
                onClick={() => onChange(option)}
              >
                <span>{option}</span>
                {selected && <Check size={13} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SingleFilterChip({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
  onClear,
  isActive,
  icon,
}) {
  const displayLabel = isActive ? value : label

  return (
    <div className="filter-chip-wrap">
      <div className={`filter-chip${isActive ? ' active' : ''}`}>
        <button
          type="button"
          className="filter-chip-main"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          {icon ? createElement(icon, { size: 14 }) : null}
          <span className="filter-chip-text">{displayLabel}</span>
          <ChevronDown size={13} className={`filter-chip-caret${isOpen ? ' open' : ''}`} />
        </button>
        {isActive && (
          <button
            type="button"
            className="filter-chip-clear"
            onClick={(event) => {
              event.stopPropagation()
              onClear()
            }}
            aria-label={`Clear ${label}`}
          >
            ✕
          </button>
        )}
      </div>
      {isOpen && (
        <div className="filter-popover">
          {options.map((option) => (
            <button
              type="button"
              key={option}
              className={`filter-option${option === value ? ' active' : ''}`}
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ExplorePage() {
  const navigate = useNavigate()
  const {
    addToWatchlist,
    removeFromWatchlist,
    isOnWatchlist,
    isInCollection,
    showToast,
  } = useAppContext()

  const [search, setSearch] = useState('')
  const [openFilter, setOpenFilter] = useState(null)
  const [sports, setSports] = useState([])
  const [setFilters, setSetFilters] = useState([])
  const [years, setYears] = useState([])
  const [priceRange, setPriceRange] = useState('Any')
  const [graded, setGraded] = useState('All')
  const [sortBy, setSortBy] = useState('Trending')

  useEffect(() => {
    const onWindowClick = () => setOpenFilter(null)
    window.addEventListener('click', onWindowClick)
    return () => window.removeEventListener('click', onWindowClick)
  }, [])

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase()

    const result = cards.filter((card) => {
      const searchMatch =
        query.length === 0 ||
        card.playerName.toLowerCase().includes(query) ||
        card.team.toLowerCase().includes(query) ||
        card.set.toLowerCase().includes(query) ||
        card.parallel.toLowerCase().includes(query) ||
        card.tags.join(' ').toLowerCase().includes(query)

      const sportMatch = sports.length === 0 || sports.includes(card.sport)
      const setMatch =
        setFilters.length === 0 ||
        setFilters.some((entry) => card.set.toLowerCase().includes(entry.toLowerCase()))
      const yearMatch =
        years.length === 0 ||
        years.some((entry) =>
          entry === 'Vintage' ? card.year < 2000 : card.year === Number.parseInt(entry, 10),
        )
      const priceMatch = matchesPriceRange(card, priceRange)
      const gradedMatch =
        graded === 'All' ||
        (graded === 'Raw Only' ? !isGradedCard(card) : isGradedCard(card))

      return searchMatch && sportMatch && setMatch && yearMatch && priceMatch && gradedMatch
    })

    if (sortBy === 'Price: Low → High') {
      return [...result].sort((a, b) => a.currentPrice - b.currentPrice)
    }
    if (sortBy === 'Price: High → Low') {
      return [...result].sort((a, b) => b.currentPrice - a.currentPrice)
    }
    if (sortBy === 'Recently Listed') {
      return [...result].sort(
        (a, b) => Number.parseInt(b.id.split('-')[1], 10) - Number.parseInt(a.id.split('-')[1], 10),
      )
    }
    if (sortBy === 'Biggest Movers') {
      return [...result].sort(
        (a, b) => Math.abs(b.priceChange30d) - Math.abs(a.priceChange30d),
      )
    }
    return [...result].sort((a, b) => b.priceChange30d - a.priceChange30d)
  }, [graded, priceRange, search, setFilters, sortBy, sports, years])

  const clearAllFilters = () => {
    setSports([])
    setSetFilters([])
    setYears([])
    setPriceRange('Any')
    setGraded('All')
    setOpenFilter(null)
  }

  const resultsLabel = `${filteredCards.length} ${filteredCards.length === 1 ? 'card' : 'cards'}`
  const activeSportWithLogo = sports.find((sport) => Boolean(getLeagueLogo(sport))) ?? null
  const activeSportLogo = activeSportWithLogo ? getLeagueLogo(activeSportWithLogo) : null

  return (
    <div className="explore-page">
      <section className="explore-top">
        <div className="explore-search-wrap">
          <Search size={18} />
          <input
            type="text"
            className="explore-search"
            placeholder="Search players, sets, teams..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="explore-filter-row" onClick={(event) => event.stopPropagation()}>
          <MultiFilterChip
            label="All Sports"
            values={sports}
            options={SPORT_OPTIONS}
            isOpen={openFilter === 'sport'}
            onToggle={() => setOpenFilter((prev) => (prev === 'sport' ? null : 'sport'))}
            onChange={(option) => {
              setSports((prev) =>
                prev.includes(option)
                  ? prev.filter((entry) => entry !== option)
                  : [...prev, option],
              )
            }}
            onClear={() => setSports([])}
            icon={Trophy}
            iconOverride={
              activeSportLogo ? (
                <LogoImage
                  src={activeSportLogo}
                  alt={`${activeSportWithLogo ?? 'league'} logo`}
                  size={16}
                  className="filter-chip-league-logo"
                />
              ) : null
            }
          />
          <MultiFilterChip
            label="All Sets"
            values={setFilters}
            options={SET_OPTIONS}
            isOpen={openFilter === 'set'}
            onToggle={() => setOpenFilter((prev) => (prev === 'set' ? null : 'set'))}
            onChange={(option) => {
              setSetFilters((prev) =>
                prev.includes(option)
                  ? prev.filter((entry) => entry !== option)
                  : [...prev, option],
              )
            }}
            onClear={() => setSetFilters([])}
            icon={Layers}
          />
          <MultiFilterChip
            label="All Years"
            values={years}
            options={YEAR_OPTIONS}
            isOpen={openFilter === 'year'}
            onToggle={() => setOpenFilter((prev) => (prev === 'year' ? null : 'year'))}
            onChange={(option) => {
              setYears((prev) =>
                prev.includes(option)
                  ? prev.filter((entry) => entry !== option)
                  : [...prev, option],
              )
            }}
            onClear={() => setYears([])}
            icon={Calendar}
          />
          <SingleFilterChip
            label="Any Price"
            value={priceRange}
            options={['Any', ...PRICE_RANGE_OPTIONS]}
            isOpen={openFilter === 'price'}
            onToggle={() => setOpenFilter((prev) => (prev === 'price' ? null : 'price'))}
            onSelect={(option) => {
              setPriceRange(option)
              setOpenFilter(null)
            }}
            onClear={() => setPriceRange('Any')}
            isActive={priceRange !== 'Any'}
            icon={DollarSign}
          />
          <SingleFilterChip
            label="All"
            value={graded}
            options={GRADED_OPTIONS}
            isOpen={openFilter === 'graded'}
            onToggle={() => setOpenFilter((prev) => (prev === 'graded' ? null : 'graded'))}
            onSelect={(option) => {
              setGraded(option)
              setOpenFilter(null)
            }}
            onClear={() => setGraded('All')}
            isActive={graded !== 'All'}
            icon={Shield}
          />
          <div className="explore-filter-spacer" />
          <p className="explore-results-count">{resultsLabel}</p>
          <div className="sort-menu-wrap">
            <button
              type="button"
              className="sort-menu-trigger"
              onClick={() => setOpenFilter((prev) => (prev === 'sort' ? null : 'sort'))}
              aria-expanded={openFilter === 'sort'}
            >
              <span className="sort-menu-label">Sort by:</span>
              <span>{sortBy}</span>
              <ChevronDown size={14} className={`sort-menu-caret${openFilter === 'sort' ? ' open' : ''}`} />
            </button>
            {openFilter === 'sort' && (
              <div className="sort-menu-popover">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`filter-option${sortBy === option ? ' active' : ''}`}
                    onClick={() => {
                      setSortBy(option)
                      setOpenFilter(null)
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="explore-grid">
        {filteredCards.map((card) => {
          const onWatchlist = isOnWatchlist(card.id)
          const inCollection = isInCollection(card.id)
          const up = card.priceChange30d >= 0
          const changeAbs = Math.abs(card.priceChange30d)
          const trendTier = changeAbs >= 10 ? 'hot' : changeAbs >= 5 ? 'mid' : 'flat'
          const teamLogo = getTeamLogo(card.team)
          const combinedSetText = `${card.set} · ${card.parallel}`
          const splitSetText = combinedSetText.length > 35
          const tileBadges = (card.cardKnowledge ?? []).filter(
            (badge) => badge.type === 'rookie' || badge.type === 'numbered',
          )
          return (
            <article
              key={card.id}
              className="explore-card"
              onClick={() => navigate(`/card/${card.id}`, { state: { fromNav: '/explore' } })}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  navigate(`/card/${card.id}`, { state: { fromNav: '/explore' } })
                }
              }}
            >
              <div className="explore-card-image-wrap">
                <img
                  src={card.image}
                  alt={`${card.playerName} — ${card.set} ${card.parallel}`}
                  className="explore-card-image"
                />
                {inCollection && (
                  <span className="collection-indicator" aria-label={`${card.playerName} in collection`}>
                    <Check size={18} />
                  </span>
                )}
                <button
                  type="button"
                  className={`quick-watch-btn${onWatchlist ? ' on-watchlist' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (onWatchlist) {
                      removeFromWatchlist(card.id)
                      showToast('Removed from watchlist')
                    } else {
                      addToWatchlist(card.id)
                    }
                  }}
                  aria-label={onWatchlist ? `Remove ${card.playerName} from watchlist` : `Add ${card.playerName} to watchlist`}
                >
                  <Heart size={18} fill={onWatchlist ? 'currentColor' : 'none'} />
                </button>
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
              <div className="explore-card-body">
                <p className="explore-player">{card.playerName}</p>
                <div className={`explore-set-block${splitSetText ? ' split' : ''}`}>
                  {splitSetText ? (
                    <>
                      <p className="explore-set">{card.set}</p>
                      <p className="explore-parallel">{card.parallel}</p>
                    </>
                  ) : (
                    <p className="explore-set">{combinedSetText}</p>
                  )}
                </div>
                <div className="explore-knowledge">
                  {tileBadges.slice(0, 2).map((badge, index) => (
                    <span
                      key={`${card.id}-${badge.label}-${index}`}
                      className={`mini-badge ${badge.type}`}
                      title={badge.description}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
                <div className="explore-card-footer">
                  <p className="explore-price font-number">{`$${card.currentPrice}`}</p>
                  <span className={`trend-badge ${trendTier} ${up ? 'up' : 'down'}`}>
                    {`${up ? '↑' : '↓'} ${Math.abs(card.priceChange30d).toFixed(1)}%`}
                  </span>
                </div>
              </div>
            </article>
          )
        })}
        {filteredCards.length === 0 && (
          <div className="explore-empty">
            <h3>No cards match your filters</h3>
            <button type="button" className="explore-clear-btn" onClick={clearAllFilters}>
              Clear all filters
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
