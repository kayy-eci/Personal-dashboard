import { useEffect, useRef, useState } from 'react'
import { usePlayerProfile } from '../../features/player/usePlayerProfile'
import { usePreferences } from '../../preferences/usePreferences'
import { systemPrefersDark } from '../../preferences/apply'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  HomeIcon,
  MessageSquareIcon,
  MoonIcon,
  PanelLeftIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
} from '../icons/Icons'
import { navGroups, topLevelItems, type NavGroup, type NavItem } from './nav-items'
import { loadChatSessions, deleteChatSession } from '../../data'
import type { ChatSession } from '../../core/db/types'
import { Plus, Trash2 } from 'lucide-react'

export interface SidebarProps {
  activePageId: string
  isOpen: boolean
  onSelect: () => void
  onClose: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** Current chat session id */
  currentChatId?: number | null
  /** Called when user selects a chat session */
  onSelectChat?: (id: number) => void
  /** Called when user creates a new chat */
  onNewChat?: () => void
}

/**
 * Notion-style sidebar with neutral selection, sentence-case labels,
 * and a profile menu footer.
 */
export function Sidebar({ activePageId, isOpen, onSelect, onClose, collapsed = false, onToggleCollapse, currentChatId, onSelectChat, onNewChat }: SidebarProps) {
  const { profileWithAvatar } = usePlayerProfile()
  const { preferences, toggleSidebarGroup, setTheme } = usePreferences()
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const initial = profileWithAvatar.name.trim().charAt(0).toUpperCase() || '?'
  const isDark = preferences.theme === 'dark' || (preferences.theme === 'system' && systemPrefersDark())
  // View follows the route: #/chat -> chat (Claude/GPT-style history), everything else -> home nav.
  // The last manually picked view is also persisted so a reload restores intent via the route.
  const sidebarView = activePageId === 'chat' ? 'chat' : 'home'
  const showChatHistory = sidebarView === 'chat'

  const persistView = (next: 'home' | 'chat') => {
    try {
      window.localStorage.setItem('lifeos:sidebar-view', next)
    } catch {
      // ignore
    }
  }

  const handleHomeClick = () => {
    persistView('home')
    if (activePageId === 'chat') window.location.hash = '#/dashboard'
    onSelect()
  }

  const handleChatClick = () => {
    persistView('chat')
    if (activePageId !== 'chat') window.location.hash = '#/chat'
    onSelect()
  }

  // Load chat sessions when on chat page
  useEffect(() => {
    if (!showChatHistory) return
    loadChatSessions().then(setChatSessions).catch(() => setChatSessions([]))
  }, [showChatHistory, currentChatId])

  // Ctrl+B to toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        onToggleCollapse?.()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onToggleCollapse])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [menuOpen])

  const handleCollapseSidebar = () => {
    onToggleCollapse?.()
  }

  const handleNewTask = () => {
    // TODO: Wire to existing new task action
    window.location.hash = '#/quests'
  }

  const handleThemeToggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <>
      {!collapsed && (
        <aside
          id="app-sidebar"
          className={`sticky top-0 flex h-dvh w-[15rem] shrink-0 flex-col overflow-hidden border-r bg-[var(--sb-bg)] text-[var(--sb-text)] max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-md max-md:transition-transform max-md:duration-200 ${isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`}
          style={{ 
            borderRightColor: 'var(--sb-border)',
            fontFamily: 'var(--font-sidebar)',
          }}
          aria-label="Workspace"
        >
      {/* Header row */}
      <div className="flex h-[1.75rem] shrink-0 items-center justify-between px-2 pt-3">
        <button
          type="button"
          onClick={handleCollapseSidebar}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--sb-hover)]"
          aria-label="Collapse sidebar"
          title="Collapse sidebar (Ctrl+B)"
        >
          <PanelLeftIcon className="h-[1.125rem] w-[1.125rem]" style={{ color: 'var(--sb-icon)' }} />
        </button>

        <button
          type="button"
          onClick={handleNewTask}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--sb-hover)] max-md:hidden"
          aria-label="New task"
        >
          <Plus className="h-[1.125rem] w-[1.125rem]" style={{ color: 'var(--sb-icon)' }} />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="hidden h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--sb-hover)] max-md:inline-flex"
          aria-label="Close sidebar"
        >
          <CloseIcon className="h-4 w-4" style={{ color: 'var(--sb-icon)' }} />
        </button>
      </div>

      {/* Search */}
      <div className="mt-2 shrink-0 px-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('lifeos:open-search'))}
          className="flex h-7 w-full items-center gap-2 rounded-md border px-2 transition-colors hover:bg-[var(--sb-hover)]"
          style={{ 
            borderColor: 'var(--sb-border)',
            backgroundColor: 'var(--sb-search-bg)',
          }}
          aria-label="Search (Ctrl+K)"
        >
          <SearchIcon className="h-[1.125rem] w-[1.125rem]" style={{ color: 'var(--sb-icon)' }} />
          <span className="flex-1 text-left text-sm font-normal" style={{ color: 'var(--sb-text-muted)' }}>
            Search
          </span>
          <kbd
            className="rounded px-1.5 text-xs font-medium"
            style={{ 
              backgroundColor: 'var(--sb-badge-bg)',
              color: 'var(--sb-text-muted)',
            }}
          >
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* View toggle: Home | Chat */}
      <div className="mt-2 flex shrink-0 gap-1 px-2" role="group" aria-label="Sidebar view">
        <button
          type="button"
          onClick={handleHomeClick}
          aria-pressed={sidebarView === 'home'}
          aria-label="Home navigation"
          title="Home"
          className="flex h-7 flex-1 items-center justify-center rounded-md transition-colors hover:bg-[var(--sb-hover)]"
          style={{
            backgroundColor: sidebarView === 'home' ? 'var(--sb-selected)' : 'transparent',
          }}
        >
          <HomeIcon
            className="h-[1.125rem] w-[1.125rem]"
            style={{ color: sidebarView === 'home' ? 'var(--sb-text-strong)' : 'var(--sb-icon)' }}
          />
        </button>
        <button
          type="button"
          onClick={handleChatClick}
          aria-pressed={sidebarView === 'chat'}
          aria-label="Chat history"
          title="Chat"
          className="flex h-7 flex-1 items-center justify-center rounded-md transition-colors hover:bg-[var(--sb-hover)]"
          style={{
            backgroundColor: sidebarView === 'chat' ? 'var(--sb-selected)' : 'transparent',
          }}
        >
          <MessageSquareIcon
            className="h-[1.125rem] w-[1.125rem]"
            style={{ color: sidebarView === 'chat' ? 'var(--sb-text-strong)' : 'var(--sb-icon)' }}
          />
        </button>
      </div>

      {/* Chat mode: history list */}
      {showChatHistory && !collapsed && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="shrink-0 px-2 pb-2">
            <button
              type="button"
              onClick={() => onNewChat?.()}
              className="flex h-7 w-full items-center gap-2 rounded-md bg-[var(--sb-selected)] px-2 text-sm font-medium transition-colors hover:bg-[var(--sb-hover)]"
              style={{ color: 'var(--sb-text-strong)' }}
            >
              <Plus className="h-[1.125rem] w-[1.125rem]" style={{ color: 'var(--sb-icon)' }} />
              <span>New chat</span>
            </button>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto border-t px-2 pt-2"
            style={{ 
              borderTopColor: 'var(--sb-border)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'transparent transparent',
            }}
          >
            {chatSessions.length === 0 && (
              <p className="px-2 py-3 text-xs" style={{ color: 'var(--sb-text-muted)' }}>
                No conversations yet
              </p>
            )}
            {chatSessions.map((s) => (
              <div
                key={s.id}
                className={`group/chat flex w-full items-center gap-1 rounded-md px-2 transition-colors hover:bg-[var(--sb-hover)] ${
                  currentChatId === s.id ? 'bg-[var(--sb-selected)]' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => s.id && onSelectChat?.(s.id)}
                  className="flex flex-1 items-center gap-2 py-1.5 text-left"
                >
                  <MessageSquareIcon className="h-[1.125rem] w-[1.125rem] shrink-0" style={{ color: currentChatId === s.id ? 'var(--sb-text-strong)' : 'var(--sb-icon)' }} />
                  <span className="flex-1 truncate text-sm" style={{ color: currentChatId === s.id ? 'var(--sb-text-strong)' : 'var(--sb-text)', fontWeight: currentChatId === s.id ? 600 : 500 }}>
                    {s.title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!s.id) return
                    deleteChatSession(s.id).then(() => {
                      setChatSessions((prev) => prev.filter((x) => x.id !== s.id))
                      if (currentChatId === s.id) onNewChat?.()
                    })
                  }}
                  className="opacity-0 transition-opacity group-hover/chat:opacity-100 flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--sb-hover)]"
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--sb-icon)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normal navigation */}
      {!showChatHistory && (
        <>
          {/* Top-level items */}
          <div className="shrink-0 px-2">
            {topLevelItems.map((item) => (
              <SidebarItem key={item.id} item={item} active={activePageId === item.id} onSelect={onSelect} density={preferences.density} />
            ))}
          </div>

          {/* Scrollable groups */}
          <nav
            className="mt-3 min-h-0 flex-1 overflow-y-auto border-t px-2 pt-2"
            style={{ 
              borderTopColor: 'var(--sb-border)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'transparent transparent',
            }}
            aria-label="Main"
          >
            {navGroups.map((group) => (
              <SidebarGroup
                key={group.id}
                group={group}
                activePageId={activePageId}
                collapsed={preferences.sidebarCollapsedGroups.includes(group.id)}
                onToggle={() => toggleSidebarGroup(group.id)}
                onSelect={onSelect}
                density={preferences.density}
              />
            ))}
          </nav>
        </>
      )}

      {/* Footer */}
      <div className="relative mt-1.5 flex h-8 shrink-0 items-center gap-1 border-t px-1 pb-2"
        style={{ borderTopColor: 'var(--sb-border)' }}
      >
        {/* Profile menu trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-7 flex-1 items-center gap-2 overflow-hidden rounded-md px-1.5 transition-colors hover:bg-[var(--sb-hover)]"
          aria-expanded={menuOpen}
          aria-label="Open profile menu"
        >
          {profileWithAvatar.avatarSrc ? (
            <img
              className="h-5 w-5 shrink-0 rounded object-cover"
              src={profileWithAvatar.avatarSrc}
              alt=""
            />
          ) : (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-semibold"
              style={{ 
                backgroundColor: 'var(--sb-avatar-bg)',
                color: 'var(--sb-text-strong)',
              }}
            >
              {initial}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
            {profileWithAvatar.name}
          </span>
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--sb-text-muted)' }} />
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={handleThemeToggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--sb-hover)]"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <SunIcon className="h-[1.125rem] w-[1.125rem]" style={{ color: 'var(--sb-icon)' }} />
          ) : (
            <MoonIcon className="h-[1.125rem] w-[1.125rem]" style={{ color: 'var(--sb-icon)' }} />
          )}
        </button>

        {/* Settings */}
        <a
          href="#/settings"
          onClick={onSelect}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--sb-hover)]"
          aria-label="Settings"
        >
          <SettingsIcon className="h-[1.125rem] w-[1.125rem]" style={{ color: 'var(--sb-icon)' }} />
        </a>

        {/* Profile menu */}
        {menuOpen && (
          <ProfileMenu
            menuRef={menuRef}
            profileName={profileWithAvatar.name}
            avatarSrc={profileWithAvatar.avatarSrc}
            initial={initial}
            currentTheme={preferences.theme}
            onThemeChange={setTheme}
            onClose={() => setMenuOpen(false)}
            onSelect={onSelect}
          />
        )}
      </div>
    </aside>
      )}

      {/* Collapsed state - show expand button */}
      {collapsed && (
        <button
          type="button"
          onClick={handleCollapseSidebar}
          className="sticky top-4 z-10 ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-[var(--sb-bg)] shadow-sm transition-colors hover:bg-[var(--sb-hover)] max-md:hidden"
          style={{ borderColor: 'var(--sb-border)' }}
          aria-label="Expand sidebar (Ctrl+B)"
          title="Expand sidebar (Ctrl+B)"
        >
          <PanelLeftIcon className="h-[1.125rem] w-[1.125rem]" style={{ color: 'var(--sb-icon)' }} />
        </button>
      )}
    </>
  )
}

interface SidebarItemProps {
  item: NavItem
  active: boolean
  onSelect: () => void
  density: 'comfortable' | 'compact'
}

function SidebarItem({ item, active, onSelect, density }: SidebarItemProps) {
  const Icon = item.icon
  const height = density === 'compact' ? 'h-6' : 'h-7'

  return (
    <a
      href={`#/${item.id}`}
      className={`flex ${height} w-full items-center gap-2 rounded-md px-2 text-sm font-medium no-underline transition-colors ${
        active
          ? 'font-semibold'
          : 'font-medium hover:bg-[var(--sb-hover)]'
      }`}
      style={{
        backgroundColor: active ? 'var(--sb-selected)' : 'transparent',
        color: active ? 'var(--sb-text-strong)' : 'var(--sb-text)',
      }}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      <Icon
        className="h-5 w-5 shrink-0"
        style={{ color: active ? 'var(--sb-text-strong)' : 'var(--sb-icon)' }}
      />
      <span className="truncate">{item.label}</span>
    </a>
  )
}

interface SidebarGroupProps {
  group: NavGroup
  activePageId: string
  collapsed: boolean
  onToggle: () => void
  onSelect: () => void
  density: 'comfortable' | 'compact'
}

function SidebarGroup({ group, activePageId, collapsed, onToggle, onSelect, density }: SidebarGroupProps) {
  const holdsActive = group.items.some((item) => item.id === activePageId)
  const expanded = !collapsed || holdsActive
  const listId = `sidebar-group-${group.id}`
  const height = density === 'compact' ? 'h-6' : 'h-7'

  return (
    <div className="group/nav mb-3">
      <button
        type="button"
        onClick={onToggle}
        className={`flex ${height} w-full items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors hover:bg-[var(--sb-hover)]`}
        style={{ color: 'var(--sb-text-muted)' }}
        aria-expanded={expanded}
        aria-controls={listId}
      >
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronRightIcon
          className={`h-3 w-3 shrink-0 opacity-0 transition-all duration-150 group-hover/nav:opacity-100 ${expanded ? 'rotate-90' : ''}`}
          style={{ color: 'var(--sb-text-muted)' }}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-150"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <ul id={listId} className="min-h-0 overflow-hidden" role="list">
          {(expanded ? group.items : group.items.filter((item) => item.id === activePageId)).map((item) => (
            <li key={item.id}>
              <SidebarItem item={item} active={activePageId === item.id} onSelect={onSelect} density={density} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

interface ProfileMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>
  profileName: string
  avatarSrc?: string | null
  initial: string
  currentTheme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  onClose: () => void
  onSelect: () => void
}

function ProfileMenu({ menuRef, profileName, avatarSrc, initial, currentTheme, onThemeChange, onClose, onSelect }: ProfileMenuProps) {
  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-1 w-60 rounded-[0.625rem] border bg-[var(--sb-bg)] shadow-lg"
      style={{
        borderColor: 'var(--sb-border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
      role="menu"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderBottomColor: 'var(--sb-border)' }}>
        {avatarSrc ? (
          <img className="h-5 w-5 rounded object-cover" src={avatarSrc} alt="" />
        ) : (
          <span
            className="flex h-5 w-5 items-center justify-center rounded text-xs font-semibold"
            style={{ 
              backgroundColor: 'var(--sb-avatar-bg)',
              color: 'var(--sb-text-strong)',
            }}
          >
            {initial}
          </span>
        )}
        <span className="flex-1 truncate text-sm font-medium">{profileName}</span>
      </div>

      {/* Menu items */}
      <div className="p-1">
        <a
          href="#/settings"
          onClick={() => { onSelect(); onClose(); }}
          className="flex h-7 w-full items-center rounded-md px-2 text-sm font-medium no-underline transition-colors hover:bg-[var(--sb-hover)]"
          style={{ color: 'var(--sb-text)' }}
          role="menuitem"
        >
          Settings
        </a>

        <div className="my-1 border-t" style={{ borderTopColor: 'var(--sb-border)' }} />

        <div className="px-2 py-1 text-xs font-medium" style={{ color: 'var(--sb-text-muted)' }}>
          Theme
        </div>

        {(['light', 'dark', 'system'] as const).map((theme) => (
          <button
            key={theme}
            type="button"
            onClick={() => { onThemeChange(theme); onClose(); }}
            className="flex h-7 w-full items-center justify-between rounded-md px-2 text-sm font-medium transition-colors hover:bg-[var(--sb-hover)]"
            style={{ color: 'var(--sb-text)' }}
            role="menuitemradio"
            aria-checked={currentTheme === theme}
          >
            <span className="capitalize">{theme}</span>
            {currentTheme === theme && (
              <span className="text-xs" style={{ color: 'var(--sb-text-muted)' }}>✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
