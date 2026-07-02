import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { Activity, ShieldAlert, AlertTriangle, FileText, Loader2, RefreshCw } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API_URL}/dashboard/summary`)
      setData(res.data)
    } catch (err) {
      console.error("Failed to fetch dashboard summary", err)
      setError("Failed to load dashboard data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  if (loading && !data) {
    return (
      <div className="loading-state">
        <Loader2 size={48} className="spinner" />
        <p>Loading dashboard data...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">
          <Activity size={32} color="var(--primary-color)" />
          MALAK Clinician Dashboard
        </h1>
        <button 
          onClick={fetchSummary}
          style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '8px 16px', 
            background: 'white', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      {error && <div className="error-state">{error}</div>}

      {data && (
        <>
          <div className="summary-cards">
            <div className="card high-risk">
              <div className="card-title">
                <ShieldAlert size={16} color="var(--risk-high-text)" />
                High Risk Claims (This Week)
              </div>
              <div className="card-value">{data.weekly.high_risk}</div>
            </div>
            
            <div className="card medium-risk">
              <div className="card-title">
                <AlertTriangle size={16} color="var(--risk-medium-text)" />
                Medium Risk Claims (This Week)
              </div>
              <div className="card-value">{data.weekly.medium_risk}</div>
            </div>

            <div className="card total-checks">
              <div className="card-title">
                <FileText size={16} color="var(--primary-color)" />
                Total Checks (This Week)
              </div>
              <div className="card-value">{data.weekly.total_checks}</div>
            </div>
          </div>

          <div className="chart-section">
            <h2 className="chart-title">Daily Checks (Past 7 Days)</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.trend}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(tick) => {
                      const date = new Date(tick);
                      return `${date.getMonth()+1}/${date.getDate()}`;
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="count" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
