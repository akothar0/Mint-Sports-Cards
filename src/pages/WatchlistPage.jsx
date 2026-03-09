import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  Eye,
  Grid3X3,
  Heart,
  List,
} from 'lucide-react'
import { LogoImage } from '../components/LogoImage'
import { ModalPortal } from '../components/ModalPortal'
import { useAppContext } from '../context/AppContext'
import { cards } from '../data/cards'
import { getTeamLogo } from '../utils/logos'

const SORT_OPTIONS = [
  'Recently Added',
  'Price: Low → High',
  'Biggest Price Drop',
  'Biggest Price Gain',
]

const SPORT_FILTERS = ['All', 'NBA', 'NFL', 'MLB']

function getDaysAgoLabel(addedAt) {
  const now = new Date()
  const added = new Date(addedAt)
  const diffMs = now.getTime() - added.getTime()
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

  if (days === 0) return 'Added today'
  if (days === 1) return 'Added 1 day ago'
  return `Added ${days} days ago`
}

function trendTier(changeAbs) {
  if (changeAbs >= 10) return 'hot'
  if (changeAbs >= 5) return 'mid'
  return 'flat'
}

function movementClass(change) {
  if (change <= -5) return 'drop'
  if (change >= 10) return 'hot'
  return 'neutral'
}

function hasRookieBadge(card) {
  return (card.cardKnowledge ?? []).some((badge) => badge.type === 'rookie')
}

