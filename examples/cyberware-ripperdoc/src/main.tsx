import { registerIcons } from '@yggdrasil-forge/react'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import { CYBER_ICONS } from './cyberIcons.js'
import 'augmented-ui/augmented-ui.min.css'
import './styles.css'

// Rexistrar iconas cyberware antes de montar (top-level, idempotente).
registerIcons(CYBER_ICONS)

const container = document.getElementById('root')
if (container === null) throw new Error('#root not found')
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
