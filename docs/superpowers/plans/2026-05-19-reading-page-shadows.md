# Reading Page Shadows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a soft, modern shadow (`shadow-md`) to all content and secondary blocks on the Reading Lesson Detail page to enhance the visual aesthetic and user experience.

**Architecture:** We will apply Tailwind's utility class `shadow-md` directly to the container elements of each block in the main page and nested components.

**Tech Stack:** React, Next.js (App Router), Tailwind CSS v4.0

---

### Task 1: Main Page Containers

**Files:**
- Modify: `src/app/(app)/reading/[lessonId]/page.tsx`

- [ ] **Step 1: Modify main page layout blocks**
  Open `src/app/(app)/reading/[lessonId]/page.tsx` and add `shadow-md` class to the following 5 block containers:
  - Summary container (around line 123)
  - Passage `<section>` container (around line 145)
  - Multiple-Choice Questions `<section>` container (around line 199)
  - Cloze Block `<section>` container (around line 210)
  - Critical Thinking `<section>` container (around line 220)

  Verify changes look like this:
  ```tsx
  // 1. Summary box
  <div className="mb-4 rounded-md border bg-muted/40 p-3 text-sm italic shadow-md">
    <strong className="not-italic">Summary:</strong> {lesson.summary}
  </div>

  // 2. Passage section
  <section
    className={cn(
      "relative rounded-md border bg-card p-3 sm:p-4 shadow-md",
      ...
    )}
  >

  // 3. MC Questions section
  <section
    className={cn(
      "rounded-md border bg-card p-3 sm:p-4 shadow-md",
      ...
    )}
  >

  // 4. Cloze block
  {lesson.cloze && (
    <section className="mt-3 rounded-md sm:mt-4 border bg-card p-3 sm:p-4 shadow-md">
      <ClozeBlock />
      <ClozeReview />
    </section>
  )}

  // 5. Critical thinking section
  {lesson.criticalThinkingQuestion && (
    <section className="mt-3 rounded-md sm:mt-4 border-l-4 border-primary bg-muted/40 p-3 sm:p-4 shadow-md">
      ...
    </section>
  )}
  ```

- [ ] **Step 2: Commit main page changes**
  Run:
  ```bash
  git add src/app/\(app\)/reading/\[lessonId\]/page.tsx
  git commit -m "style(reading): add shadow-md to main page block containers"
  ```

---

### Task 2: Grammar Notes Component

**Files:**
- Modify: `src/components/reading/grammar-notes.tsx`

- [ ] **Step 1: Add shadow-md to GrammarNotes component**
  Open `src/components/reading/grammar-notes.tsx` and add `shadow-md` to the `<section>` container.
  
  ```tsx
  export function GrammarNotes({ notes }: { notes: GrammarNote[] }) {
    if (notes.length === 0) return null;
    return (
      <section className="rounded-md border-l-4 border-primary bg-muted/40 p-3 sm:p-4 shadow-md">
        ...
      </section>
    );
  }
  ```

- [ ] **Step 2: Commit Grammar Notes changes**
  Run:
  ```bash
  git add src/components/reading/grammar-notes.tsx
  git commit -m "style(reading): add shadow-md to GrammarNotes block container"
  ```

---

### Task 3: Attempt History Component

**Files:**
- Modify: `src/components/reading/attempt-history.tsx`

- [ ] **Step 1: Add shadow-md to AttemptHistory component**
  Open `src/components/reading/attempt-history.tsx` and add `shadow-md` to the `<section>` container.

  ```tsx
  export function AttemptHistory({ lessonId }: { lessonId: string }) {
    ...
    return (
      <section className="mt-6 rounded-md border bg-card p-4 shadow-md">
        ...
      </section>
    );
  }
  ```

- [ ] **Step 2: Commit Attempt History changes**
  Run:
  ```bash
  git add src/components/reading/attempt-history.tsx
  git commit -m "style(reading): add shadow-md to AttemptHistory block container"
  ```

---

### Task 4: Lesson Notes Component

**Files:**
- Modify: `src/components/reading/lesson-notes.tsx`

- [ ] **Step 1: Add shadow-md to LessonNotes/NotesEditor component**
  Open `src/components/reading/lesson-notes.tsx` and add `shadow-md` to the `<section>` container.

  ```tsx
  function NotesEditor({
    lessonId,
    initial,
  }: {
    lessonId: string;
    initial: Note | null;
  }) {
    ...
    return (
      <section className="mt-6 rounded-md border bg-card shadow-md">
        ...
      </section>
    );
  }
  ```

- [ ] **Step 2: Commit Lesson Notes changes**
  Run:
  ```bash
  git add src/components/reading/lesson-notes.tsx
  git commit -m "style(reading): add shadow-md to LessonNotes block container"
  ```

---

### Task 5: Build Verification

- [ ] **Step 1: Check build/lint status**
  Run the Next.js build command to verify that there are no syntax, typescript, or linting errors introduced by these style additions.
  Run: `npm run build`
  Expected: Successful production build without errors.