export function WatchlistPage() {
  const navigate = useNavigate()
  const {
    watchlist,
    watchlistMeta,
    removeFromWatchlist,
    updateWatchlistAlert,
    showToast,
  } = useAppContext()

  const [sortBy, setSortBy] = useState('Recently Added')
  const [sportFilter, setSportFilter] = useState('All')
  const [viewMode, setViewMode] = useState('grid')
  const [pendingRemove, setPendingRemove] = useState(null)
  const [editingAlertCardId, setEditingAlertCardId] = useState(null)
  const [alertDraft, setAlertDraft] = useState('')

  const watchlistEntries = useMemo(
    () =>
      watchlist
        .map((cardId) => {
          const card = cards.find((entry) => entry.id === cardId)
          if (!card) return null
          return {
            card,
            addedAt: watchlistMeta[cardId]?.addedAt ?? new Date().toISOString(),
            alertBelow:
              watchlistMeta[cardId]?.alertBelow ?? Math.max(1, Math.round(card.currentPrice * 0.9)),
          }
        })
        .filter(Boolean),
    [watchlist, watchlistMeta],
  )

  const visibleEntries = useMemo(() => {
    const filtered =
      sportFilter === 'All'
        ? watchlistEntries
        : watchlistEntries.filter((entry) => entry.card.sport === sportFilter)

    const sorted = [...filtered]
    if (sortBy === 'Price: Low → High') {
      sorted.sort((a, b) => a.card.currentPrice - b.card.currentPrice)
    } else if (sortBy === 'Biggest Price Drop') {
      sorted.sort((a, b) => a.card.priceChange30d - b.card.priceChange30d)
    } else if (sortBy === 'Biggest Price Gain') {
      sorted.sort((a, b) => b.card.priceChange30d - a.card.priceChange30d)
    } else {
      sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    }

    return sorted
  }, [sortBy, sportFilter, watchlistEntries])

  const dropCount = useMemo(
    () => watchlistEntries.filter((entry) => entry.card.priceChange30d < 0).length,
    [watchlistEntries],
  )
  const visibleCountLabel = `${visibleEntries.length} ${visibleEntries.length === 1 ? 'card' : 'cards'}`
  const dropMessage =
    dropCount === 1
      ? '✨ 1 card on your watchlist has dropped in price — could be a good time to buy.'
      : `✨ ${dropCount} cards on your watchlist have dropped in price — could be a good time to buy.`

  const beginAlertEdit = (entry) => {
    setEditingAlertCardId(entry.card.id)
    setAlertDraft(
      String(entry.alertBelow > 0 ? entry.alertBelow : Math.max(1, Math.round(entry.card.currentPrice * 0.9))),
    )
  }

  const saveAlert = (cardId) => {
    const next = Number.parseInt(alertDraft || '0', 10)
    if (next <= 0) return
    updateWatchlistAlert(cardId, { alertBelow: next })
    showToast('Alert updated ✓')
    setEditingAlertCardId(null)
  }

  const removeAlert = (cardId) => {
    updateWatchlistAlert(cardId, { alertBelow: 0 })
    showToast('Alert removed')
    setEditingAlertCardId(null)
  }

  const openRemoveConfirm = (card) => {
    setPendingRemove(card)
  }

  if (watchlistEntries.length === 0) {
    return (
      <div className="watchlist-v2-page">
        <div className="watchlist-v2-empty">
          <Eye size={48} />
          <h2>Your watchlist is empty</h2>
          <p>Swipe right on cards or tap the heart icon to start watching.</p>
          <div className="watchlist-v2-empty-actions">
            <Link to="/swipe" className="watchlist-v2-cta primary">
              Start Swiping →
            </Link>
            <Link to="/explore" className="watchlist-v2-cta secondary">
              Browse Cards
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="watchlist-v2-page">
      <section className="watchlist-v2-top">
        <div className="watchlist-v2-heading">
          <h1>Watchlist</h1>
          <span className="watchlist-v2-count">{visibleCountLabel}</span>
        </div>

        <div className="watchlist-v2-controls">
          <label className="watchlist-v2-sort">
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="watchlist-v2-sports">
            {SPORT_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`watchlist-v2-pill${sportFilter === filter ? ' active' : ''}`}
                onClick={() => setSportFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="watchlist-v2-view-toggle">
            <button
              type="button"
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid3X3 size={15} />
              <span>Grid</span>
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </section>

      {viewMode === 'grid' ? (
        <section className="watchlist-v2-grid">
          {visibleEntries.map((entry) => {
            const { card } = entry
            const up = card.priceChange30d >= 0
            const tier = trendTier(Math.abs(card.priceChange30d))
            const teamLogo = getTeamLogo(card.team)
            const rook = hasRookieBadge(card)
            const movement = movementClass(card.priceChange30d)
            const alertActive = entry.alertBelow > 0
            const isEditing = editingAlertCardId === card.id

            return (
              <article key={card.id} className={`watchlist-v2-card ${movement}`}>
                <div className="watchlist-v2-image-wrap">
                  <button
                    type="button"
                    className="watchlist-v2-image-btn"
                    onClick={() => navigate(`/card/${card.id}`, { state: { fromNav: '/watchlist' } })}
                    aria-label={`Open ${card.playerName}`}
                  >
                    <img
                      src={card.image}
                      alt={`${card.playerName} — ${card.set} ${card.parallel}`}
                      className="watchlist-v2-image"
                    />
                  </button>
                  <button
                    type="button"
                    className="watchlist-v2-heart"
                    aria-label={`Remove ${card.playerName} from watchlist`}
                    onClick={() => openRemoveConfirm(card)}
                  >
                    <Heart size={18} fill="currentColor" />
                  </button>
                  {teamLogo && (
                    <span className="card-team-logo-overlay" aria-hidden="true">
                      <LogoImage src={teamLogo} alt={`${card.team} logo`} size={18} />
                    </span>
                  )}
                </div>

                <div className="watchlist-v2-body">
                  <div className="watchlist-v2-row main">
                    <button
                      type="button"
                      className="watchlist-v2-player-link"
                      onClick={() => navigate(`/card/${card.id}`, { state: { fromNav: '/watchlist' } })}
                    >
                      {card.playerName}
                    </button>
                    <div className="watchlist-v2-right">
                      <p className="watchlist-v2-price font-number">{`$${card.currentPrice}`}</p>
                    </div>
                  </div>

                  <div className="watchlist-v2-row meta watchlist-v2-meta-row">
                    <div className="watchlist-v2-set-single-row">
                      <p className="watchlist-v2-set-one-line">{`${card.set} · ${card.parallel}`}</p>
                      {rook && <span className="mini-badge rookie">RC</span>}
                    </div>
                    <span className={`trend-badge ${tier} ${up ? 'up' : 'down'}`}>
                      {`${up ? '↑' : '↓'} ${Math.abs(card.priceChange30d).toFixed(1)}%`}
                    </span>
                  </div>

                  <div className="watchlist-v2-bottom">
                    {isEditing ? (
                      <div className={`watchlist-v2-alert-box editing`}>
                        <div className="watchlist-v2-alert-edit">
                          <div className="watchlist-v2-alert-input-wrap">
                            <span>Below $</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={alertDraft}
                              onChange={(event) => setAlertDraft(event.target.value)}
                            />
                          </div>
                          <div className="watchlist-v2-alert-actions">
                            <button type="button" onClick={() => saveAlert(card.id)}>
                              Save
                            </button>
                            <button type="button" className="danger" onClick={() => removeAlert(card.id)}>
                              Remove Alert
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {alertActive ? (
                          <button
                            type="button"
                            className="watchlist-v2-alert-view"
                            onClick={() => beginAlertEdit(entry)}
                          >
                            {`🔔 Price alert: Below $${entry.alertBelow}`}
                          </button>
                        ) : (
                          <span className="watchlist-v2-alert-placeholder" aria-hidden="true" />
                        )}
                        <p className="watchlist-v2-added">{getDaysAgoLabel(entry.addedAt)}</p>
                      </>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="watchlist-v2-list">
          {visibleEntries.map((entry) => {
            const { card } = entry
            const up = card.priceChange30d >= 0
            const tier = trendTier(Math.abs(card.priceChange30d))
            const teamLogo = getTeamLogo(card.team)
            const isEditing = editingAlertCardId === card.id
            return (
              <article key={card.id} className="watchlist-v2-list-row">
                <button
                  type="button"
                  className="watchlist-v2-list-image-btn"
                  onClick={() => navigate(`/card/${card.id}`, { state: { fromNav: '/watchlist' } })}
                >
                  <img
                    src={card.image}
                    alt={`${card.playerName} — ${card.set} ${card.parallel}`}
                  />
                </button>
                <div className="watchlist-v2-list-main">
                  <div className="watchlist-v2-list-rowline">
                    <div className="watchlist-v2-list-player-row">
                      {teamLogo && (
                        <LogoImage
                          src={teamLogo}
                          alt={`${card.team} logo`}
                          size={18}
                        />
                      )}
                      <button
                        type="button"
                        className="watchlist-v2-player-link"
                        onClick={() => navigate(`/card/${card.id}`, { state: { fromNav: '/watchlist' } })}
                      >
                        {card.playerName}
                      </button>
                    </div>
                    <p className="watchlist-v2-price font-number">{`$${card.currentPrice}`}</p>
                  </div>
                  <div className="watchlist-v2-list-rowline">
                    <div className="watchlist-v2-list-set-row">
                      <p className="watchlist-v2-set">{`${card.set} · ${card.parallel}`}</p>
                      {hasRookieBadge(card) && <span className="mini-badge rookie">RC</span>}
                    </div>
                    <span className={`trend-badge ${tier} ${up ? 'up' : 'down'}`}>
                      {`${up ? '↑' : '↓'} ${Math.abs(card.priceChange30d).toFixed(1)}%`}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="watchlist-v2-list-alert-edit">
                      <div className="watchlist-v2-alert-input-wrap">
                        <span>Below $</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={alertDraft}
                          onChange={(event) => setAlertDraft(event.target.value)}
                        />
                      </div>
                      <div className="watchlist-v2-alert-actions">
                        <button type="button" onClick={() => saveAlert(card.id)}>
                          Save
                        </button>
                        <button type="button" className="danger" onClick={() => removeAlert(card.id)}>
                          Remove Alert
                        </button>
                      </div>
                    </div>
                  ) : entry.alertBelow > 0 ? (
                    <div className="watchlist-v2-list-rowline">
                      <button
                        type="button"
                        className="watchlist-v2-list-alert"
                        onClick={() => beginAlertEdit(entry)}
                      >
                        {`🔔 Price alert: Below $${entry.alertBelow}`}
                      </button>
                      <p className="watchlist-v2-added">{getDaysAgoLabel(entry.addedAt)}</p>
                    </div>
                  ) : (
                    <div className="watchlist-v2-list-rowline">
                      <button
                        type="button"
                        className="watchlist-v2-alert-create"
                        onClick={() => beginAlertEdit(entry)}
                      >
                        + Set Price Alert
                      </button>
                      <p className="watchlist-v2-added">{getDaysAgoLabel(entry.addedAt)}</p>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}

      <section className="watchlist-v2-insight">
        <p>
          {dropCount > 0
            ? dropMessage
            : '✨ Your watchlist is looking stable. Keep an eye on upcoming set releases.'}
        </p>
      </section>

      {pendingRemove && (
        <ModalPortal>
          <div className="collection-modal-overlay" onClick={() => setPendingRemove(null)}>
            <div className="collection-modal" onClick={(event) => event.stopPropagation()}>
              <h3>{`Remove ${pendingRemove.playerName} from watchlist?`}</h3>
              <div className="collection-modal-actions">
                <button
                  type="button"
                  className="collection-secondary-btn"
                  onClick={() => setPendingRemove(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="collection-primary-btn watchlist-v2-danger-btn"
                  onClick={() => {
                    removeFromWatchlist(pendingRemove.id)
                    showToast('Removed from watchlist')
                    setPendingRemove(null)
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
