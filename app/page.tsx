'use client'

import { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  getSchedule,
  getScheduleLogs,
  pauseSchedule,
  resumeSchedule,
  triggerScheduleNow,
  cronToHuman,
  type Schedule,
  type ExecutionLog,
} from '@/lib/scheduler'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Clock,
  Mail,
  Plus,
  X,
  Play,
  Pause,
  History,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
} from 'lucide-react'

// Constants
const AGENT_ID = '698be3e9544d8929157d02a4'
const SCHEDULE_ID = '698be3f5ebe6fd87d1dcc0f0'

// Theme colors - Dashboard Pro Dark
const THEME_VARS = {
  '--background': '220 25% 7%',
  '--foreground': '220 15% 85%',
  '--card': '220 22% 10%',
  '--card-foreground': '220 15% 85%',
  '--popover': '220 20% 13%',
  '--popover-foreground': '220 15% 85%',
  '--primary': '220 80% 55%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '220 18% 16%',
  '--secondary-foreground': '220 15% 80%',
  '--accent': '160 70% 45%',
  '--accent-foreground': '0 0% 100%',
  '--destructive': '0 75% 55%',
  '--destructive-foreground': '0 0% 100%',
  '--muted': '220 15% 20%',
  '--muted-foreground': '220 12% 55%',
  '--border': '220 18% 18%',
  '--input': '220 15% 24%',
  '--ring': '220 80% 55%',
  '--radius': '0.125rem',
} as React.CSSProperties

// Types
interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
}

interface PortfolioSummary {
  totalValue: number
  dailyChange: number
  dailyChangePercent: number
  topGainer: { symbol: string; change: number }
  topLoser: { symbol: string; change: number }
}

interface AnalysisHistory {
  id: string
  timestamp: string
  stocks: string[]
  summary: string
  portfolioValue: number
  keyInsights: string[]
}

// Helper Functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getNextRunTimes(cron: string, timezone: string, count: number = 5): string[] {
  // Simplified calculation - in production, use a cron parser library
  const times: string[] = []
  const now = new Date()

  // Parse cron: minute hour day month dayOfWeek
  const parts = cron.split(' ')
  if (parts.length !== 5) return ['Invalid cron expression']

  const [minute, hour] = parts

  for (let i = 0; i < count; i++) {
    const next = new Date(now)
    next.setDate(next.getDate() + i)
    next.setHours(parseInt(hour), parseInt(minute), 0, 0)

    if (i === 0 && next < now) {
      next.setDate(next.getDate() + 1)
    }

    times.push(next.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }))
  }

  return times
}

// Sample data generator
function generateSampleStocks(): StockData[] {
  return [
    { symbol: 'AAPL', price: 185.50, change: 2.35, changePercent: 1.28, volume: 52340000 },
    { symbol: 'GOOGL', price: 142.80, change: -1.20, changePercent: -0.83, volume: 28450000 },
    { symbol: 'MSFT', price: 378.90, change: 4.50, changePercent: 1.20, volume: 31280000 },
    { symbol: 'TSLA', price: 248.30, change: -3.70, changePercent: -1.47, volume: 98760000 },
    { symbol: 'NVDA', price: 722.50, change: 8.90, changePercent: 1.25, volume: 42150000 },
  ]
}

function generateSampleSummary(stocks: StockData[]): PortfolioSummary {
  const totalValue = stocks.reduce((sum, s) => sum + s.price * 10, 0) // Assume 10 shares each
  const dailyChange = stocks.reduce((sum, s) => sum + s.change * 10, 0)
  const dailyChangePercent = (dailyChange / (totalValue - dailyChange)) * 100

  const sortedByChange = [...stocks].sort((a, b) => b.changePercent - a.changePercent)

  return {
    totalValue,
    dailyChange,
    dailyChangePercent,
    topGainer: { symbol: sortedByChange[0].symbol, change: sortedByChange[0].changePercent },
    topLoser: { symbol: sortedByChange[sortedByChange.length - 1].symbol, change: sortedByChange[sortedByChange.length - 1].changePercent },
  }
}

