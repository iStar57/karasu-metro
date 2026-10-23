# Karasu Metro

An unofficial theme for [karasu.live](https://karasu.live), the CS2 matchmaking site, for Chrome and Firefox.

Karasu Metro gives the site a cleaner, darker interface and reworks its busiest pages: the play page, the match room, the leaderboard, player profiles and the inventory. It only changes how Karasu looks and how its pages are laid out. Every button, link and counter is still Karasu's own, so the site works as it normally does.

> Karasu Metro is a community project. It is not made by or affiliated with Karasu. It is published with the Karasu team's permission, on the condition that its source code stays open.

## What it changes

- **Navigation:** The left sidebar keeps your everyday links visible and folds the rest into three groups. The search box sits in the header and shows results as you type.
- **Play page:** The queue and modes are on one screen, with recent bans in a scrolling ticker across the top.
- **Match room:**
  - The header with both teams and the score is one compact strip.
  - Map and server vetoes are a full-width turn bar with the countdown and a grid of cards.
  - The rosters sit on both sides of the room.
  - The stats tabs (Economy, Clutches, Roles and Map Analysis) are condensed so each one fits on fewer screens.
- **Leaderboard:**
  - The top three get a podium.
  - The table shows each player's distance to first place.
- **Profiles:** Profiles have a redesigned header, stat cards graded by performance, and a readable roles panel.
- **Inventory:** You can filter the inventory by item type.
- **Notices:** Site-wide notices collapse to a single line. You can dismiss them, and the popup brings them back.

From the toolbar popup you can turn the theme on or off, pick an accent color and restore dismissed notices.

## Project layout

| File | Purpose |
|---|---|
| `manifest.json` | Chrome extension manifest (Manifest V3) |
| `theme.css` | The theme. Every rule is scoped to `html.kft`, so turning the theme off removes it completely. |
| `content.js` | Marks parts of Karasu's pages with `data-kft-*` attributes so the CSS can target them, and adds small helpers such as the search box and the bans ticker. It never moves or removes Karasu's own elements. |
| `popup.html`, `popup.js` | Toolbar popup with the settings |
| `fonts/` | Geist and Michroma, under the SIL Open Font License |

Karasu updates its site often, so the theme finds page elements by their structure, not by their text, and it works in any language the site supports. If a page looks broken after a Karasu update, please open an issue with a screenshot.

## Privacy

The extension has no analytics, no tracking and no remote code. It stores only your theme preferences and the notices you dismissed. See [PRIVACY.md](PRIVACY.md).

## License

[MIT](LICENSE). The bundled fonts keep their own license (SIL OFL 1.1).
