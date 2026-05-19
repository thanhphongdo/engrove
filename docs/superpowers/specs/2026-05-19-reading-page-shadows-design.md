# Design Spec: Drop Shadows for Reading Lesson Blocks

## Context & Goal
The user requested adding drop shadows to the blocks on the reading lesson detail page (`/reading/[lessonId]`). Adding drop shadows provides visual depth and a premium, modern floating card feel.

The goal is to apply Tailwind's soft and modern `shadow-md` class to all container blocks on the page, including the main lesson content (Passage, Questions, Cloze, Attempt History, Notes) and the secondary/callout containers (Summary box, Critical thinking block, Grammar notes).

## Design Options
- **Selected Option**: Approach 1 (Tailwind Utility Classes Directly).
- **Shadow Style**: `shadow-md` (Soft & Modern shadow).
- **Target Files**:
  - `src/app/(app)/reading/[lessonId]/page.tsx`
  - `src/components/reading/grammar-notes.tsx`
  - `src/components/reading/attempt-history.tsx`
  - `src/components/reading/lesson-notes.tsx`

## Modifications Details

### 1. Main Page (`src/app/(app)/reading/[lessonId]/page.tsx`)
- Add `shadow-md` to the following container elements:
  - The top summary div (`mb-4 rounded-md border bg-muted/40 p-3 text-sm italic shadow-md`).
  - The Passage block `<section>` container.
  - The Multiple-Choice Questions `<section>` container.
  - The Cloze Block `<section>` container.
  - The Critical Thinking `<section>` container.

### 2. Nested Components
- Add `shadow-md` to:
  - `GrammarNotes` (`src/components/reading/grammar-notes.tsx`) container.
  - `AttemptHistory` (`src/components/reading/attempt-history.tsx`) container.
  - `LessonNotes` (`src/components/reading/lesson-notes.tsx`) container.

## Verification Checklist
- [ ] Verify that all updated blocks have the class `shadow-md`.
- [ ] Check page responsiveness and ensure no horizontal scrollbars are introduced.
- [ ] Verify dark mode looks correct (Tailwind's shadow classes are automatically subtle or adapt in dark mode depending on theme colors).
