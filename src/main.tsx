import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initApp } from './db/init'
import './index.css'

const root = createRoot(document.getElementById('root')!)

initApp()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((e: unknown) => {
    console.error(e)
    root.render(
      <div className="fatal">
        <h1>起動できませんでした</h1>
        <p>ブラウザのデータ保存が無効になっている可能性があります（プライベートブラウズなど）。</p>
        <pre>{String(e)}</pre>
      </div>,
    )
  })
