import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme.css'

document.documentElement.dataset.theme =
  localStorage.getItem('artifact-theme') === 'light'
    ? 'light'
    : 'dark'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
