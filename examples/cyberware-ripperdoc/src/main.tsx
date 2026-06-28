import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import 'augmented-ui/augmented-ui.min.css'
import './styles.css'

const container = document.getElementById('root')
if (container === null) throw new Error('#root not found')
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
