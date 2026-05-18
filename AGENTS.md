<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ui-rules -->
# UI rules

## Componentization
- Never build a page as one monolithic file. Split it into focused components, each with a single responsibility.
- Compose larger components out of primitives. Before creating a new primitive, search `src/components/` (especially `src/components/ui/`) for one you can reuse or extend. Only add a new primitive when nothing existing fits.
- A "primitive" is a low-level, presentation-only building block (button, input, card, badge, etc.). Feature components compose primitives; pages compose feature components.

## Styling
- Use Tailwind utility classes. Inline `style={{...}}` is a last resort — only when a value is truly dynamic (computed at runtime from props/state) and cannot be expressed via Tailwind's arbitrary-value syntax.
- Use `rem` for sizing, spacing, and typography, not `px`. Tailwind's default scale is already rem-based — prefer scale tokens (`p-4`, `text-base`) over arbitrary values, and when you do need an arbitrary value write `[1.5rem]` not `[24px]`. Exception: `1px` borders/dividers.
- Pull colors, radii, and spacing from the design tokens defined in `src/app/globals.css` and the Tailwind theme. Do not hardcode hex colors in components.

## Libraries
- When a task needs a capability the codebase doesn't already cover, reach for the best-in-class library for this stack rather than hand-rolling. Examples already chosen: `react-hook-form` + `zod` for forms, `@tanstack/react-query` for server state, `zustand` for client state, `date-fns` for dates, `sonner` for toasts, `lucide-react` for icons, shadcn/Radix for primitives.
- Before installing, check `package.json` — the dependency may already be there. If it isn't, install it with the project's package manager and mention what you added and why in your response.
- Prefer extending an existing dependency over adding an overlapping one (e.g. don't add `moment` when `date-fns` is present).

## Consistency
- Every page should feel like part of the same product: same primitives, same spacing rhythm, same typography scale, same interaction patterns (loading, empty, error states), same toast/dialog behavior.
- Before designing a new pattern, look at how existing pages solve the same problem and match them. If you need to diverge, the divergence should be deliberate, not accidental.
- When you introduce a new shared pattern, refactor at least one existing usage to adopt it so the pattern is proven and discoverable.
<!-- END:ui-rules -->
