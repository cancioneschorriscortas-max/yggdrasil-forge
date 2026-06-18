import { NORSE_ICONS, registerIcons } from '@yggdrasil-forge/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import './styles.css'

// F10.5b: opt-in dos iconos Norse antes de calquera render. Os IDs
// `norse-*` quedan dispoñibles para `node.icon` no `tree-def.ts`.
registerIcons(NORSE_ICONS)

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root container not found')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
