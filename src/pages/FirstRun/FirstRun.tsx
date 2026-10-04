import { useState, type FormEvent } from 'react'
import { createProfile } from '../../data'

export function FirstRun({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      setError('Please enter your name.')
      return
    }
    try {
      await createProfile(trimmed)
      onDone()
    } catch {
      setError('Could not create your profile. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-md">
        <h1 className="text-xl font-bold text-text">Welcome to LifeOS</h1>
        <p className="mt-2 text-sm text-text-muted">Set up your character to get started. This is stored only in this browser.</p>
        <label className="mt-6 block text-sm font-semibold text-text" htmlFor="profile-name">
          Your name
        </label>
        <input
          id="profile-name"
          className="mt-2 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}
        <button type="submit" className="mt-6 w-full rounded-md bg-brand px-4 py-2 text-sm font-bold text-brand-contrast">
          Create profile
        </button>
      </form>
    </div>
  )
}
