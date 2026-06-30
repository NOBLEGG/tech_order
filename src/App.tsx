import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import LoginPage from './components/Auth/LoginPage'
import Grid from './components/Grid/Grid'
import ObjectModal from './components/Modal/ObjectModal'

function AppInner() {
  const { user, loading, signOut } = useAuth()
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="h-10 flex-shrink-0 bg-white border-b border-gray-100
                         flex items-center justify-between px-4">
        <span className="text-sm font-semibold text-gray-700">Tech Order</span>
        <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600">
          로그아웃
        </button>
      </header>

      <DataProvider>
        <Grid onEditObject={id => setEditingObjectId(id)} />
        {editingObjectId && (
          <ObjectModal
            objectId={editingObjectId}
            onClose={() => setEditingObjectId(null)}
          />
        )}
      </DataProvider>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
