import { createContext, useContext } from 'react'
import { LIGHT } from './constants'

const ThemeContext = createContext(LIGHT)

export function ThemeProvider({ children }) {
  return <ThemeContext.Provider value={LIGHT}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
