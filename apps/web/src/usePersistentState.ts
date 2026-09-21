import { useEffect, useState } from 'react'
import { read, write } from './storage'

/** useState, sauvegardé dans le stockage local sous une clé stable. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial))

  useEffect(() => {
    write(key, value)
  }, [key, value])

  return [value, setValue] as const
}
