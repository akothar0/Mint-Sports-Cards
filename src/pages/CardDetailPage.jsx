import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  Minus,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LogoImage } from '../components/LogoImage'
import { useAppContext } from '../context/AppContext'
import { cards } from '../data/cards'
import { getTeamLogo } from '../utils/logos'

const CHART_RANGES = [
  { key: '7D', points: 7 },
  { key: '30D', points: 30 },
  { key: '90D', points: 30, note: '(showing available data)' },
  { key: '1Y', points: 30, note: '(showing available data)' },
]

const FALLBACK_CONDITIONS = ['Raw', 'Raw NM', 'PSA 10', 'PSA 9']

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function platformClass(platform) {
  const normalized = String(platform).toLowerCase()
  if (normalized.includes('ebay')) return 'ebay'
  if (normalized.includes('pwcc')) return 'pwcc'
  if (normalized.includes('goldin')) return 'goldin'
  return 'comc'
}

function parseSaleDetail(detail = '') {
  const [condition = 'Raw', platform = 'eBay', seller = 'hobby_seller'] = detail
    .split('·')
    .map((entry) => entry.trim())
  return { condition, platform, seller }
}

function extractGrade(condition) {
  const match = String(condition)
    .toUpperCase()
    .match(/(PSA\s?\d+|BGS\s?\d+(?:\.\d+)?|SGC\s?\d+)/)
  return match?.[1]?.replace(/\s+/g, ' ') ?? null
}

function sortListings(listings, sort) {
  const sorted = [...listings]
  if (sort.key === 'price') {
    sorted.sort((a, b) => (sort.direction === 'asc' ? a.price - b.price : b.price - a.price))
  } else {
    sorted.sort((a, b) => {
      const left = String(a[sort.key]).toLowerCase()
      const right = String(b[sort.key]).toLowerCase()
      if (left < right) return sort.direction === 'asc' ? -1 : 1
      if (left > right) return sort.direction === 'asc' ? 1 : -1
      return 0
    })
  }
  return sorted
}

function PriceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="detail-chart-tooltip">
      <p className="tooltip-date">{formatDate(label)}</p>
      <p className="tooltip-price font-number">{`$${point.price}`}</p>
      <p className="tooltip-sale">{point.saleDetail}</p>
    </div>
  )
}

function MetaCell({ label, value, grade = false, muted = false }) {
  return (
    <div className="detail-meta-cell">
      <p className="detail-meta-label">{label}</p>
      {grade ? (
        <p className={`detail-meta-grade ${muted ? 'muted' : ''}`}>
          {!muted && <BadgeCheck size={14} aria-hidden="true" />}
          <span>{value}</span>
        </p>
      ) : (
        <p className="detail-meta-value">{value}</p>
      )}
    </div>
  )
}

