# Notion Design Guideline

A minimalist, Notion-style design system that can be recreated with native Notion blocks | Version 1.0 | October 18, 2026

## How to Use This Guide

Three labels are used throughout so you always know what kind of instruction you are reading:

- **Spec** — the visual standard: exact values for CSS-based interfaces and for design reviews.
- **Notion** — how to get the closest result with native Notion blocks and page settings. No custom CSS or HTML is needed.
- **Manual** — one-time setup you must do by hand in Notion; it cannot be pasted in or automated.

**Compatibility facts to read first.**

- Notion does not let you specify an arbitrary CSS font stack. The font stack in this guide is the Spec for CSS-based interfaces. In Notion, use the Default (sans-serif) page font, which is the closest available option.
- Notion's text, background and callout colors come from a fixed set of named colors. You cannot type a HEX value there. HEX codes are exact in CSS and in uploaded images (covers, custom icons); in Notion use the nearest native color named in Section 3.
- Heading sizes, line height, block spacing and the default content width are set by Notion. You shape them through block choice, structure and page options, not pixel values.
- The palette is a light-theme specification. Notion's dark mode is a separate native setting and is not covered here.

## 1. Design Principles

1. **Content first, chrome second.** The page exists to be read and used. Every element must serve a task; if you cannot name its job, remove it.
2. **Hierarchy through size, weight and color.** Never through decoration. A reader should find the page title, section and key facts in under three seconds.
3. **Whitespace is structure.** Group related items closely, separate unrelated items generously. Prefer spacing and subtle dividers over boxes and borders.
4. **Restraint with color.** Neutrals do almost all the work. The single accent (#647C64) signals meaning: a key point, a status, a primary action. It is never decoration.
5. **Consistency over novelty.** The same job always uses the same component, in the same style. If two pages solve the same problem, they look the same.
6. **Scannable by default.** Put the answer first, keep paragraphs short, use lists for parallel items and tables for comparisons.
7. **No ornament.** No gradients, no heavy shadows, no decorative fonts, no emoji used as wallpaper.
8. **Practical over perfect.** Prefer native Notion blocks that anyone on the team can edit, even if a custom build could look slightly sharper.

## 2. Typography

### 2.1 Font stack (Spec)

Use this exact stack as the primary typography specification for any CSS-based interface:

```css
font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif;
```

**Notion:** Notion does not accept custom CSS font stacks. Open the page menu, find the Style options and keep the font on Default (the sans-serif option). Do not choose Serif or Mono for the page. This is the closest equivalent, not an identical font.

### 2.2 Type scale (Spec)

- **Page title:** 40 px / 48 px line height, weight 700, color #191919.
- **H1:** 30 px / 38 px, weight 700, #191919. Major sections.
- **H2:** 24 px / 32 px, weight 600, #191919. Subsections.
- **H3:** 20 px / 28 px, weight 600, #191919. Minor groupings. Do not go deeper than H3.
- **Body:** 16 px / 24 px (line height 1.5), weight 400, #191919.
- **Secondary text:** 14 px / 20 px, weight 400, #6B6B6B. Descriptions, captions, metadata, helper text.
- **Label:** 12 px / 16 px, weight 600, #6B6B6B. Property names, table headers, tags.

### 2.3 Typography rules

- Use only weights 400, 600 and 700. Headings 600-700, body and secondary text 400.
- One sans-serif appearance everywhere. No decorative serif fonts and no unrelated typefaces.
- The only exception is inline code and code blocks, which use the monospace face built into the tool. Use them only for literal code, commands and keyboard keys.
- Keep line length to roughly 60-80 characters (about 700 px at 16 px).
- Left-align all text. Never center paragraphs.
- Use sentence case for headings, labels and buttons.
- Emphasis: bold for key terms (sparingly), italics rarely, no underlines except links, no ALL CAPS.

### 2.4 Notion implementation

- **Notion:** Page title and H1-H3 use Notion's built-in sizes, which are approximately 40, 30, 24 and 20 px, matching the Spec scale. You cannot change them; do not try to fake sizes with bold body text.
- **Notion:** Keep Small text off so body stays at the standard size.
- **Notion:** For secondary text, select the text and apply the Gray text color.
- **Notion:** Property names and table headers are already styled as muted labels; leave them as they are.

## 3. Color Palette

A restrained neutral palette with one accent.

- **Background — #FFFFFF.** Page canvas. Notion: the default page background (light mode).
- **Primary text — #191919.** Titles, headings, body. Notion: the Default text color. It is a near-black and very close to, but not exactly, #191919.
- **Secondary text — #6B6B6B.** Descriptions, metadata, labels, placeholders. Notion: the Gray text color.
- **Borders and dividers — #E5E5E5.** Dividers, table lines, input outlines. Notion: native dividers and table borders; the color is fixed by Notion.
- **Subtle surface — #F7F7F7.** Callouts, hover and selected states, code blocks. Notion: the Gray background color on callouts and highlighted blocks.
- **Accent — #647C64.** A muted green for key points, status and links to the most important action. Notion: the Green text or Green background color, which is the nearest native match but not exact.

### 3.1 Contrast (approximate)

- Primary text on white: about 17.6:1. Passes AA and AAA.
- Secondary text on white: about 5.3:1. Passes AA for normal text.
- Secondary text on #F7F7F7: about 5.0:1. Passes AA.
- Accent on white: about 4.6:1. Passes AA for normal text, but with little margin.
- Accent on #F7F7F7: about 4.2:1. Fails AA for normal-size text. Use it only for large text (24 px, or 18.66 px bold), icons and borders. Inside tinted areas use primary text.
- #E5E5E5 borders are about 1.3:1 against white: decorative only. Never rely on a border alone to show that something is interactive.

### 3.2 Color usage rules

- Neutrals carry the layout; accent appears at most once or twice per screen.
- Accent means something: key takeaway, success or the single primary action. Never use it for decoration or for body text.
- Never use pure black (#000000) or any additional hue. If you need a new color, you probably need better hierarchy instead.
- **Spec (CSS only):** hover or selected backgrounds use #F7F7F7. Focus rings are 2 px solid #647C64 with a 2 px offset. Disabled text uses #6B6B6B.
- **Spec (CSS only, derived):** a light accent tint is the accent at 10% opacity over white, about #F0F2F0. This tint is not part of the base palette and has no native Notion equivalent.

### 3.3 Design tokens (Spec)

```css
:root {
  --font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif;
  --color-bg: #FFFFFF;
  --color-text: #191919;
  --color-text-muted: #6B6B6B;
  --color-border: #E5E5E5;
  --color-surface: #F7F7F7;
  --color-accent: #647C64;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --radius: 4px;
  --content-width: 720px;
}
```

## 4. Spacing and Layout

### 4.1 Spacing scale (Spec)

Every margin, padding and gap is a multiple of 4 px. Allowed values: 4, 8, 12, 16, 24, 32, 48, 64.

- Between paragraphs: 12 px. Between list items: 4 px.
- Space above headings: H1 48 px, H2 32 px, H3 24 px. Space below headings: 8 px (H1 12 px).
- Between major sections: 32 px above and below a 1 px #E5E5E5 divider, or 48 px of space with no divider. Choose one approach per page.
- Callout padding: 16 px. Table cell padding: 8 px vertical, 12 px horizontal. Button padding: 8 px vertical, 16 px horizontal.
- Corner radius: 4 px by default, 8 px at most for callouts and cards. Borders are 1 px. No shadows on content; at most a faint shadow on floating menus.
- Page side padding: 24 px on small screens, 64 px on desktop.

### 4.2 Layout rules (Spec)

- Maximum content width: 720 px for reading pages. Wide layouts only for databases.
- Align everything to one left edge. Icons align with the first line of text.
- Use columns only when they improve comprehension: side-by-side comparison or short parallel lists. At most three columns, equal width.
- Use whitespace, then a divider, then a heading, in that order of preference, to separate content.

### 4.3 Notion implementation

- **Notion:** Spacing is fixed by Notion. You control it by structure: use Heading blocks for hierarchy, Divider blocks between major sections, and column layouts for side-by-side content.
- **Notion:** Do not stack empty blocks to create space. One accidental empty line is the maximum; headings already add space above them.
- **Notion:** Keep Full width off for reading pages (the default width is about 700 px, close to the Spec). Turn Full width on only for pages whose main content is a wide table, board or timeline database.
- **Notion:** Keep a page to roughly three screens of content. Beyond that, add a Table of contents block near the top, use toggle headings, or split content into sub-pages.
- **Manual:** Column widths in Notion are adjusted by dragging the handle between columns. Keep columns equal.

## 5. Component Guidelines

### 5.1 Page title and description

- **Spec:** Title in sentence case, 40 px bold, one line where possible. Directly below, a single description sentence in secondary text (14-16 px, #6B6B6B), no longer than about 140 characters. It answers: what is this page, who owns it, what is the status?
- **Notion:** Type the title in the page title field. Add the description as the first text block below it and apply the Gray text color.

### 5.2 Headings (H1, H2, H3)

- **Spec:** One H1 per major section, H2 for subsections, H3 for minor groupings. Never skip levels. Sentence case. No trailing punctuation. No emoji in headings.
- **Notion:** Use Heading 1, 2 and 3 blocks. For long pages, use Toggle heading blocks so sections can collapse. Do not use Heading 4.

### 5.3 Paragraphs and inline emphasis

- **Spec:** Paragraphs are 1-4 sentences. Bold marks a key term, at most once or twice per paragraph. Links keep their native underline. Highlights are not used.
- **Notion:** Use Text blocks. Use inline code only for literal code, commands and keys. Do not color body text except Gray for secondary text and Green for one key term at most.

### 5.4 Bulleted and numbered lists

- **Spec:** Bullets for unordered items, numbers only for sequences, to-dos for actions. Items are short (one or two lines), parallel in grammar, and sentence case. Maximum two nesting levels.
- **Notion:** Use Bulleted list, Numbered list and To-do list blocks. Indent with Tab. Do not use lists for a single item, and use a table when items have two or more attributes.

### 5.5 Callout blocks

- **Spec:** Two types only. **Note** on the subtle surface (#F7F7F7) for neutral information, and **Key point** using the accent for the one thing the reader must not miss. Maximum one callout per section. Start with a bold label, then one or two sentences. Padding 16 px, radius 4-8 px, no border.
- **Notion:** Use the Callout block. Note: Gray background. Key point: Green background. Use the same icon every time (for example one neutral icon for Note and one for Key point) or no icon at all.
- **Manual:** Pasted Markdown does not create callouts. Paste the text as a quote, then use Turn into, Callout, and set the background color.

### 5.6 Tables and databases

- **Spec:** Use a simple table for small, static reference data (up to about ten rows). Use a database for anything that grows, needs filtering or has statuses. Header row in label style (12 px, 600, #6B6B6B). 1 px #E5E5E5 row lines only, no zebra striping, no vertical borders. Cell padding 8 px by 12 px. Show only four to six properties.
- **Notion:** Use the Table block for simple tables, with the Header row turned on. Use an inline database in Table view for growing data. Hide properties that are not needed, keep wrapping off, show the page icon, and set the default sort. For Select and Status tags, use only Gray (neutral) and Green (positive or done) so color keeps its meaning.
- **Manual:** Property visibility, sorting, filters and tag colors are configured per view.

### 5.7 Toggle sections

- **Spec:** Use toggles for optional detail: FAQs, background, long notes. The toggle title is a complete, sentence-case phrase that tells the reader what is inside. Never hide required or critical information in a toggle. One level of nesting only.
- **Notion:** Use the Toggle list block, or a Toggle heading for section-level collapsing.
- **Manual:** Pasted Markdown does not create toggles. Paste a bullet with a nested bullet, select the parent, then use Turn into, Toggle list. The nested bullet stays inside the toggle.

### 5.8 Buttons and links

- **Spec:** One primary button per page at most. Primary: accent (#647C64) background, white text, 8 px by 16 px padding, 4 px radius, sentence-case label that starts with a verb. Secondary: #F7F7F7 background, primary text, no border. Links keep the standard underline and are not recolored.
- **Notion:** Notion's Button block has limited styling options, so it can only approximate the Spec. Use it sparingly, with a verb label, and choose the most neutral style offered. For navigation, prefer page links, which you create by typing @ and a page name, or a Link to page block, over raw URLs. Use Bookmark blocks only for external references.
- **Manual:** Button actions (for example adding a database row) are configured in the Button block settings.

### 5.9 Icons and covers

- **Spec:** One icon style across the workspace: simple line icons, 16-20 px, in #6B6B6B. Use the accent for at most one icon per page. Covers are optional: a flat preset from the design guideline palette, or an uploaded image; no gradients and no text on covers. Working pages need no cover.
- **Notion:** Choose page icons from the Icons tab (not a mix of emoji and icons), and pick the Gray color consistently. Use a Green icon only for a hub or home page.
- **Manual:** For a flat cover, create a solid-color image (at least 1500 px wide) in #F7F7F7, upload it through Add cover, then Upload. Notion's color pickers cannot match the HEX value exactly, but an uploaded image can.

### 5.10 Navigation

- **Spec:** Navigation is predictable and shallow: a home page that links to areas, areas that link to pages, no more than three levels deep. Every page makes its place clear and offers a way back.
- **Notion:** Use the sidebar with a short Favorites list, native breadcrumbs, a Table of contents block on long pages, and page links on hub pages. For a repeated navigation row, use a Synced block with page links inside a column layout (Manual setup, then paste the synced copy on other pages).

## 6. Sample Notion Page (Ready to Copy)

This sample shows the guideline in use: description, sections, dividers, lists, a table, a to-do list, callout and toggle candidates.

**How to use it:**

1. Create a new empty page and type the page title in the title field, for example: Project Atlas.
2. Copy everything in the block below and paste it into the page body. Notion converts the headings, lists, divider, to-dos and table automatically.
3. Complete the Manual conversions listed after the sample.

```markdown
A one-sentence description of what this page is for, who owns it and its current status.

---

# Overview

Atlas is a redesigned onboarding flow for new users. This page is the single source of truth for scope, timeline and decisions.

> **Key point.** The launch target is the end of Q4. Scope changes need approval from the project owner.

## Goals

- Reduce time to first value from ten minutes to three
- Increase week-one retention
- Keep setup to five steps or fewer

## Non-goals

- A full redesign of the dashboard
- New pricing or plans

---

# Plan

1. Research and discovery
2. Design and prototype
3. Build and test
4. Launch and measure

## This week

- [ ] Finalize the user interview notes
- [ ] Share the prototype for review
- [ ] Confirm the launch date with the team

---

# Reference

| Item | Owner | Status |
| --- | --- | --- |
| Research summary | Sam | Done |
| Prototype | Alex | In progress |
| Launch checklist | Jordan | Not started |

> **Note.** Replace this table with a database once the list grows beyond about ten rows.

## Frequently asked questions

- Who owns this project?
  - The owner is named in the page description at the top.
- Where are decisions recorded?
  - In the decisions database linked from the Overview section.
- How do I request a change?
  - Comment on the relevant section and tag the owner.
```

**Manual conversions after pasting.**

- Turn the quote that starts with Key point into a Callout with the Green background.
- Turn the quote that starts with Note into a Callout with the Gray background.
- Select the description line at the top and apply the Gray text color.
- Turn each parent bullet under Frequently asked questions into a Toggle list.
- If the pasted table is not a Table block, insert a Table block and move the rows in, then turn on Header row.
- Add a Table of contents block under the description if the page grows beyond about three screens.

## 7. Implementation Steps

1. **Create the page.** Add a new page in the sidebar and choose an empty page. Type a sentence-case title.
2. **Set page options.** Open the page menu and its Style options. Keep the font on Default, Small text off, and Full width off (turn it on only for wide databases).
3. **Add the icon.** Choose an icon from the Icons tab in Gray. Do not mix emoji and icons across pages.
4. **Add a cover only if needed.** Hub pages may use a flat #F7F7F7 image uploaded as a cover. Working pages need none.
5. **Write the description.** One sentence, first block under the title, Gray text color.
6. **Paste the content.** Paste the sample in Section 6, or your own Markdown. Notion converts headings, lists, dividers and to-dos.
7. **Convert the special blocks.** Turn quotes into Callouts (Gray background for notes, Green for the key point), and parent bullets into Toggle lists.
8. **Apply color rules.** Gray for secondary text. Green only for the key point and at most one key term or icon. Remove any other colors and highlights.
9. **Build the database (if needed).** Add an inline database in Table view. Name properties in sentence case. Keep four to six visible properties and hide the rest. Set Select and Status tag colors to Gray and Green only. Turn on the page icon, keep wrapping off and set a default sort.
10. **Add navigation.** Add a Table of contents block on long pages. Link to related pages with @ page mentions. Put the page in the right place in the sidebar hierarchy, no deeper than three levels.
11. **Save it as a reusable template.** Duplicate the finished page for new pages, or in a database use the New dropdown to set up a template with the same structure.
12. **Review.** Run the checklist in Section 8 before sharing the page.

## 8. Final Consistency Checklist

**Principles**

- [ ] Every element on the page has a clear job.
- [ ] The page title and the first screen answer: what is this and what do I do next?

**Typography**

- [ ] Default sans-serif font is used; no Serif or Mono page style.
- [ ] Headings use H1-H3 only, with no skipped levels.
- [ ] Only weights 400, 600 and 700 appear; body is 400.
- [ ] Secondary text is Gray; headings and body are the default text color.
- [ ] Headings, labels and buttons are in sentence case.

**Color**

- [ ] Only the neutral palette and the single green accent are used.
- [ ] Accent appears at most once or twice on the screen and always means something.
- [ ] No highlights, no extra colors, no pure black.
- [ ] Accent text is not used at small sizes on the gray surface.

**Spacing and layout**

- [ ] No stacked empty blocks.
- [ ] Sections are separated by a divider or heading, not by both plus extra space.
- [ ] Full width is off unless the page is a wide database.
- [ ] Columns are used only where they help, with at most three equal columns.

**Components**

- [ ] Description is one sentence in Gray under the title.
- [ ] At most one callout per section, using the two defined types and the same icon each time.
- [ ] Small static data is a simple table; growing data is a database with four to six visible properties.
- [ ] Tag colors are only Gray and Green.
- [ ] Toggles hold optional detail only, one level deep.
- [ ] At most one primary button; links are native page mentions where possible.
- [ ] Icons come from one style and one color; covers are flat or absent.

**Navigation and upkeep**

- [ ] Page sits no deeper than three levels in the sidebar.
- [ ] Long pages have a Table of contents or are split into sub-pages.
- [ ] Every deviation from this guide has a reason, noted on the page or in the team workspace.
