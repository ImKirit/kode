import { useState, useCallback } from 'react'

export interface UsePromptQueueResult {
  queue: string[]
  enqueue(text: string): void
  remove(index: number): void
  clear(): void
}

export function usePromptQueue(): UsePromptQueueResult {
  const [queue, setQueue] = useState<string[]>([])

  const enqueue = useCallback((text: string) => {
    setQueue(prev => [...prev, text])
  }, [])

  const remove = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clear = useCallback(() => setQueue([]), [])

  return { queue, enqueue, remove, clear }
}
