"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { en, type Translations } from "./locales/en"
import { zh } from "./locales/zh"

type Language = "en" | "zh"

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (path: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  useEffect(() => {
    // Load language from localStorage
    const saved = localStorage.getItem("iwantaname_language") as Language
    if (saved && (saved === "en" || saved === "zh")) {
      setLanguage(saved)
    } else {
      // Detect browser language
      const browserLang = navigator.language.startsWith("zh") ? "zh" : "en"
      setLanguage(browserLang)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("iwantaname_language", lang)
  }

  const t = (path: string): string => {
    const keys = path.split(".")
    let current: any = language === "en" ? en : zh

    for (const key of keys) {
      if (current === undefined || current[key] === undefined) {
        console.warn(`Translation missing for key: ${path} in language: ${language}`)
        // Fallback to English if current language is not English
        if (language !== "en") {
          let fallback: any = en
          for (const k of keys) {
            if (fallback === undefined || fallback[k] === undefined) return path
            fallback = fallback[k]
          }
          return fallback as string
        }
        return path
      }
      current = current[key]
    }

    return current as string
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
