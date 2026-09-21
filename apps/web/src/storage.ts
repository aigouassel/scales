/**
 * Persistance locale.
 *
 * Pas de serveur : la progression et le résultat du calibrage vivent dans le
 * navigateur. Chaque lecture est défensive — le stockage peut être désactivé,
 * plein, ou contenir des données d'une version antérieure.
 */

const PREFIX = 'scales.v1.'

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Navigation privée ou quota atteint : on continue sans persister.
  }
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    // Sans conséquence.
  }
}
