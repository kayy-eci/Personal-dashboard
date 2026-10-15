import type * as React from 'react'
import { ImageIcon, MonitorIcon, PenTool, Sparkles } from 'lucide-react'

export interface CommandSuggestion {
  icon: React.ReactNode
  label: string
  description: string
  prefix: string
}

/** Slash-command shortcuts offered above the Home composer. */
export function getCommandSuggestions(): CommandSuggestion[] {
  return [
    {
      icon: <ImageIcon className="h-4 w-4" />,
      label: 'Clone UI',
      description: 'Generate a UI from a screenshot',
      prefix: '/clone',
    },
    {
      icon: <PenTool className="h-4 w-4" />,
      label: 'Import design',
      description: 'Import a design mockup',
      prefix: '/design',
    },
    {
      icon: <MonitorIcon className="h-4 w-4" />,
      label: 'Create Page',
      description: 'Generate a new web page',
      prefix: '/page',
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      label: 'Improve',
      description: 'Improve existing UI design',
      prefix: '/improve',
    },
  ]
}
