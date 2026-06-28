// ── INICIO: CyberHUD (top nav + resources) ──
// Le recursos do budget do engine. Formato tipo Cyberpunk HUD: pestañas
// estáticas + tres contadores grandes (€$, Components, Street Cred).

import type { TreeEngine } from '@yggdrasil-forge/core'
import type { JSX } from 'react'

interface CyberHUDProps {
  readonly engine: TreeEngine
}

const TABS = ['TRADE', 'CYBERWARE', 'CHARACTER', 'MAP', 'JOURNAL']

export function CyberHUD({ engine }: CyberHUDProps): JSX.Element {
  const budget = engine.getBudget()
  const r = budget.resources
  const eurodollars = (r.eurodollars ?? 0).toLocaleString('en-US')
  const components = (r.components ?? 0).toLocaleString('en-US')
  const streetCred = (r.street_cred ?? 0).toLocaleString('en-US')

  return (
    <header className="cyber-hud" data-augmented-ui="border bl-clip br-clip">
      <div className="cyber-hud__brand">
        <div className="cyber-hud__brand-icon" aria-hidden="true">
          ◈
        </div>
        <div>
          <div className="cyber-hud__brand-title">RIPPERDOC</div>
          <div className="cyber-hud__brand-sub">VIKTOR VEKTOR</div>
        </div>
      </div>
      <nav className="cyber-hud__nav" aria-label="Sections">
        {TABS.map((t, i) => (
          <div
            key={t}
            className={`cyber-hud__tab${t === 'CYBERWARE' ? ' cyber-hud__tab--active' : ''}`}
          >
            <span className="cyber-hud__tab-index">{i + 1}</span>
            <span className="cyber-hud__tab-label">{t}</span>
          </div>
        ))}
      </nav>
      <div className="cyber-hud__resources">
        <div className="cyber-hud__resource">
          <span className="cyber-hud__resource-icon" style={{ color: '#f0a830' }}>
            €$
          </span>
          <span className="cyber-hud__resource-value">{eurodollars}</span>
          <span className="cyber-hud__resource-label">EURODOLLARS</span>
        </div>
        <div className="cyber-hud__resource">
          <span className="cyber-hud__resource-icon" style={{ color: '#7fd4d8' }}>
            ◫
          </span>
          <span className="cyber-hud__resource-value">{components}</span>
          <span className="cyber-hud__resource-label">COMPONENTS</span>
        </div>
        <div className="cyber-hud__resource">
          <span className="cyber-hud__resource-icon" style={{ color: '#9ad06a' }}>
            ◉
          </span>
          <span className="cyber-hud__resource-value">{streetCred}</span>
          <span className="cyber-hud__resource-label">STREET CRED</span>
        </div>
      </div>
    </header>
  )
}
// ── FIN: CyberHUD ──