export function CardDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const watchlistPopoverRef = useRef(null)
  const collectionPopoverRef = useRef(null)
  const {
    collection,
    addToWatchlist,
    removeFromWatchlist,
    addToCollection,
    removeFromCollection,
    isOnWatchlist,
    isInCollection,
    showToast,
  } = useAppContext()

  const [listingSort, setListingSort] = useState({ key: 'price', direction: 'asc' })
  const [chartRange, setChartRange] = useState('30D')
  const [gradeFilter, setGradeFilter] = useState('All Grades')
  const [loadedCardId, setLoadedCardId] = useState(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showWatchlistConfirm, setShowWatchlistConfirm] = useState(false)
  const [showCollectionConfirm, setShowCollectionConfirm] = useState(false)
  const isLoading = loadedCardId !== id

  const card = useMemo(() => cards.find((entry) => entry.id === id), [id])

  const ownedEntry = useMemo(
    () => collection.find((entry) => entry.cardId === card?.id),
    [card?.id, collection],
  )

  const setCollectionInfo = useMemo(() => {
    if (!card?.setInfo?.setKey) return null
    const inSet = cards.filter((entry) => entry.setInfo?.setKey === card.setInfo.setKey)
    if (!inSet.length) return null
    const ownedCount = inSet.filter((entry) =>
      collection.some((owned) => owned.cardId === entry.id),
    ).length
    if (ownedCount < 1) return null
    return {
      setName: card.setInfo.setName,
      ownedCount,
      totalCount: inSet.length,
    }
  }, [card, collection])

  const enrichedHistory = useMemo(() => {
    if (!card) return []
    const listingConditions = card.listings.map((listing) => listing.condition)
    return card.priceHistory.map((point, index) => {
      if (point.saleDetail) return point
      const condition =
        listingConditions[index % listingConditions.length] ??
        FALLBACK_CONDITIONS[index % FALLBACK_CONDITIONS.length]
      const listing = card.listings[index % card.listings.length]
      return {
        ...point,
        saleDetail: `${condition} · ${listing.platform} · ${listing.seller}`,
      }
    })
  }, [card])

  const detailKnowledge = useMemo(() => {
    if (!card) return []
    const seen = new Set()
    return (card.cardKnowledge ?? [])
      .filter((badge) => {
        const key = `${badge.type}-${badge.label}`.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 4)
  }, [card])

  const onWatchlist = isOnWatchlist(card?.id)
  const inCollection = isInCollection(card?.id)

  const listings = useMemo(
    () => (card ? sortListings(card.listings, listingSort) : []),
    [card, listingSort],
  )

  const listingRange = useMemo(() => {
    if (!listings.length) return { low: 0, high: 0 }
    return {
      low: Math.min(...listings.map((listing) => listing.price)),
      high: Math.max(...listings.map((listing) => listing.price)),
    }
  }, [listings])

  const bestListingPrice = listingRange.low

  const gradeOptions = useMemo(() => {
    if (!enrichedHistory.length) return ['All Grades']
    const unique = new Set(enrichedHistory.map((point) => parseSaleDetail(point.saleDetail).condition))
    return ['All Grades', ...unique]
  }, [enrichedHistory])

  const gradeHistory = useMemo(() => {
    if (gradeFilter === 'All Grades') return enrichedHistory
    return enrichedHistory.filter((point) => parseSaleDetail(point.saleDetail).condition === gradeFilter)
  }, [enrichedHistory, gradeFilter])

  const chartMeta = CHART_RANGES.find((range) => range.key === chartRange) ?? CHART_RANGES[1]
  const chartData = useMemo(
    () => gradeHistory.slice(0, chartMeta.points).reverse(),
    [chartMeta.points, gradeHistory],
  )

  const xTicks = useMemo(() => {
    if (!chartData.length) return []
    const step = Math.max(1, Math.ceil(chartData.length / 8))
    return chartData
      .map((point, index) => (index % step === 0 || index === chartData.length - 1 ? point.date : null))
      .filter(Boolean)
  }, [chartData])

  const comparableSales = useMemo(() => enrichedHistory.slice(0, 10), [enrichedHistory])

  const sourceStats = chartData.length > 0 ? chartData : [...enrichedHistory].reverse()
  const sourcePrices = sourceStats.map((point) => point.price)
  const statCurrent = sourceStats[sourceStats.length - 1]?.price ?? card?.currentPrice ?? 0
  const statFirst = sourceStats[0]?.price ?? card?.currentPrice ?? 0
  const statLow = sourcePrices.length
    ? Math.round(Math.min(...sourcePrices))
    : Math.round(card?.priceLow30d ?? 0)
  const statHigh = sourcePrices.length
    ? Math.round(Math.max(...sourcePrices))
    : Math.round(card?.priceHigh30d ?? 0)
  const sortedPrices = [...sourcePrices].sort((a, b) => a - b)
  const statMedian = Math.round(
    sortedPrices[Math.floor((sortedPrices.length - 1) / 2)] ?? card?.priceMedian30d ?? 0,
  )
  const statChange = statFirst ? ((statCurrent - statFirst) / statFirst) * 100 : 0
  const statChangeUp = statChange >= 0

  const displayCondition = ownedEntry?.condition ?? card?.condition ?? 'Raw'
  const extractedGrade = extractGrade(displayCondition)
  const conditionValue = extractedGrade ? 'Graded' : displayCondition

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsFlipped(false)
      setShowWatchlistConfirm(false)
      setShowCollectionConfirm(false)
      setLoadedCardId(id)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [id])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (
        watchlistPopoverRef.current &&
        !watchlistPopoverRef.current.contains(event.target)
      ) {
        setShowWatchlistConfirm(false)
      }
      if (
        collectionPopoverRef.current &&
        !collectionPopoverRef.current.contains(event.target)
      ) {
        setShowCollectionConfirm(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  if (!card) {
    return (
      <div className="card-detail-page">
        <div className="detail-panel">
          <h2>Card not found</h2>
          <p className="detail-muted">The requested card does not exist in this dataset.</p>
          <Link to="/explore" className="detail-back-link">
            ← Back to Explore
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <CardDetailSkeleton />
  }

  const toggleSort = (key) => {
    setListingSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: key === 'price' ? 'asc' : 'desc' }
    })
  }

  const fromNav = location.state?.fromNav ?? ''
  const backLabelMap = {
    '/swipe': '← Back to Swipe Feed',
    '/explore': '← Back to Explore',
    '/watchlist': '← Back to Watchlist',
    '/collection': '← Back to Collection',
    '/sets': '← Back to Sets',
    '/ai-picks': '← Back to AI Picks',
    '/preferences': '← Back to Preferences',
  }
  const backLabel = backLabelMap[fromNav] ?? '← Back'

  return (
    <div className="card-detail-page card-detail-enter">
      <section className="detail-panel detail-hero-panel">
        <div className="detail-overview-grid">
          <div className="detail-image-column">
            <div className="detail-image-shell">
              {card.imageBack ? (
                <div className={`detail-flip-card${isFlipped ? ' flipped' : ''}`}>
                  <div className="detail-flip-face front">
                    <img
                      src={card.image}
                      alt={`${card.playerName} — ${card.set} ${card.parallel} front`}
                      className="detail-image"
                    />
                  </div>
                  <div className="detail-flip-face back">
                    <img
                      src={card.imageBack}
                      alt={`${card.playerName} — ${card.set} ${card.parallel} back`}
                      className="detail-image"
                    />
                  </div>
                </div>
              ) : (
                <img
                  src={card.image}
                  alt={`${card.playerName} — ${card.set} ${card.parallel}`}
                  className="detail-image"
                />
              )}
              {card.imageBack && (
                <button
                  type="button"
                  className="detail-flip-btn"
                  onClick={() => setIsFlipped((prev) => !prev)}
                  aria-label={isFlipped ? 'Show front image' : 'Show back image'}
                >
                  ↻ Flip
                </button>
              )}
            </div>

            <div className="detail-action-row">
              <div className="detail-action-wrap" ref={watchlistPopoverRef}>
                <button
                  type="button"
                  className={`detail-btn ${onWatchlist ? 'watchlist-on' : 'outline'}`}
                  onClick={() => {
                    if (onWatchlist) {
                      setShowCollectionConfirm(false)
                      setShowWatchlistConfirm((prev) => !prev)
                    } else {
                      addToWatchlist(card.id)
                    }
                  }}
                >
                  {onWatchlist ? '♥ On Watchlist' : '♡ Add to Watchlist'}
                </button>
                {showWatchlistConfirm && (
                  <div className="detail-confirm-popover">
                    <p>Remove from watchlist?</p>
                    <div className="detail-confirm-actions">
                      <button
                        type="button"
                        className="remove"
                        onClick={() => {
                          removeFromWatchlist(card.id)
                          showToast('Removed from watchlist')
                          setShowWatchlistConfirm(false)
                        }}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        className="cancel"
                        onClick={() => setShowWatchlistConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="detail-action-wrap" ref={collectionPopoverRef}>
                <button
                  type="button"
                  className={`detail-btn ${inCollection ? 'collection-on' : 'solid'}`}
                  onClick={() => {
                    if (inCollection) {
                      setShowWatchlistConfirm(false)
                      setShowCollectionConfirm((prev) => !prev)
                    } else {
                      setShowWatchlistConfirm(false)
                      setShowCollectionConfirm(false)
                      addToCollection({
                        cardId: card.id,
                        purchasePrice: card.currentPrice,
                        purchaseDate: new Date().toISOString().slice(0, 10),
                        condition: displayCondition,
                      })
                    }
                  }}
                >
                  {inCollection ? '✓ In Collection' : '📦 Add to Collection'}
                </button>
                {showCollectionConfirm && (
                  <div className="detail-confirm-popover">
                    <p>Remove from collection?</p>
                    <div className="detail-confirm-actions">
                      <button
                        type="button"
                        className="remove"
                        onClick={() => {
                          removeFromCollection(card.id)
                          showToast('Removed from collection')
                          setShowCollectionConfirm(false)
                        }}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        className="cancel"
                        onClick={() => setShowCollectionConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="detail-info-column">
            <button type="button" className="detail-back-link" onClick={() => navigate(-1)}>
              {backLabel}
            </button>

            <h1>{card.playerName}</h1>
            <div className="detail-team-row">
              <LogoImage
                src={getTeamLogo(card.team)}
                alt={`${card.team} logo`}
                size={24}
              />
              <p className="detail-muted">{card.team}</p>
            </div>

            <div className="detail-meta-grid">
              <MetaCell label="Set" value={card.set} />
              <MetaCell label="Parallel" value={card.parallel} />
              <MetaCell label="Year" value={String(card.year)} />
              <MetaCell label="Card #" value={card.cardNumber} />
              <MetaCell label="Condition" value={conditionValue} />
              <MetaCell
                label="Grade"
                value={extractedGrade ?? 'Ungraded'}
                grade
                muted={!extractedGrade}
              />
            </div>

            {setCollectionInfo && (
              <p className="detail-set-collection-note">
                {`Part of ${setCollectionInfo.setName} — ${setCollectionInfo.ownedCount} of ${setCollectionInfo.totalCount} collected`}
              </p>
            )}

            <div className="knowledge-badges detail-knowledge-badges">
              {detailKnowledge.map((badge, index) => (
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

            <div className="detail-price-pop-row">
              <div className="detail-price-wrap">
                <div className="detail-price-main">
                  <p className="detail-price font-number">{`$${card.currentPrice}`}</p>
                  <span className={`detail-price-change-pill ${card.priceChange30d >= 0 ? 'up' : 'down'}`}>
                    {`${card.priceChange30d >= 0 ? '↑' : '↓'} ${Math.abs(card.priceChange30d).toFixed(1)}%`}
                  </span>
                </div>
              </div>
              <div className="detail-psa-mini">
                <div className="detail-psa-mini-box psa-10">
                  <span>PSA 10</span>
                  <strong className="font-number">{card.psaPop['10'].toLocaleString()}</strong>
                </div>
                <div className="detail-psa-mini-box psa-9">
                  <span>PSA 9</span>
                  <strong className="font-number">{card.psaPop['9'].toLocaleString()}</strong>
                </div>
                <div className="detail-psa-mini-box psa-8">
                  <span>PSA 8</span>
                  <strong className="font-number">{card.psaPop['8'].toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="detail-panel">
        <h2>Price Analytics</h2>
        <div className="chart-range-row">
          <div className="range-controls">
            <div className="range-pill-group">
              {CHART_RANGES.map((range) => (
                <button
                  key={range.key}
                  type="button"
                  className={`range-pill${chartRange === range.key ? ' active' : ''}`}
                  onClick={() => setChartRange(range.key)}
                >
                  {range.key}
                </button>
              ))}
            </div>
            {chartMeta.note && <p className="range-note">{chartMeta.note}</p>}
          </div>
          <label className="grade-filter">
            Grade
            <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
              {gradeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="analytics-stats-grid">
          <div>
            <p className="stat-label">
              <TrendingUp size={14} />
              <span>Current Avg Price</span>
            </p>
            <p className="stat-value font-number">{`$${Math.round(statCurrent)}`}</p>
          </div>
          <div>
            <p className="stat-label">
              {statChangeUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>30-Day Change</span>
            </p>
            <p className={`stat-change ${statChangeUp ? 'up' : 'down'}`}>
              {`${statChangeUp ? '↑' : '↓'} ${Math.abs(statChange).toFixed(1)}%`}
            </p>
          </div>
          <div>
            <p className="stat-label">
              <ArrowDown size={14} />
              <span>30-Day Low</span>
            </p>
            <p className="stat-mini font-number">{`$${statLow}`}</p>
          </div>
          <div>
            <p className="stat-label">
              <ArrowUp size={14} />
              <span>30-Day High</span>
            </p>
            <p className="stat-mini font-number">{`$${statHigh}`}</p>
          </div>
          <div>
            <p className="stat-label">
              <Minus size={14} />
              <span>Median</span>
            </p>
            <p className="stat-mini font-number">{`$${statMedian}`}</p>
          </div>
        </div>

        <div className="analytics-chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="date"
                ticks={xTicks}
                interval={0}
                tickFormatter={formatDate}
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                minTickGap={26}
              />
              <YAxis
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                width={52}
              />
              <Tooltip
                content={<PriceTooltip />}
                cursor={{ stroke: 'rgba(52, 211, 153, 0.3)', strokeDasharray: '4 4' }}
              />
              <ReferenceLine
                y={statMedian}
                stroke="rgba(167, 139, 250, 0.75)"
                strokeDasharray="4 4"
                label={{
                  value: `Median: $${statMedian}`,
                  fill: '#c4b5fd',
                  position: 'insideTopRight',
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                fill="url(#priceGradient)"
                dot={{ r: 4, fill: '#34d399', stroke: '#0f1117', strokeWidth: 1.2 }}
                activeDot={{ r: 6, fill: '#6ee7b7', stroke: '#0f1117', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="detail-panel">
        <h2>Listings Across Platforms</h2>
        <div className="listing-table-wrap">
          <table className="listing-table">
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => toggleSort('platform')}>
                    Platform
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort('seller')}>
                    Seller
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort('price')}>
                    Price
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort('condition')}>
                    Condition
                  </button>
                </th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing, index) => {
                const ratio =
                  listingRange.high > listingRange.low
                    ? ((listing.price - listingRange.low) / (listingRange.high - listingRange.low)) * 100
                    : 100
                return (
                  <tr key={`${listing.platform}-${listing.seller}-${index}`}>
                    <td>
                      <span className={`platform-pill ${platformClass(listing.platform)}`}>
                        {listing.platform}
                      </span>
                    </td>
                    <td>{listing.seller}</td>
                    <td>
                      <div className="listing-price-cell">
                        <p className="font-number">{`$${listing.price}`}</p>
                        <div className="price-position-bar">
                          <span style={{ width: `${Math.max(4, ratio)}%` }} />
                        </div>
                      </div>
                      {listing.price === bestListingPrice && (
                        <span className="best-deal-badge">Best Deal</span>
                      )}
                    </td>
                    <td>{listing.condition}</td>
                    <td>
                      <a href={listing.url} target="_blank" rel="noreferrer" className="view-link">
                        View →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="detail-panel ai-analysis-panel">
        <h2 className="ai-title">✨ AI Analysis</h2>
        <p className="ai-copy">{card.aiInsight}</p>
      </section>

      <section className="detail-panel">
        <h2>Recent Comparable Sales</h2>
        <div className="sales-chip-row">
          {comparableSales.map((sale, index) => {
            const parsed = parseSaleDetail(sale.saleDetail)
            return (
              <article key={`${sale.date}-${index}`} className="sale-chip">
                {index === 0 && <span className="latest-sale-pill">Latest</span>}
                <p className="sale-price font-number">{`$${sale.price}`}</p>
                <p className="sale-date">{formatDate(sale.date)}</p>
                <div className="sale-badge-row">
                  <span className="sale-condition-badge">{parsed.condition}</span>
                  <span className={`platform-pill ${platformClass(parsed.platform)}`}>
                    {parsed.platform}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function CardDetailSkeleton() {
  return (
    <div className="card-detail-page card-detail-enter">
      <section className="detail-panel">
        <div className="skeleton skeleton-line short" />
        <div className="detail-overview-grid">
          <div className="detail-image-column">
            <div className="skeleton skeleton-image" />
            <div className="detail-action-row">
              <div className="skeleton skeleton-button" />
              <div className="skeleton skeleton-button" />
            </div>
          </div>
          <div className="detail-info-column">
            <div className="skeleton skeleton-line medium" />
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line long" />
            <div className="skeleton skeleton-line medium" />
          </div>
        </div>
      </section>

      <section className="detail-panel">
        <div className="skeleton skeleton-line medium" />
        <div className="analytics-stats-grid">
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-stat" />
        </div>
        <div className="skeleton skeleton-chart" />
      </section>

      <section className="detail-panel">
        <div className="skeleton skeleton-line medium" />
        <div className="skeleton skeleton-table" />
      </section>
    </div>
  )
}
