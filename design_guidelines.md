# Design Guidelines: Lead-Hanteringsapp för Fritidsfordon

## Design Approach
**Utility-First SaaS Dashboard** - This is a productivity-focused CRM application inspired by modern SaaS dashboards like Linear, Notion, and the provided reference image. The design prioritizes efficiency, data clarity, and professional aesthetics while maintaining visual appeal through thoughtful use of space, typography, and the brand accent color.

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary Background: `0 0% 100%` (white)
- Secondary Background: `0 0% 98%` (subtle off-white for cards)
- Border: `0 0% 90%` (soft borders)
- Text Primary: `0 0% 10%` (near black)
- Text Secondary: `0 0% 45%` (muted gray)
- Accent Red: `12 85% 56%` (#ed4f2c) - Use for primary CTAs, status indicators for "Vunnen", active states
- Success Green: `142 71% 45%` - For positive trends, "Vunnen" badges
- Warning Yellow: `38 92% 50%` - For pending actions, overdue tasks
- Destructive Red: `0 84% 60%` - For "Förlorad" status, delete actions

**Dark Mode:**
- Primary Background: `0 0% 8%` (very dark gray)
- Secondary Background: `0 0% 12%` (cards and elevated surfaces)
- Border: `0 0% 20%` (subtle borders)
- Text Primary: `0 0% 95%` (near white)
- Text Secondary: `0 0% 60%` (muted light gray)
- Accent Red: `12 85% 56%` (same for consistency)
- Adjust other colors for dark mode readability

### B. Typography

**Font Stack:**
- Primary: Inter (via Google Fonts CDN) - Clean, modern, excellent for UI and data
- Font Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

**Type Scale:**
- Display (Dashboard Headers): text-3xl (30px), font-bold
- Page Headers: text-2xl (24px), font-semibold
- Section Headers: text-xl (20px), font-semibold
- Card Titles: text-lg (18px), font-medium
- Body Text: text-base (16px), font-normal
- Small Text/Labels: text-sm (14px), font-normal
- Tiny Text (timestamps): text-xs (12px), font-normal

### C. Layout System

**Spacing Primitives:**
Use Tailwind units: 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm.
- Component padding: p-4 to p-6
- Section spacing: mb-8, mb-12
- Card spacing: gap-4, gap-6
- Form elements: space-y-4

**Grid Structure:**
- Dashboard: 12-column grid with responsive breakpoints
- KPI Cards: 4-column grid on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Lead Lists: Single column with full-width cards
- Detail Pages: 2-column layout (main content 2/3, sidebar 1/3)

### D. Component Library

**Navigation:**
- Sidebar navigation (200px wide on desktop, collapsible on mobile)
- Logo and user profile at top
- Menu items with icons (lucide-react) and Swedish labels
- Active state: red accent background with white text
- Sections: "Mina Leads", "Dashboard", "Inställningar" (if MANAGER)

**KPI Cards (Dashboard):**
- White/dark background cards with subtle shadow
- Large number (text-3xl, font-bold) with trend indicator
- Small text label below (text-sm, text-muted)
- Green/red arrow icons for trends
- Border-left accent (4px red stripe) for primary metrics
- Hover: subtle elevation increase

**Data Tables:**
- Clean rows with alternating subtle background (hover state)
- Column headers: uppercase text-xs, font-medium, text-muted
- Row height: py-3 for comfortable density
- Action buttons (icon-only) in rightmost column
- Status badges (pill shape) with appropriate colors
- Sortable columns with arrow indicators

**Lead Cards (List View):**
- Full-width cards with border
- Header row: Lead title/vehicle name (font-semibold) + status badge
- Meta row: Source icon + location + timestamp (text-sm, text-muted)
- Contact info row (if assigned to user)
- Action row: Next step preview or "Tilldela" button
- Hover: border color changes to accent red

**Status Badges:**
- "Ny intresseanmälan": Blue background (209 100% 95%), blue text (209 100% 45%)
- "Kund kontaktad": Yellow/orange background, dark text
- "Vunnen": Green background (142 71% 95%), green text (142 71% 40%)
- "Förlorad": Red background (0 84% 95%), red text (0 84% 50%)
- Rounded-full, px-3, py-1, text-sm, font-medium

**Forms:**
- Input fields: border, rounded-md, p-2.5, focus:ring-2 ring-red-500
- Labels: text-sm, font-medium, mb-1.5
- Textareas: min-h-24 for comments
- Select dropdowns: native styling with lucide-react icons
- Checkbox/Radio: accent color red
- Form sections: separated with mb-6

**Buttons:**
- Primary: bg-red-500, text-white, hover:bg-red-600, px-4, py-2, rounded-md, font-medium
- Secondary: border, border-gray-300, hover:bg-gray-50, same padding
- Ghost: hover:bg-gray-100, text-gray-700
- Icon buttons: p-2, rounded-md, hover:bg-gray-100
- Sizes: sm (px-3 py-1.5 text-sm), default (px-4 py-2), lg (px-6 py-3)

**Charts (Dashboard):**
- Line charts for trends over time (recharts library)
- Bar charts for source comparison
- Use red accent for primary data series
- Gray for secondary/comparison data
- Grid lines: subtle gray (opacity 20%)
- Axis labels: text-xs, text-muted
- Tooltips: white background, shadow, rounded

**Dialogs/Modals:**
- Centered overlay with backdrop (bg-black/50)
- White/dark card, max-w-lg, rounded-lg, p-6
- Header: text-xl, font-semibold, mb-4
- Actions: flex justify-end gap-2 at bottom
- Close icon (X) top-right corner

**Lead Detail Page:**
- Header section: Vehicle title, status badge, assigned user
- Two-column layout below:
  - Left (main): Contact info card, vehicle details card, timeline/comments section
  - Right (sidebar): Quick actions, next steps/tasks, metadata
- Each section in white/dark cards with p-6

### E. Animations

**Minimal Approach:**
- Hover transitions: duration-200, ease-in-out
- Modal/Dialog entry: fade in + slight scale (from 95% to 100%)
- Loading states: simple spinner (border-t-transparent, animate-spin)
- No page transitions, no complex animations

## Swedish Language Implementation

All UI text in Swedish:
- Navigation: "Översikt", "Mina Leads", "Inkommande Leads", "Dashboard", "Inställningar"
- Buttons: "Spara", "Avbryt", "Tilldela", "Skapa Lead", "Lägg till kommentar"
- Status labels as specified: "Ny intresseanmälan", "Kund kontaktad", "Vunnen", "Förlorad"
- Form labels: "Namn", "E-post", "Telefon", "Anläggning", "Nästa steg", "Förfallodatum"
- Dashboard KPIs: "Totalt antal leads", "Konverteringsgrad", "Genomsnittlig svarstid", "Aktiva leads"
- Empty states: "Inga leads att visa", "Börja genom att tilldela leads"

## Specific Page Layouts

**Dashboard:**
- Page header with title "Dashboard" + date range selector
- Row 1: 4 KPI cards (full width on mobile, 4 columns on desktop)
- Row 2: 2-column layout - Line chart (leads över tid) left, Source breakdown (pie/bar) right
- Row 3: Recent leads table (top 10) with "Se alla" link
- All sections in cards with consistent spacing (gap-6)

**Lead List (Säljare):**
- Header: "Mina Leads" + filter buttons (tabs for status)
- Search bar and filter dropdowns (source, anläggning, date range)
- Lead cards in scrollable list
- Empty state illustration/message if no leads

**Lead Detail:**
- Breadcrumb: Mina Leads > [Vehicle Name]
- Full-width header section with key info
- Main content: Comments section, activity timeline
- Sidebar: Edit status, assign actions, metadata display

**Manager Views:**
- "Inkommande Leads" page: Similar to lead list but with bulk assign actions
- Assignment settings: Table of sellers per anläggning with enable/disable toggles
- Dashboard has additional filters for viewing all sellers' data

## Accessibility & Consistency
- Maintain WCAG AA contrast ratios (4.5:1 for normal text)
- Consistent dark mode throughout (including all form inputs)
- Focus states: ring-2 ring-offset-2 ring-red-500
- Icon + text labels for all primary actions
- Responsive breakpoints: sm: 640px, md: 768px, lg: 1024px, xl: 1280px

## Design Quality Standards
- No empty white space - every section purposeful
- Consistent card shadows: shadow-sm for elevation
- Rounded corners: rounded-lg (8px) for cards, rounded-md (6px) for buttons/inputs
- Professional, data-dense layouts that still breathe
- Clear visual hierarchy through size, weight, and color
- Swedish copy that feels natural, not translated