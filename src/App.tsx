import React from 'react'
import Gallery from './components/Gallery'
import VisitorCounter from './components/VisitorCounter'
import './App.css'

function App() {
  return (
    <div className="app">
      <h1>Interactive Art Gallery</h1>
      <Gallery />
      <VisitorCounter />
    </div>
  )
}

export default App
