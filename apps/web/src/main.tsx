import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const host = document.getElementById('root')
if (host === null) throw new Error('Élément racine introuvable')

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
