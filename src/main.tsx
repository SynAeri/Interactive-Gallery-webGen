import React from "react"
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render( // Find id root in index.html
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
