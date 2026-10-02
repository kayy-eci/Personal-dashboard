# Life Dashboard (LifeOS RPG)

A personal web dashboard that turns real-life habits, goals, and tasks into an RPG-style progression system. Your character's stats, XP, level, and health are calculated automatically from what you actually get done.

> **Status:** Dashboard UI prototype. Activity, quest, goal, and attribute values are sample data; dashboard check-ins are temporary previews and are not saved to a ledger.

## Why

Habits, tasks, and goals usually live in separate tools, and none of them show how daily behavior adds up over time. Life Dashboard puts them in one place and makes progress visible, without turning the tool into a distraction.

**Core principle:** real productivity data is the source of truth. Game mechanics are calculated from it, not the other way around.

## Planned Features

**First version**
- **Dashboard:** level, XP, health, streak, today's habits, active quests, deadlines, and goal progress
- **Habits:** daily and weekly routines with streaks and consistency tracking
- **Quests:** one-time objectives with difficulty, effort, impact, and deadlines
- **Goals & milestones:** break big ambitions into steps, with automatic progress
- **Attributes:** six character stats (STR, INT, DISC, CREAT, FOCUS, SOC) that grow automatically from completed activities
- **XP & levels:** rewards based on difficulty, effort, impact, and consistency, with every gain explained
- **Health:** a simple health bar that reflects how consistently you complete your daily routines
- **Timeline:** one chronological feed of everything that happened: completions, level-ups, achievements
- **Achievements & basic analytics**

**Later**
- Skill tree, calendar, mood and wellbeing tracking, notifications
- AI-assisted quest suggestions, seasons, integrations, offline support

## Design Direction

- A game-like HUD (XP bar, health bar, level badge) kept at **Notion-level** polish: clean layout, quiet typography, generous spacing
- Game elements stay restrained so productivity information is always the focus
- Desktop-first, responsive on mobile
- Rewards are always explainable and never guilt-based

## Tech Stack

- Frontend: React, TypeScript, and [Vite](https://vite.dev)

## Getting Started

Install dependencies and start the local development server:

```sh
npm install
npm run dev
```

Run the production build and lint checks with `npm run build` and `npm run lint`.

## License

To be decided.