import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2800,
          style: {
            border: '1px solid #d3ddd2',
            borderRadius: '14px',
            background: '#ffffff',
            color: '#142022',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#0e7c66',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#b94a2f',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
