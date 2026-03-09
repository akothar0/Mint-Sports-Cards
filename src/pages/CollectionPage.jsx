import { Grid3X3, List, MoreHorizontal, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogoImage } from '../components/LogoImage'
import { ModalPortal } from '../components/ModalPortal'
import { useAppContext } from '../context/AppContext'
import { cards } from '../data/cards'
import { getTeamLogo } from '../utils/logos'

const SORT_OPTIONS = [
  'Value: High → Low',
  'Recent Additions',
  'Biggest Gainers',
  'Biggest Losers',
]
const SPORT_FILTERS = ['All', 'NBA', 'NFL', 'MLB']
const CONDITION_OPTIONS = ['Raw', 'Raw NM', 'PSA 10', 'PSA 9', 'PSA 8', 'BGS 9.5', 'SGC 10']

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function conditionTone(condition) {
  const normalized = String(condition ?? '').toUpperCase()
  if (normalized.includes('PSA') || normalized.includes('BGS') || normalized.includes('SGC')) {
    return 'graded'
  }
  return 'raw'
}

export function CollectionPage() {
  const navigate = useNavigate()
  const { collection, addToCollection, removeFromCollection, updateCollectionItem, showToast } = useAppContext()

  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('Value: High → Low')
  const [sportFilter, setSportFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [openMenuCardId, setOpenMenuCardId] = useState(null)

  const [search, setSearch] = useState('')
  const [selectedCardId, setSelectedCardId] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [condition, setCondition] = useState('Raw')

  const [editEntry, setEditEntry] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [editDate, setEditDate] = useState(new Date().toISOString().slice(0, 10))
  const [editCondition, setEditCondition] = useState('Raw')
  const [pendingRemove, setPendingRemove] = useState(null)

  useEffect(() => {
    const onWindowClick = () => setOpenMenuCardId(null)
    window.addEventListener('click', onWindowClick)
    return () => window.removeEventListener('click', onWindowClick)
  }, [])

  const ownedCardIds = useMemo(() => new Set(collection.map((entry) => entry.cardId)), [collection])

  const collectionEntries = useMemo(
    () =>
      collection
        .map((entry) => {
          const card = cards.find((item) => item.id === entry.cardId)
          if (!card) return null
          const current = card.currentPrice
          const gain = current - entry.purchasePrice
          const gainPct = entry.purchasePrice > 0 ? (gain / entry.purchasePrice) * 100 : 0
          return { ...entry, card, current, gain, gainPct }
        })
        .filter(Boolean),
    [collection],
  )

  const totalValue = useMemo(
    () => collectionEntries.reduce((sum, entry) => sum + entry.current, 0),
    [collectionEntries],
  )
  const totalPaid = useMemo(
    () => collectionEntries.reduce((sum, entry) => sum + entry.purchasePrice, 0),
    [collectionEntries],
  )
  const totalGain = totalValue - totalPaid
  const totalGainPct = totalPaid > 0 ? (totalGain / totalPaid) * 100 : 0
  const totalGainUp = totalGain >= 0

  const bestPerformer = useMemo(() => {
    if (!collectionEntries.length) return null
    return [...collectionEntries].sort((a, b) => b.gainPct - a.gainPct)[0]
  }, [collectionEntries])
  const bestPerformerUp = (bestPerformer?.gainPct ?? 0) >= 0

  const breakdown = useMemo(() => {
    const total = collectionEntries.length || 1
    const counts = collectionEntries.reduce(
      (acc, entry) => ({ ...acc, [entry.card.sport]: (acc[entry.card.sport] ?? 0) + 1 }),
      {},
    )
    const toPct = (sport) => Math.round(((counts[sport] ?? 0) / total) * 100)
    return { nba: toPct('NBA'), nfl: toPct('NFL'), mlb: toPct('MLB') }
  }, [collectionEntries])

  const visibleEntries = useMemo(() => {
    const filtered =
      sportFilter === 'All'
        ? collectionEntries
        : collectionEntries.filter((entry) => entry.card.sport === sportFilter)
    const sorted = [...filtered]
    if (sortBy === 'Recent Additions') {
      sorted.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
    } else if (sortBy === 'Biggest Gainers') {
      sorted.sort((a, b) => b.gain - a.gain)
    } else if (sortBy === 'Biggest Losers') {
      sorted.sort((a, b) => a.gain - b.gain)
    } else {
      sorted.sort((a, b) => b.current - a.current)
    }
    return sorted
  }, [collectionEntries, sortBy, sportFilter])

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    return cards
      .filter((card) => !ownedCardIds.has(card.id))
      .filter((card) => {
        if (!query) return true
        return (
          card.playerName.toLowerCase().includes(query) ||
          card.set.toLowerCase().includes(query) ||
          card.parallel.toLowerCase().includes(query)
        )
      })
      .slice(0, 14)
  }, [ownedCardIds, search])

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [selectedCardId],
  )

  const handleSelectCard = (card) => {
    setSelectedCardId(card.id)
    setPurchasePrice(String(card.currentPrice))
    setCondition(card.condition || 'Raw')
  }

  const handleAddCard = () => {
    if (!selectedCard || !purchasePrice) return
    addToCollection({
      cardId: selectedCard.id,
      purchasePrice: Number.parseFloat(purchasePrice),
      purchaseDate,
      condition,
    })
    setModalOpen(false)
    setSelectedCardId('')
    setPurchasePrice('')
    setSearch('')
    setCondition('Raw')
    showToast('Added to collection ✓')
  }

  const openEditModal = (entry) => {
    setEditEntry(entry)
    setEditPrice(String(entry.purchasePrice))
    setEditDate(entry.purchaseDate)
    setEditCondition(entry.condition || 'Raw')
    setOpenMenuCardId(null)
  }

  const saveEdit = () => {
    if (!editEntry || !editPrice) return
    updateCollectionItem(editEntry.cardId, {
      purchasePrice: Number.parseFloat(editPrice),
      purchaseDate: editDate,
      condition: editCondition,
    })
    showToast('Purchase info updated ✓')
    setEditEntry(null)
  }

  const confirmRemove = (entry) => {
    setPendingRemove(entry)
    setOpenMenuCardId(null)
  }

  const renderActionsMenu = (entry) => (
    <div className="collection-menu-wrap">
      <button
        type="button"
        className="collection-menu-btn"
        aria-label={`Card actions for ${entry.card.playerName}`}
        onClick={(event) => {
          event.stopPropagation()
          setOpenMenuCardId((prev) => (prev === entry.cardId ? null : entry.cardId))
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {openMenuCardId === entry.cardId && (
        <div className="collection-menu-dropdown">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              navigate(`/card/${entry.cardId}`, { state: { fromNav: '/collection' } })
            }}
          >
            View Details
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              openEditModal(entry)
            }}
          >
            Edit Purchase Info
          </button>
          <button
            type="button"
            className="danger"
            onClick={(event) => {
              event.stopPropagation()
              confirmRemove(entry)
            }}
          >
            Remove from Collection
          </button>
        </div>
      )}
    </div>
  )

  if (collectionEntries.length === 0) {
    return (
      <div className="collection-page">
        <div className="collection-empty">
          <div className="collection-empty-icon">
            <Plus size={18} />
          </div>
          <h2>Start building your collection</h2>
          <p>Add cards you own to track their value over time.</p>
          <div className="collection-empty-actions">
            <button type="button" className="collection-primary-btn" onClick={() => setModalOpen(true)}>
              ➕ Add Your First Card
            </button>
            <Link to="/explore" className="collection-secondary-btn">
              Browse Cards
            </Link>
          </div>
        </div>
        {modalOpen && (
          <CollectionAddModal
            search={search}
            setSearch={setSearch}
            searchResults={searchResults}
            selectedCard={selectedCard}
            purchasePrice={purchasePrice}
            setPurchasePrice={setPurchasePrice}
            purchaseDate={purchaseDate}
            setPurchaseDate={setPurchaseDate}
            condition={condition}
            setCondition={setCondition}
            onAdd={handleAddCard}
            onClose={() => setModalOpen(false)}
            onSelectCard={handleSelectCard}
          />
        )}
      </div>
    )
  }

  return (
    <div className="collection-page">
      <Link to="/sets" className="collection-sets-link">
        Track your set progress →
      </Link>

      <section className="collection-summary compact">
        <div className="summary-stat">
          <p className="summary-label">Total Value</p>
          <p className="summary-total font-number">{`$${Math.round(totalValue).toLocaleString()}`}</p>
        </div>
        <div className="summary-stat">
          <p className="summary-label">Cards</p>
          <p className="summary-number font-number">{collectionEntries.length}</p>
        </div>
        <div className="summary-stat">
          <p className="summary-label">Best Performer</p>
          {bestPerformer ? (
            <button
              type="button"
              className={`summary-best ${bestPerformerUp ? 'up' : 'down'}`}
              onClick={() =>
                navigate(`/card/${bestPerformer.cardId}`, { state: { fromNav: '/collection' } })
              }
            >
              {`${bestPerformer.card.playerName} (${bestPerformerUp ? '+' : '-'}${Math.abs(bestPerformer.gainPct).toFixed(1)}%)`}
            </button>
          ) : (
            <p className="summary-best">-</p>
          )}
        </div>
        <div className="summary-stat">
          <p className="summary-label">Total Gain</p>
          <p className={`summary-gain ${totalGainUp ? 'up' : 'down'}`}>
            {`${totalGainUp ? '+' : '-'}$${Math.abs(totalGain).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${totalGainUp ? '+' : '-'}${Math.abs(totalGainPct).toFixed(1)}%)`}
          </p>
        </div>
        <p className="summary-breakdown inline">
          <span className="dot nba" />
          {`NBA ${breakdown.nba}%`}
          <span className="dot nfl" />
          {`NFL ${breakdown.nfl}%`}
          <span className="dot mlb" />
          {`MLB ${breakdown.mlb}%`}
        </p>
      </section>

      <section className="collection-toolbar">
        <button type="button" className="collection-add-btn" onClick={() => setModalOpen(true)}>
          ➕ Add Card
        </button>
        <div className="collection-filter-pills">
          {SPORT_FILTERS.map((sport) => (
            <button
              key={sport}
              type="button"
              className={`collection-filter-pill${sportFilter === sport ? ' active' : ''}`}
              onClick={() => setSportFilter(sport)}
            >
              {sport}
            </button>
          ))}
        </div>
        <div className="collection-toolbar-right">
          <div className="collection-view-toggle">
            <button
              type="button"
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </section>

      {viewMode === 'grid' ? (
        <section className="collection-grid">
          {visibleEntries.map((entry) => {
            const up = entry.gain >= 0
            const teamLogo = getTeamLogo(entry.card.team)
            const badgeClass = conditionTone(entry.condition ?? entry.card.condition)
            return (
              <article
                key={entry.cardId}
                className="collection-card"
                onClick={() => navigate(`/card/${entry.cardId}`, { state: { fromNav: '/collection' } })}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    navigate(`/card/${entry.cardId}`, { state: { fromNav: '/collection' } })
                  }
                }}
              >
                <div className="collection-image-wrap">
                  <img
                    src={entry.card.image}
                    alt={`${entry.card.playerName} — ${entry.card.set} ${entry.card.parallel}`}
                    className="collection-card-image"
                  />
                  {teamLogo && (
                    <span className="card-team-logo-overlay" aria-hidden="true">
                      <LogoImage
                        src={teamLogo}
                        alt={`${entry.card.team} logo`}
                        size={18}
                      />
                    </span>
                  )}
                </div>
                <div className="collection-card-body">
                  <div className="collection-card-top">
                    <button
                      type="button"
                      className="collection-player"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/card/${entry.cardId}`, { state: { fromNav: '/collection' } })
                      }}
                    >
                      {entry.card.playerName}
                    </button>
                    {renderActionsMenu(entry)}
                  </div>
                  <div className="collection-set-row">
                    <p className="collection-set">{`${entry.card.set} · ${entry.card.parallel}`}</p>
                    <span className={`collection-condition-pill-inline ${badgeClass}`}>
                      {entry.condition ?? entry.card.condition}
                    </span>
                  </div>
                  <p className="collection-value font-number">{`$${entry.current.toLocaleString()}`}</p>
                  <p className={`collection-gain ${up ? 'up' : 'down'}`}>
                    {`${up ? '+' : '-'}$${Math.abs(entry.gain).toFixed(0)} (${up ? '+' : '-'}${Math.abs(entry.gainPct).toFixed(1)}%)`}
                  </p>
                  <p className="collection-paid">{`Paid $${entry.purchasePrice} · ${formatDate(entry.purchaseDate)}`}</p>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="collection-list">
          {visibleEntries.map((entry) => {
            const up = entry.gain >= 0
            return (
              <article key={entry.cardId} className="collection-list-row">
                <button
                  type="button"
                  className="collection-list-image-btn"
                  onClick={() => navigate(`/card/${entry.cardId}`, { state: { fromNav: '/collection' } })}
                >
                  <img
                    src={entry.card.image}
                    alt={`${entry.card.playerName} — ${entry.card.set} ${entry.card.parallel}`}
                    className="collection-card-image"
                  />
                </button>
                <div className="collection-list-main">
                  <div className="collection-card-top">
                    <button
                      type="button"
                      className="collection-player"
                      onClick={() => navigate(`/card/${entry.cardId}`, { state: { fromNav: '/collection' } })}
                    >
                      {entry.card.playerName}
                    </button>
                    {renderActionsMenu(entry)}
                  </div>
                  <div className="collection-set-row">
                    <p className="collection-set">{`${entry.card.set} · ${entry.card.parallel}`}</p>
                    <span className={`collection-condition-pill-inline ${conditionTone(entry.condition ?? entry.card.condition)}`}>
                      {entry.condition ?? entry.card.condition}
                    </span>
                  </div>
                  <p className="collection-paid">{`Paid $${entry.purchasePrice} · ${formatDate(entry.purchaseDate)}`}</p>
                </div>
                <div className="collection-list-right">
                  <p className="collection-value font-number">{`$${entry.current.toLocaleString()}`}</p>
                  <p className={`collection-gain ${up ? 'up' : 'down'}`}>
                    {`${up ? '+' : '-'}$${Math.abs(entry.gain).toFixed(0)} (${up ? '+' : '-'}${Math.abs(entry.gainPct).toFixed(1)}%)`}
                  </p>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {modalOpen && (
        <CollectionAddModal
          search={search}
          setSearch={setSearch}
          searchResults={searchResults}
          selectedCard={selectedCard}
          purchasePrice={purchasePrice}
          setPurchasePrice={setPurchasePrice}
          purchaseDate={purchaseDate}
          setPurchaseDate={setPurchaseDate}
          condition={condition}
          setCondition={setCondition}
          onAdd={handleAddCard}
          onClose={() => setModalOpen(false)}
          onSelectCard={handleSelectCard}
        />
      )}

      {editEntry && (
        <ModalPortal>
          <div className="collection-modal-overlay" onClick={() => setEditEntry(null)}>
            <div className="collection-modal" onClick={(event) => event.stopPropagation()}>
              <h3>{`Edit Purchase Info • ${editEntry.card.playerName}`}</h3>
              <div className="collection-modal-row">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Purchase price"
                  value={editPrice}
                  onChange={(event) => setEditPrice(event.target.value)}
                />
                <input
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                />
              </div>
              <select value={editCondition} onChange={(event) => setEditCondition(event.target.value)}>
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="collection-modal-actions">
                <button type="button" className="collection-secondary-btn" onClick={() => setEditEntry(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="collection-primary-btn"
                  onClick={saveEdit}
                  disabled={!editPrice}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {pendingRemove && (
        <ModalPortal>
          <div className="collection-modal-overlay" onClick={() => setPendingRemove(null)}>
            <div className="collection-modal" onClick={(event) => event.stopPropagation()}>
              <h3>{`Remove ${pendingRemove.card.playerName}?`}</h3>
              <p className="collection-remove-copy">This won't delete any data.</p>
              <div className="collection-modal-actions">
                <button type="button" className="collection-secondary-btn" onClick={() => setPendingRemove(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="collection-primary-btn collection-danger-btn"
                  onClick={() => {
                    removeFromCollection(pendingRemove.cardId)
                    showToast('Removed from collection')
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

function CollectionAddModal({
  search,
  setSearch,
  searchResults,
  selectedCard,
  purchasePrice,
  setPurchasePrice,
  purchaseDate,
  setPurchaseDate,
  condition,
  setCondition,
  onAdd,
  onClose,
  onSelectCard,
}) {
  return (
    <ModalPortal>
      <div className="collection-modal-overlay" onClick={onClose}>
        <div className="collection-modal collection-add-modal" onClick={(event) => event.stopPropagation()}>
          <h3>Add Card to Collection</h3>
          <label className="collection-search-wrap">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search for a card to add..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="collection-search-results">
            {searchResults.map((card) => (
              <button
                type="button"
                key={card.id}
                className={`collection-search-item${selectedCard?.id === card.id ? ' selected' : ''}`}
                onClick={() => onSelectCard(card)}
              >
                <img src={card.image} alt={`${card.playerName} — ${card.set} ${card.parallel}`} />
                <div>
                  <p>{card.playerName}</p>
                  <p>{`${card.set} · ${card.parallel}`}</p>
                </div>
                <span className="font-number">{`$${card.currentPrice}`}</span>
              </button>
            ))}
          </div>

          {selectedCard && (
            <div className="collection-selected-card">
              <img src={selectedCard.image} alt={`${selectedCard.playerName} — ${selectedCard.set} ${selectedCard.parallel}`} />
              <div>
                <p className="selected-player">{selectedCard.playerName}</p>
                <p className="selected-set">{`${selectedCard.set} · ${selectedCard.parallel}`}</p>
              </div>
            </div>
          )}

          <div className="collection-modal-row">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Purchase price"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
            />
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </div>
          <select value={condition} onChange={(event) => setCondition(event.target.value)}>
            {CONDITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div className="collection-modal-actions">
            <button type="button" className="collection-secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="collection-primary-btn"
              onClick={onAdd}
              disabled={!selectedCard || !purchasePrice}
            >
              Add to Collection
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
