import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'
import './styles/tailwind.css'
import '@xterm/xterm/css/xterm.css'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
