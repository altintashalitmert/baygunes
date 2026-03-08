import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()

  const reloadKey = 'pbms:chunk-reload'
  const hasReloaded = sessionStorage.getItem(reloadKey) === '1'
  if (hasReloaded) return

  sessionStorage.setItem(reloadKey, '1')
  window.location.reload()
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
