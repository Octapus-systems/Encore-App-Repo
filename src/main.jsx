import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { installScrollCalm, installScrollReveal, installTapFx } from '@/lib/fx'

installTapFx()
installScrollReveal()
installScrollCalm()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
