import { useCallback, useState } from 'react'
import { useStoredImage } from '../../hooks/useStoredImage'
import type { PlayerProfile } from './types'

const PROFILE_KEY = 'lifeos:profile'
const AVATAR_KEY = 'lifeos:profile:avatar'

const DEFAULT_PROFILE: PlayerProfile = { id: 'me', name: 'Player', avatarSrc: null }

function readProfile(): PlayerProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>
    return {
      id: parsed.id ?? DEFAULT_PROFILE.id,
      name: parsed.name?.trim() || DEFAULT_PROFILE.name,
      // The avatar lives under its own key so it can be swapped via the
      // shared image hook; never trust it from the JSON blob.
      avatarSrc: null,
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

export interface PlayerProfileState {
  profile: PlayerProfile
  /** Full profile including the live avatar data URL. */
  profileWithAvatar: PlayerProfile
  setName: (name: string) => void
  selectAvatarFile: (file: File) => void
  clearAvatar: () => void
  avatarError: string | null
}

/**
 * Player profile + avatar.
 *
 * The name is user-owned (it comes from the account, PRD §3.1); the avatar is
 * a user-supplied image stored locally until a backend exists (§8).
 */
export function usePlayerProfile(): PlayerProfileState {
  const [profile, setProfile] = useState<PlayerProfile>(readProfile)
  const avatar = useStoredImage(AVATAR_KEY, 'profile picture')

  const setName = useCallback((name: string) => {
    const nextName = name.trimStart() || DEFAULT_PROFILE.name
    setProfile((current) => {
      const next = { ...current, name: nextName }
      try {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
      } catch {
        // Name still applies for this session; nothing else to do.
      }
      return next
    })
  }, [])

  return {
    profile,
    profileWithAvatar: { ...profile, avatarSrc: avatar.src },
    setName,
    selectAvatarFile: avatar.selectFile,
    clearAvatar: avatar.clear,
    avatarError: avatar.error,
  }
}