function generateSampleHistory(): AnalysisHistory[] {
  const now = Date.now()
  return [
    {
      id: '1',
      timestamp: new Date(now - 86400000).toISOString(),
      stocks: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'],
      summary: 'Strong market performance today with tech sector leading gains. Portfolio up 1.2% overall.',
      portfolioValue: 89750.50,
      keyInsights: [
        'NVDA showing exceptional strength on AI demand',
        'AAPL breaking resistance at $185',
        'Consider taking profits on TSLA',
      ],
    },
    {
      id: '2',
      timestamp: new Date(now - 172800000).toISOString(),
      stocks: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'],
      summary: 'Mixed signals across portfolio. Tech stocks consolidating after recent rally.',
      portfolioValue: 88680.25,
      keyInsights: [
        'Market volatility increasing',
        'MSFT earnings report upcoming',
        'Maintain current positions',
      ],
    },
  ]
}

export default function Home() {
  // Portfolio state
  const [portfolioStocks, setPortfolioStocks] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [newStock, setNewStock] = useState('')

  // Analysis state
  const [loading, setLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisHistory | null>(null)
  const [history, setHistory] = useState<AnalysisHistory[]>([])

  // Schedule state
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // UI state
  const [sampleDataMode, setSampleDataMode] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Sample data
  const sampleStocks = generateSampleStocks()
  const sampleSummary = generateSampleSummary(sampleStocks)
  const sampleHistory = generateSampleHistory()

  // Load from localStorage
  useEffect(() => {
    const savedStocks = localStorage.getItem('portfolio_stocks')
    const savedEmail = localStorage.getItem('portfolio_email')
    const savedHistory = localStorage.getItem('analysis_history')

    if (savedStocks) setPortfolioStocks(JSON.parse(savedStocks))
    if (savedEmail) setEmail(savedEmail)
    if (savedHistory) setHistory(JSON.parse(savedHistory))
  }, [])

  // Load schedule info
  useEffect(() => {
    loadSchedule()
    loadExecutionLogs()
  }, [])

  const loadSchedule = async () => {
    setScheduleLoading(true)
    const result = await getSchedule(SCHEDULE_ID)
    if (result.success && result.schedule) {
      setSchedule(result.schedule)
    }
    setScheduleLoading(false)
  }

  const loadExecutionLogs = async () => {
    setLogsLoading(true)
    const result = await getScheduleLogs(SCHEDULE_ID, { limit: 10 })
    if (result.success) {
      setExecutionLogs(result.executions)
    }
    setLogsLoading(false)
  }

  const handleAddStock = () => {
    const symbol = newStock.trim().toUpperCase()
    if (symbol && !portfolioStocks.includes(symbol)) {
      const updated = [...portfolioStocks, symbol]
      setPortfolioStocks(updated)
      localStorage.setItem('portfolio_stocks', JSON.stringify(updated))
      setNewStock('')
    }
  }

  const handleRemoveStock = (symbol: string) => {
    const updated = portfolioStocks.filter(s => s !== symbol)
    setPortfolioStocks(updated)
    localStorage.setItem('portfolio_stocks', JSON.stringify(updated))
  }

  const handleSaveEmail = () => {
    localStorage.setItem('portfolio_email', email)
    setError('')
    setAnalysisResult('Email settings saved successfully')
  }

  const handleRunAnalysis = async () => {
    if (portfolioStocks.length === 0) {
      setError('Please add stocks to your portfolio first')
      return
    }
    if (!email) {
      setError('Please set an email address for delivery')
      return
    }

    setLoading(true)
    setError('')
    setAnalysisResult('')

    const message = `Analyze portfolio: ${portfolioStocks.join(',')} and send email to ${email}`
    const result = await callAIAgent(message, AGENT_ID)

    setLoading(false)

    if (result.success) {
      const response = result?.response
      setAnalysisResult('Analysis completed and email sent successfully')

      // Save to history
      const newHistory: AnalysisHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        stocks: [...portfolioStocks],
        summary: response?.result?.summary || 'Analysis completed',
        portfolioValue: 0,
        keyInsights: Array.isArray(response?.result?.insights) ? response.result.insights : [],
      }

      const updatedHistory = [newHistory, ...history]
      setHistory(updatedHistory)
      setLastAnalysis(newHistory)
      localStorage.setItem('analysis_history', JSON.stringify(updatedHistory))
    } else {
      setError(result.error || 'Analysis failed')
    }
  }

  const handleToggleSchedule = async () => {
    if (!schedule) return

    setScheduleLoading(true)
    const result = schedule.is_active
      ? await pauseSchedule(SCHEDULE_ID)
      : await resumeSchedule(SCHEDULE_ID)

    if (result.success) {
      await loadSchedule()
    } else {
      setError(result.error || 'Failed to toggle schedule')
    }
    setScheduleLoading(false)
  }

  const handleTriggerNow = async () => {
    setScheduleLoading(true)
    const result = await triggerScheduleNow(SCHEDULE_ID)

    if (result.success) {
      setAnalysisResult('Manual analysis triggered - check email shortly')
      setTimeout(loadExecutionLogs, 2000)
    } else {
      setError(result.error || 'Failed to trigger analysis')
    }
    setScheduleLoading(false)
  }

  const displayStocks = sampleDataMode ? sampleStocks : []
  const displaySummary = sampleDataMode ? sampleSummary : null
  const displayHistory = sampleDataMode ? sampleHistory : history
  const currentPortfolio = sampleDataMode ? sampleStocks.map(s => s.symbol) : portfolioStocks

  return (
    <div style={THEME_VARS} className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stock Portfolio Analyst</h1>
            <p className="mt-1 text-sm text-muted-foreground">Automated morning briefings powered by AI</p>
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="sample-toggle" className="text-sm text-muted-foreground">Sample Data</Label>
            <Switch
              id="sample-toggle"
              checked={sampleDataMode}
              onCheckedChange={setSampleDataMode}
            />
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Portfolio Summary Cards */}
            {sampleDataMode && displaySummary && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(displaySummary.totalValue)}</div>
                    <p className={`mt-1 flex items-center text-sm ${displaySummary.dailyChangePercent >= 0 ? 'text-accent' : 'text-destructive'}`}>
                      {displaySummary.dailyChangePercent >= 0 ? <TrendingUp className="mr-1 h-4 w-4" /> : <TrendingDown className="mr-1 h-4 w-4" />}
                      {formatPercent(displaySummary.dailyChangePercent)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Daily Change</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${displaySummary.dailyChange >= 0 ? 'text-accent' : 'text-destructive'}`}>
                      {formatCurrency(displaySummary.dailyChange)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Top Gainer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{displaySummary.topGainer.symbol}</div>
                    <Badge className="mt-1 bg-accent text-accent-foreground">
                      {formatPercent(displaySummary.topGainer.change)}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Top Loser</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{displaySummary.topLoser.symbol}</div>
                    <Badge className="mt-1 bg-destructive text-destructive-foreground">
                      {formatPercent(displaySummary.topLoser.change)}
                    </Badge>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Stock Holdings Table */}
            {sampleDataMode && displayStocks.length > 0 ? (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Current Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border text-left text-sm text-muted-foreground">
                          <th className="pb-3 font-medium">Symbol</th>
                          <th className="pb-3 font-medium">Price</th>
                          <th className="pb-3 font-medium">Change</th>
                          <th className="pb-3 font-medium">Change %</th>
                          <th className="pb-3 font-medium">Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayStocks.map((stock) => (
                          <tr key={stock.symbol} className="border-b border-border/50">
                            <td className="py-3 font-semibold">{stock.symbol}</td>
                            <td className="py-3">{formatCurrency(stock.price)}</td>
                            <td className={`py-3 ${stock.change >= 0 ? 'text-accent' : 'text-destructive'}`}>
                              {formatCurrency(stock.change)}
                            </td>
                            <td className={`py-3 ${stock.changePercent >= 0 ? 'text-accent' : 'text-destructive'}`}>
                              {formatPercent(stock.changePercent)}
                            </td>
                            <td className="py-3 text-muted-foreground">{stock.volume.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : !sampleDataMode && (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Data Available</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add stocks to your portfolio and run an analysis to see data here.
                  </p>
                  <Button onClick={() => setActiveTab('portfolio')} className="mt-4 bg-primary text-primary-foreground">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stocks
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Last Analysis Preview */}
            {(sampleDataMode ? sampleHistory[0] : lastAnalysis) && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Latest Analysis</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {formatTimestamp((sampleDataMode ? sampleHistory[0] : lastAnalysis)?.timestamp || '')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{(sampleDataMode ? sampleHistory[0] : lastAnalysis)?.summary}</p>

                  {Array.isArray((sampleDataMode ? sampleHistory[0] : lastAnalysis)?.keyInsights) &&
                    (sampleDataMode ? sampleHistory[0] : lastAnalysis).keyInsights.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Key Insights</h4>
                      <ul className="space-y-1">
                        {(sampleDataMode ? sampleHistory[0] : lastAnalysis).keyInsights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Panel */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  onClick={handleRunAnalysis}
                  disabled={loading || portfolioStocks.length === 0 || !email}
                  className="bg-primary text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Run Analysis Now
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleTriggerNow}
                  disabled={scheduleLoading}
                  variant="secondary"
                  className="bg-secondary text-secondary-foreground"
                >
                  {scheduleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Trigger Scheduled Run
                </Button>

                {displayHistory.length > 0 && (
                  <Button
                    onClick={() => setActiveTab('history')}
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground"
                  >
                    <History className="mr-2 h-4 w-4" />
                    View History
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Status Messages */}
            {error && (
              <div className="flex items-center gap-2 rounded border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {analysisResult && (
              <div className="flex items-center gap-2 rounded border border-accent bg-accent/10 px-4 py-3 text-sm text-accent">
                <Check className="h-4 w-4" />
                {analysisResult}
              </div>
            )}

            {/* Schedule Status Widget */}
            {schedule && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Schedule Status</CardTitle>
                    <Badge variant={schedule.is_active ? 'default' : 'secondary'} className={schedule.is_active ? 'bg-accent text-accent-foreground' : ''}>
                      {schedule.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Schedule:</span>
                    <span className="font-medium">{cronToHuman(schedule.cron_expression)}</span>
                  </div>

                  {schedule.next_run_time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next Run:</span>
                      <span className="font-medium">{formatTimestamp(schedule.next_run_time)}</span>
                    </div>
                  )}

                  {schedule.last_run_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Run:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatTimestamp(schedule.last_run_at)}</span>
                        {schedule.last_run_success !== null && (
                          schedule.last_run_success ? (
                            <Check className="h-4 w-4 text-accent" />
                          ) : (
                            <X className="h-4 w-4 text-destructive" />
                          )
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Manage Portfolio</CardTitle>
                <CardDescription className="text-muted-foreground">Add or remove stocks to track in your daily analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter stock symbol (e.g., AAPL)"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                    className="bg-input border-border"
                  />
                  <Button onClick={handleAddStock} className="bg-primary text-primary-foreground">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {currentPortfolio.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {currentPortfolio.map((symbol) => (
                      <div
                        key={symbol}
                        className="flex items-center justify-between rounded border border-border bg-secondary px-3 py-2"
                      >
                        <span className="font-semibold">{symbol}</span>
                        {!sampleDataMode && (
                          <button
                            onClick={() => handleRemoveStock(symbol)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No stocks in portfolio. Add symbols above to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Email Delivery Settings</CardTitle>
                <CardDescription className="text-muted-foreground">Configure where to receive your daily briefings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="investor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>

                <Button onClick={handleSaveEmail} className="bg-primary text-primary-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  Save Email Settings
                </Button>

                {schedule && (
                  <div className="mt-6 space-y-3 rounded border border-border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold">Current Schedule</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Time:</span>
                        <span className="font-medium">{cronToHuman(schedule.cron_expression)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timezone:</span>
                        <span className="font-medium">{schedule.timezone}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            {schedule ? (
              <>
                {/* Schedule Overview */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">Schedule Overview</CardTitle>
                      <Badge variant={schedule.is_active ? 'default' : 'secondary'} className={schedule.is_active ? 'bg-accent text-accent-foreground' : ''}>
                        {schedule.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cron Expression:</span>
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{schedule.cron_expression}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Human Readable:</span>
                        <span className="font-medium">{cronToHuman(schedule.cron_expression)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timezone:</span>
                        <span className="font-medium">{schedule.timezone}</span>
                      </div>
                      {schedule.next_run_time && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next Run:</span>
                          <span className="font-medium">{formatTimestamp(schedule.next_run_time)}</span>
                        </div>
                      )}
                      {schedule.last_run_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Run:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatTimestamp(schedule.last_run_at)}</span>
                            {schedule.last_run_success !== null && (
                              schedule.last_run_success ? (
                                <Check className="h-4 w-4 text-accent" />
                              ) : (
                                <X className="h-4 w-4 text-destructive" />
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="bg-border" />

                    <div className="flex gap-2">
                      <Button
                        onClick={handleToggleSchedule}
                        disabled={scheduleLoading}
                        variant="secondary"
                        className="bg-secondary text-secondary-foreground"
                      >
                        {scheduleLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : schedule.is_active ? (
                          <Pause className="mr-2 h-4 w-4" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        {schedule.is_active ? 'Pause Schedule' : 'Resume Schedule'}
                      </Button>

                      <Button
                        onClick={handleTriggerNow}
                        disabled={scheduleLoading}
                        className="bg-primary text-primary-foreground"
                      >
                        {scheduleLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Run Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Runs */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Next 5 Scheduled Runs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {getNextRunTimes(schedule.cron_expression, schedule.timezone).map((time, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{time}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Execution History */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">Execution History</CardTitle>
                      <Button
                        onClick={loadExecutionLogs}
                        disabled={logsLoading}
                        variant="secondary"
                        size="sm"
                        className="bg-secondary text-secondary-foreground"
                      >
                        {logsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {executionLogs.length > 0 ? (
                      <ScrollArea className="h-80">
                        <div className="space-y-2">
                          {executionLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between rounded border border-border bg-secondary/50 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-3">
                                {log.success ? (
                                  <Check className="h-4 w-4 text-accent" />
                                ) : (
                                  <X className="h-4 w-4 text-destructive" />
                                )}
                                <span>{formatTimestamp(log.executed_at)}</span>
                              </div>
                              <Badge variant={log.success ? 'default' : 'secondary'} className={log.success ? 'bg-accent text-accent-foreground' : 'bg-destructive text-destructive-foreground'}>
                                {log.success ? 'Success' : 'Failed'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No execution history available yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  {scheduleLoading ? (
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">Schedule Not Found</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Unable to load schedule information
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Analysis History</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {displayHistory.length} {displayHistory.length === 1 ? 'analysis' : 'analyses'} recorded
                </CardDescription>
              </CardHeader>
              <CardContent>
                {displayHistory.length > 0 ? (
                  <div className="space-y-3">
                    {displayHistory.map((item) => (
                      <div key={item.id} className="rounded border border-border bg-secondary/30 p-4">
                        <div
                          className="flex cursor-pointer items-center justify-between"
                          onClick={() => setExpandedHistory(expandedHistory === item.id ? null : item.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{formatTimestamp(item.timestamp)}</span>
                              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                {item.stocks.length} stocks
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{item.summary}</p>
                          </div>
                          {expandedHistory === item.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {expandedHistory === item.id && (
                          <div className="mt-4 space-y-3 border-t border-border pt-4">
                            <div>
                              <h4 className="mb-2 text-sm font-semibold">Summary</h4>
                              <p className="text-sm text-muted-foreground">{item.summary}</p>
                            </div>

                            <div>
                              <h4 className="mb-2 text-sm font-semibold">Stocks Analyzed</h4>
                              <div className="flex flex-wrap gap-2">
                                {item.stocks.map((symbol) => (
                                  <Badge key={symbol} variant="secondary" className="bg-muted">
                                    {symbol}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {Array.isArray(item.keyInsights) && item.keyInsights.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-sm font-semibold">Key Insights</h4>
                                <ul className="space-y-1">
                                  {item.keyInsights.map((insight, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                                      {insight}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <History className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No History Available</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Run your first analysis to start building history
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Agent Info */}
        <Card className="mt-6 bg-card border-border">
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-muted-foreground">Powered by Stock Analysis Agent</span>
              </div>
              <span className="font-mono text-muted-foreground">{AGENT_ID}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
