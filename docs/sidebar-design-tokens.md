# Sidebar Design Tokens — Accent Rule Change

## Change (2026-10-15)

**Previous behavior:** The accent color was used for the selected sidebar item background and text.

**New behavior:** The selected sidebar item uses a **quiet neutral highlight** (`--sb-selected`) that adapts to the theme. The accent color is now used **only for**:
- Primary action buttons
- Links in content areas
- Keyboard focus rings (`:focus-visible`)

## Rationale

This change aligns the sidebar with Notion's visual language, where:
1. Selection states use subtle neutral overlays
2. Accent colors highlight actionable elements, not navigation state
3. The sidebar remains visually quiet regardless of the user's chosen accent

## Tokens

See `src/components/Sidebar/sidebar-tokens.css` for the complete token set.

**Selection state:**
- Light: `rgba(55, 53, 47, 0.10)`
- Dark: `rgba(255, 255, 255, 0.09)`

These values provide sufficient contrast while remaining visually recessive.
