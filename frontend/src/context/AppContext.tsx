import React, { createContext, useContext, useState } from 'react'

interface Usuario {
  email: string
  nombre: string
  rol: 'estudiante' | 'consejero' | 'admin'
  id?: string
}

interface AppContextType {
  usuario: Usuario | null
  setUsuario: (u: Usuario | null) => void
  apiUrl: string
}

const AppContext = createContext<AppContextType>({
  usuario: null,
  setUsuario: () => {},
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
})

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  return (
    <AppContext.Provider
      value={{
        usuario,
        setUsuario,
        apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
