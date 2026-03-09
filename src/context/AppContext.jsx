/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { cards } from '../data/cards'
import { userPreferences as defaultUserPreferences } from '../data/userPreferences'

const AppContext = createContext(null)

const initialState = {
  watchlist: ['card-24', 'card-18', 'card-3', 'card-15', 'card-20', 'card-12'],
  collection: [
    { cardId: 'card-1', purchasePrice: 78, purchaseDate: '2025-11-08', condition: 'Raw' },
    { cardId: 'card-34', purchasePrice: 57, purchaseDate: '2026-01-13', condition: 'PSA 9' },
    { cardId: 'card-21', purchasePrice: 104, purchaseDate: '2025-10-30', condition: 'Raw NM' },
    { cardId: 'card-24', purchasePrice: 138, purchaseDate: '2026-01-20', condition: 'PSA 10' },
    { cardId: 'card-10', purchasePrice: 46, purchaseDate: '2025-09-16', condition: 'Raw' },
    { cardId: 'card-15', purchasePrice: 262, purchaseDate: '2025-10-04', condition: 'PSA 9' },
    { cardId: 'card-8', purchasePrice: 11450, purchaseDate: '2025-06-21', condition: 'PSA 8' },
    { cardId: 'card-12', purchasePrice: 67, purchaseDate: '2025-07-30', condition: 'Raw NM' },
  ],
  userPreferences: {
    name: '',
    email: '',
    sports: [],
    teams: [],
    players: [],
    style: [],
    budget: '',
    experience: '',
    notes: '',
  },
  theme: 'dark',
  notifications: {
    priceDropAlerts: true,
    newListings: true,
    marketIntel: true,
  },
  onboardingComplete: false,
}

const LIGHT_THEME_VARS = {
  '--color-bg': '#F8F9FA',
  '--color-surface': '#FFFFFF',
  '--color-surface-alt': '#F1F3F5',
  '--color-border': '#DEE2E6',
  '--color-text-primary': '#111827',
  '--color-text-secondary': '#6B7280',
}

const DARK_THEME_VARS = {
  '--color-bg': '#0F1117',
  '--color-surface': '#1A1B23',
  '--color-surface-alt': '#232430',
  '--color-border': '#2E2F3E',
  '--color-text-primary': '#F9FAFB',
  '--color-text-secondary': '#9CA3AF',
}

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState)
  const [toasts, setToasts] = useState([])
  const [watchlistMeta, setWatchlistMeta] = useState(() =>
    Object.fromEntries(
      initialState.watchlist.map((cardId, index) => {
        const card = cards.find((entry) => entry.id === cardId)
        return [
          cardId,
          {
            addedAt: new Date(Date.now() - index * 86400000).toISOString(),
            alertBelow: card ? Math.max(1, Math.round(card.currentPrice * 0.9)) : 0,
            dropThresholdPct: 5,
            spikeThresholdPct: 8,
            notifyPush: true,
            notifyEmail: false,
          },
        ]
      }),
    ),
  )

  useEffect(() => {
    const root = document.documentElement
    const vars = state.theme === 'light' ? LIGHT_THEME_VARS : DARK_THEME_VARS
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [state.theme])

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3000)
  }

  const value = useMemo(
    () => ({
      ...state,
      toasts,
      watchlistMeta,
      dismissToast: (id) =>
        setToasts((prev) => prev.filter((toast) => toast.id !== id)),
      showToast,
      completeOnboarding: (preferences) =>
        setState((prev) => ({
          ...prev,
          userPreferences: preferences,
          onboardingComplete: true,
        })),
      updateUserPreferences: (preferences) =>
        setState((prev) => ({
          ...prev,
          userPreferences: {
            ...prev.userPreferences,
            ...preferences,
          },
        })),
      setTheme: (theme) =>
        setState((prev) => ({
          ...prev,
          theme,
        })),
      updateNotifications: (updates) =>
        setState((prev) => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            ...updates,
          },
        })),
      skipOnboardingWithDefaults: () =>
        setState((prev) => ({
          ...prev,
          userPreferences: {
            name: defaultUserPreferences.name ?? '',
            email: defaultUserPreferences.email ?? '',
            sports: defaultUserPreferences.sports,
            teams: defaultUserPreferences.teams,
            players: defaultUserPreferences.favoritePlayers,
            style: defaultUserPreferences.collectingStyle,
            budget: defaultUserPreferences.budgetRange,
            experience: defaultUserPreferences.experienceLevel,
            notes: '',
          },
          onboardingComplete: true,
        })),
      addToWatchlist: (cardOrId, options = { notify: true }) => {
        let didAdd = false
        setState((prev) => {
          const cardId = typeof cardOrId === 'string' ? cardOrId : cardOrId?.id
          if (!cardId || prev.watchlist.includes(cardId)) {
            return prev
          }
          const card = cards.find((entry) => entry.id === cardId)
          setWatchlistMeta((meta) => ({
            ...meta,
            [cardId]: {
              addedAt: new Date().toISOString(),
              alertBelow: card ? Math.max(1, Math.round(card.currentPrice * 0.9)) : 0,
              dropThresholdPct: 5,
              spikeThresholdPct: 8,
              notifyPush: true,
              notifyEmail: false,
            },
          }))
          didAdd = true
          return { ...prev, watchlist: [cardId, ...prev.watchlist] }
        })
        if (didAdd && options.notify !== false) {
          showToast('Added to watchlist ✓')
        }
      },
      removeFromWatchlist: (cardId) =>
        setState((prev) => ({
          ...prev,
          watchlist: prev.watchlist.filter((id) => id !== cardId),
        })),
      updateWatchlistAlert: (cardId, updates) =>
        setWatchlistMeta((prev) => ({
          ...prev,
          [cardId]: {
            ...prev[cardId],
            ...updates,
          },
        })),
      addToCollection: (payload, options = { notify: true }) => {
        let didAdd = false
        setState((prev) => {
          const cardId =
            typeof payload === 'string'
              ? payload
              : payload?.cardId ?? payload?.card?.id ?? payload?.id

          if (!cardId || prev.collection.some((entry) => entry.cardId === cardId)) {
            return prev
          }

          const card = cards.find((entry) => entry.id === cardId)
          const purchasePrice =
            payload?.purchasePrice ?? card?.currentPrice ?? 0
          const purchaseDate =
            payload?.purchaseDate ?? new Date().toISOString().slice(0, 10)
          const condition = payload?.condition ?? card?.condition ?? 'Raw'

          didAdd = true

          return {
            ...prev,
            collection: [{ cardId, purchasePrice, purchaseDate, condition }, ...prev.collection],
          }
        })
        if (didAdd && options.notify !== false) {
          showToast('Added to collection ✓')
        }
      },
      removeFromCollection: (cardId) =>
        setState((prev) => ({
          ...prev,
          collection: prev.collection.filter((entry) => entry.cardId !== cardId),
        })),
      updateCollectionItem: (cardId, updates) =>
        setState((prev) => ({
          ...prev,
          collection: prev.collection.map((entry) =>
            entry.cardId === cardId
              ? {
                  ...entry,
                  ...updates,
                }
              : entry,
          ),
        })),
      isOnWatchlist: (cardId) => state.watchlist.includes(cardId),
      isInCollection: (cardId) => state.collection.some((entry) => entry.cardId === cardId),
    }),
    [state, toasts, watchlistMeta],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
