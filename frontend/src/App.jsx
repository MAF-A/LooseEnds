import { useState, useEffect } from 'react'
import CodeInput from './components/CodeInput'
import ReportView from './components/ReportView'
import GuidePanel from './components/GuidePanel'
import SettingsModal from './components/SettingsModal'
import ParticleBackground from './components/ParticleBackground'
import { runEngine } from './api/review'
import { 
  FaCodeCompare, FaGear, FaGithub, FaBolt, 
  FaWandMagicSparkles, FaBatteryHalf, FaMoon, FaSun 
} from 'react-icons/fa6'
import './styles/index.css'

export default function App() {
  const [report, setReport] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentCode, setCurrentCode] = useState('')
  const [appliedFixes, setAppliedFixes] = useState(new Set())

  const [apiKey, setApiKey] = useState(localStorage.getItem('looseends_api_key') || '')
  const [reducedGraphics, setReducedGraphics] = useState(localStorage.getItem('looseends_graphics') !== 'high')
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('looseends_theme') !== 'light')

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('looseends_api_key', apiKey)
    localStorage.setItem('looseends_graphics', reducedGraphics ? 'reduced' : 'high')
    localStorage.setItem('looseends_theme', isDarkMode ? 'dark' : 'light')
    
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode')
    } else {
      document.documentElement.classList.add('light-mode')
    }
  }, [apiKey, reducedGraphics, isDarkMode])

  if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    return (
      <div className="app-shell" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h1>404 - Loose End</h1>
        <p style={{ color: 'var(--text-muted)' }}>This page doesn't exist.</p>
        <a href="/" style={{ color: 'var(--accent)', fontWeight: '600' }}>Go back to safety</a>
      </div>
    )
  }

  async function handleSubmit(payload) {
    setLoading(true)
    setError(null)
    setReport(null)
    setTimeline(null)
    setCurrentCode(payload.code)
    setAppliedFixes(new Set()) 
    
    try {
      const data = await runEngine({ ...payload, apiKey })
      
      setTimeline(data.timeline)
      setCurrentCode(data.final_code)
      
      // Mark all issues as applied since the backend did the work
      const newSet = new Set()
      data.issues.forEach((issue, index) => {
        newSet.add(`${issue.line}-${issue.type}-${index}`)
      })
      setAppliedFixes(newSet)

      setReport({
        summary: data.summary,
        issues: data.issues
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ParticleBackground reducedGraphics={reducedGraphics} isDarkMode={isDarkMode} />
      
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <FaCodeCompare className="brand-icon" aria-hidden="true" />
            <div>
              <h1>LooseEnds</h1>
              <p className="tagline">The knot tying vibe and code</p>
            </div>
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="icon-btn" 
                onClick={() => setIsDarkMode(!isDarkMode)}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
              </button>

              <button 
                type="button" 
                className="icon-btn" 
                onClick={() => setReducedGraphics(!reducedGraphics)}
                title={reducedGraphics ? "Enable High Graphics" : "Reduce Graphics"}
              >
                {reducedGraphics ? <FaWandMagicSparkles size={18} /> : <FaBatteryHalf size={18} />}
              </button>

              <button 
                type="button" 
                className="icon-btn" 
                onClick={() => setIsSettingsOpen(true)}
                title="Settings"
              >
                <FaGear size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <div className="app-body">
          <main className="app-main">
            <CodeInput 
              onSubmit={handleSubmit} 
              loading={loading} 
              initialCode={currentCode} 
              isDarkMode={isDarkMode}
            />

            {error && (
              <div className="error-box" role="alert">
                <strong>Engine failed.</strong>
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className="loading-box" aria-live="polite">
                <span className="spinner" aria-hidden="true" />
                <span>Running Definitive Engine (Reviewing, Fuzzing, Auto-fixing)...</span>
              </div>
            )}

            {timeline && (
              <div className="timeline-panel">
                <h3 className="timeline-title">Engine Execution Timeline</h3>
                <ul className="timeline-list">
                  {timeline.map((step, idx) => (
                    <li key={idx} className={`timeline-step ${step.status}`}>
                      <span className="timeline-dot" />
                      <div className="timeline-content">
                        <strong>{step.step}</strong>
                        <p>{step.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ReportView 
              report={report} 
              codeLines={currentCode.split('\n')} 
              appliedFixes={appliedFixes}
              originalCode={currentCode}
            />
          </main>

          <GuidePanel />
        </div>

        <footer className="app-footer">
          <div className="footer-left">
            <span>Built for the Nebius x NVIDIA Hackathon</span>
          </div>
          <div className="footer-right">
            <a href="https://github.com/your-username/looseends" target="_blank" rel="noreferrer">
              <FaGithub aria-hidden="true" /> GitHub
            </a>
            <span className="footer-divider">|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FaBolt style={{ color: '#76b900' }} aria-hidden="true" /> Powered by NVIDIA Nemotron
            </span>
          </div>
        </footer>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          apiKey={apiKey} 
          setApiKey={setApiKey} 
        />
      </div>
    </>
  )
}