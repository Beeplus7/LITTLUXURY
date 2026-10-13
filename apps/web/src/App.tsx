import './App.css'
import { supabase } from './lib/supabase'

function App() {
  const ready = Boolean(supabase)

  return (
    <main className="shell">
      <p className="brand">LITTLUXURY</p>
      <h1>Foundation ready</h1>
      <p className="meta">
        Web app scaffolded. Shop UI and catalog come next.
        {ready ? ' Supabase client configured.' : ' Add VITE_SUPABASE_* to .env.'}
      </p>
    </main>
  )
}

export default App
