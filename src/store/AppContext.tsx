import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import type { Portfolio, Watchlist, AppSettings, Quote, Order, Trade, PerformanceSnapshot } from '../types'
import { getAllPortfolios, savePortfolio, deletePortfolio, getAllWatchlists, saveWatchlist, deleteWatchlist } from '../db'
import { defaultPortfolioSettings } from '../lib/trading'

interface AppState {
  portfolios: Portfolio[]
  activePortfolioId: string | null
  watchlists: Watchlist[]
  settings: AppSettings
  quotes: Record<string, Quote>
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'SET_PORTFOLIOS'; portfolios: Portfolio[] }
  | { type: 'ADD_PORTFOLIO'; portfolio: Portfolio }
  | { type: 'UPDATE_PORTFOLIO'; portfolio: Portfolio }
  | { type: 'DELETE_PORTFOLIO'; id: string }
  | { type: 'SET_ACTIVE_PORTFOLIO'; id: string | null }
  | { type: 'SET_WATCHLISTS'; watchlists: Watchlist[] }
  | { type: 'ADD_WATCHLIST'; watchlist: Watchlist }
  | { type: 'UPDATE_WATCHLIST'; watchlist: Watchlist }
  | { type: 'DELETE_WATCHLIST'; id: string }
  | { type: 'SET_QUOTES'; quotes: Record<string, Quote> }
  | { type: 'UPDATE_QUOTE'; symbol: string; quote: Quote }
  | { type: 'SET_SETTINGS'; settings: AppSettings }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }

const defaultSettings: AppSettings = {
  theme: 'system',
  dateFormat: 'MM/DD/YYYY',
  numberFormat: 'en-US',
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  defaultCurrency: 'USD',
  chartDefaults: {
    chartStyle: 'candles',
    timeframe: '1D',
    showVolume: true,
    showGrid: true,
  },
  defaultSimulationSettings: defaultPortfolioSettings(),
  globalCurrencyConversionFee: 0.5,
  searchDisabled: false,
  searchDisabledCategories: [],
  finnhubApiKey: '',
  twelveDataApiKey: '',
  exchangeRateApiKey: '',
  undoWarningEnabled: true,
  forkWarningEnabled: true,
}

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('app_settings')
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) }
  } catch { }
  return defaultSettings
}

function persistSettings(settings: AppSettings) {
  localStorage.setItem('app_settings', JSON.stringify(settings))
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PORTFOLIOS':
      return { ...state, portfolios: action.portfolios }
    case 'ADD_PORTFOLIO':
      return { ...state, portfolios: [...state.portfolios, action.portfolio] }
    case 'UPDATE_PORTFOLIO':
      return {
        ...state,
        portfolios: state.portfolios.map((p) =>
          p.id === action.portfolio.id ? action.portfolio : p
        ),
      }
    case 'DELETE_PORTFOLIO':
      return {
        ...state,
        portfolios: state.portfolios.filter((p) => p.id !== action.id),
        activePortfolioId:
          state.activePortfolioId === action.id ? null : state.activePortfolioId,
      }
    case 'SET_ACTIVE_PORTFOLIO':
      return { ...state, activePortfolioId: action.id }
    case 'SET_WATCHLISTS':
      return { ...state, watchlists: action.watchlists }
    case 'ADD_WATCHLIST':
      return { ...state, watchlists: [...state.watchlists, action.watchlist] }
    case 'UPDATE_WATCHLIST':
      return {
        ...state,
        watchlists: state.watchlists.map((w) =>
          w.id === action.watchlist.id ? action.watchlist : w
        ),
      }
    case 'DELETE_WATCHLIST':
      return {
        ...state,
        watchlists: state.watchlists.filter((w) => w.id !== action.id),
      }
    case 'SET_QUOTES':
      return { ...state, quotes: action.quotes }
    case 'UPDATE_QUOTE':
      return {
        ...state,
        quotes: { ...state.quotes, [action.symbol]: action.quote },
      }
    case 'SET_SETTINGS':
      persistSettings(action.settings)
      return { ...state, settings: action.settings }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
  activePortfolio: Portfolio | undefined
  refreshData: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    portfolios: [],
    activePortfolioId: null,
    watchlists: [],
    settings: loadSettings(),
    quotes: {},
    loading: true,
    error: null,
  })

  const refreshData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true })
    try {
      const portfolios = await getAllPortfolios()
      dispatch({ type: 'SET_PORTFOLIOS', portfolios })
      const watchlists = await getAllWatchlists()
      dispatch({ type: 'SET_WATCHLISTS', watchlists })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: String(err) })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  useEffect(() => {
    if (state.settings.finnhubApiKey) {
      localStorage.setItem('finnhub_api_key', state.settings.finnhubApiKey)
    }
    if (state.settings.twelveDataApiKey) {
      localStorage.setItem('twelvedata_api_key', state.settings.twelveDataApiKey)
    }
    if (state.settings.exchangeRateApiKey) {
      localStorage.setItem('exchangerate_api_key', state.settings.exchangeRateApiKey)
    }
  }, [state.settings])

  const activePortfolio = state.portfolios.find(
    (p) => p.id === state.activePortfolioId
  )

  return (
    <AppContext.Provider value={{ state, dispatch, activePortfolio, refreshData }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
