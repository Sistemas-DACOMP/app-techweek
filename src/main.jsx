import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { registerNotificationServiceWorker } from './lib/notifications.js'
import './index.css'
import './styles/motion.css'

registerNotificationServiceWorker().catch(() => {})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
