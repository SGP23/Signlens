import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { installProductionLogger } from './services/logger'

// Suppress console.log/debug/info in production builds
installProductionLogger()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0f172a'}}>
          <div style={{width:40,height:40,border:'4px solid #334eac',borderTop:'4px solid transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
        </div>
      }>
        <App />
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
