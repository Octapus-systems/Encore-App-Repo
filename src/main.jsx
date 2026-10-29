import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { installScrollReveal, installTapFx } from '@/lib/fx'

installTapFx()
installScrollReveal()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
