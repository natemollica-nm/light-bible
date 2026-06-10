# Implementation Plan — light-bible

## Overview

Phased plan for building a Bible reading app for Light Phone III using Expo + React Native with the HelloAO Bible API.

## Testing Strategy

**Framework**: Jest + React Native Testing Library

```bash
bun test           # Run all tests
bun test --watch   # Watch mode during development
```

**What to test**:
- `utils/` — Unit tests for all API, cache, and data logic (mock `fetch` and AsyncStorage)
- `components/` — Component tests for rendering, props, and user interaction
- `contexts/` — Test persistence and state transitions

**What NOT to test**:
- Expo plugins, navigation wiring, or platform-specific behavior (covered by manual device testing)

**Convention**:
- Test files live next to source: `utils/bibleApi.ts` → `utils/__tests__/bibleApi.test.ts`
- Each phase includes test tasks — tests must pass before a phase is considered complete

---

## Phase 1: Foundation

**Goal**: App launches, renders a screen, builds an APK. Test infra set up.

### Tasks
- [x] Create `app/_layout.tsx` with root providers (InvertColors, Haptic)
- [x] Create `app/(tabs)/_layout.tsx` with tab navigation (Read, Books, Settings)
- [x] Create placeholder screens: `index.tsx`, `books.tsx`, `settings.tsx`
- [x] Add `utils/scaling.ts` with `n()` normalization function
- [x] Add `components/ContentContainer.tsx` (page wrapper with theme colors)
- [x] Add `components/StyledText.tsx` (themed text with PublicSans font)
- [x] Add `assets/fonts/PublicSans-Regular.ttf`
- [x] Add `contexts/InvertColorsContext.tsx` (black/white toggle, persisted)
- [x] Add `contexts/HapticContext.tsx`
- [x] Add `plugins/withAndroidTheme.js` (black status bar, navigation bar)
- [x] Add `metro.config.js`
- [x] Set up Jest + React Native Testing Library (`jest.config.js`, test script in package.json)
- [x] Test: `utils/__tests__/scaling.test.ts` — verify `n()` returns normalized values
- [x] Test: `components/__tests__/StyledText.test.tsx` — renders children with correct style
- [ ] Verify: `bunx expo run:android` builds and shows tabbed placeholder UI

### Acceptance
- App launches on Android device/emulator
- Three tabs visible (Read, Books, Settings)
- Black background, white text
- `make build` produces an installable APK
- `bun test` passes

---

## Phase 2: Bible API Integration

**Goal**: Fetch and display Bible text from HelloAO API.

### Tasks
- [x] Create `types/bible.d.ts` with Translation, Book, Chapter types
- [x] Create `utils/bibleApi.ts` — fetch translations, books, chapters from HelloAO
- [x] Create `utils/bibleCache.ts` — AsyncStorage read-through cache
- [x] Create `utils/bible.ts` — unified interface (cache → API fallback)
- [x] Create `contexts/TranslationContext.tsx` — selected translation ID, persisted
- [x] Create `contexts/ReadingPositionContext.tsx` — current book/chapter, persisted
- [x] Wire reading screen (`app/(tabs)/index.tsx`) to load and display a chapter
- [x] Add `components/VerseText.tsx` — renders verse number + text
- [x] Add `components/ChapterView.tsx` — scrollable list of verses for a chapter
- [x] Test: `utils/__tests__/bibleApi.test.ts` — mock fetch, verify correct URLs and response parsing
- [x] Test: `utils/__tests__/bibleCache.test.ts` — cache hit returns stored data, cache miss returns null
- [x] Test: `utils/__tests__/bible.test.ts` — uses cache when available, falls back to API, caches result
- [x] Test: `components/__tests__/VerseText.test.tsx` — renders verse number and text
- [ ] Test: `components/__tests__/ChapterView.test.tsx` — renders all verses for a chapter

### Acceptance
- App fetches chapter from API on first load
- Verses render with verse numbers
- Selected translation and reading position persist across app restart
- Second load of same chapter uses cache (no network)
- `bun test` passes

---

## Phase 3: Navigation

**Goal**: Users can navigate between chapters and jump to any book/chapter.

### Tasks
- [x] Implement swipe left/right on reading screen to change chapters
- [x] Auto-advance to next book at end of final chapter
- [x] Create `components/BookPicker.tsx` — grouped by Old/New Testament
- [x] Create `components/ChapterPicker.tsx` — number grid for selected book
- [x] Wire `app/(tabs)/books.tsx` with BookPicker → ChapterPicker flow
- [x] Tapping a chapter in picker navigates to reading screen at that position
- [x] Add `components/Header.tsx` — shows current book + chapter, tap to go to picker
- [x] Prefetch adjacent chapters (N-1, N+1) in background after rendering current
- [x] Test: `components/__tests__/BookPicker.test.tsx` — renders OT/NT sections, fires onSelect
- [x] Test: `components/__tests__/ChapterPicker.test.tsx` — renders correct number of chapters, fires onSelect

### Acceptance
- Swipe navigates chapters fluidly
- Book picker shows all 66 books grouped by testament
- Chapter picker shows correct chapter count per book
- Selecting a chapter updates reading position and displays content
- Header shows "Genesis 1" style label
- `bun test` passes

---

## Phase 4: Translation Selector

**Goal**: Users can browse and switch between all available translations.

### Tasks
- [ ] Create `app/settings/translation.tsx` — full translation list screen
- [ ] Create `components/TranslationList.tsx` — scrollable list with selection indicator
- [ ] Fetch `available_translations.json`, cache the list
- [ ] Group translations by language
- [ ] Selecting a translation updates TranslationContext, navigates back
- [ ] Clear reading cache when translation changes (position preserved, text refetched)
- [ ] Add `SelectorButton` on settings page showing current translation
- [ ] Test: `components/__tests__/TranslationList.test.tsx` — renders translations, highlights selected, fires onSelect

### Acceptance
- Settings → Translation shows all available translations from API
- Current translation highlighted
- Switching translation reloads current chapter in new translation
- Translation list loads from cache on subsequent visits
- `bun test` passes

---

## Phase 5: Offline Downloads

**Goal**: Users can download full translations for guaranteed offline reading.

### Tasks
- [ ] Create `app/settings/downloads.tsx` — manage downloaded translations
- [ ] Create `components/DownloadProgress.tsx` — progress indicator
- [ ] Implement `downloadFullTranslation()` in `utils/bibleCache.ts` with progress callback
- [ ] Show download status per translation (not downloaded / downloading / complete)
- [ ] Allow cancelling an in-progress download
- [ ] Allow removing a downloaded translation (clear cached chapters)
- [ ] Show "Chapter not available offline" when no cache and no network
- [ ] Test: `utils/__tests__/bibleCache.test.ts` — `downloadFullTranslation` calls progress callback, caches all chapters
- [ ] Test: `components/__tests__/DownloadProgress.test.tsx` — renders progress correctly

### Acceptance
- User can download a full translation (shows progress: "245/1189 chapters")
- Downloaded translation works fully offline (airplane mode test)
- User can remove downloaded data
- Graceful message when chapter unavailable offline
- `bun test` passes

---

## Phase 6: Settings & Polish

**Goal**: User preferences and final UX polish.

### Tasks
- [ ] Create `contexts/FontSizeContext.tsx` — adjustable size (range n(14)–n(28)), persisted
- [ ] Create `app/settings/font-size.tsx` — size selector with preview
- [ ] Add invert colors toggle on settings page
- [ ] Add haptic feedback toggle on settings page
- [ ] Add `components/Navbar.tsx` — bottom tab bar styled for Light Phone
- [ ] Add `components/CustomScrollView.tsx` — scroll position indicator
- [ ] Persist scroll position within a chapter
- [ ] Hide status bar and navigation bar (full-screen)
- [ ] Test with large font sizes for accessibility
- [ ] Test RTL translations (direction from API response)
- [ ] Test: `contexts/__tests__/FontSizeContext.test.tsx` — persists and restores font size

### Acceptance
- Font size adjustable and persists
- Theme toggle works (black↔white)
- App is full-screen, no system chrome
- RTL translations render correctly
- All touch targets ≥ 44pt
- `bun test` passes

---

## Phase 7: Build Pipeline & Release

**Goal**: Automated APK builds and release workflow compatible with Obtainium.

### Tasks
- [x] Create `.github/workflows/build.yml` with test → build → release jobs
- [x] Create `scripts/release.sh` — tags version and pushes to trigger release
- [ ] Create `scripts/sync-version.js` — syncs version from app.json to package.json + build.gradle
- [ ] Create `scripts/generate-icon.js` — generates app icon
- [ ] Design minimal app icon (cross or book, monochrome)
- [ ] Add `EXPO_TOKEN` secret to GitHub repo settings
- [ ] Test full pipeline: push tag → tests pass → APK built → release created
- [ ] Verify Obtainium can discover and install from the release
- [ ] Document sideloading/Obtainium instructions in README

### Release Workflow
```
Bump version in app.json
  → make release (creates git tag, pushes)
  → CI: test → build APK → create GitHub release with APK attached
  → Obtainium detects new release → user updates on Light Phone
```

### Obtainium Configuration
Users add the app in Obtainium with:
- **Source**: GitHub Releases
- **Repo URL**: `https://github.com/<owner>/light-bible`
- **APK filter**: `light-bible-*.apk`

### Acceptance
- Pushing a `v*` tag triggers the full pipeline
- CI runs tests — build fails if tests fail
- Release created with consistently named APK (`light-bible-<version>.apk`)
- Obtainium discovers releases and installs/updates the APK
- `make build` works locally
- `make release` tags and pushes in one step

---

## Phase Order & Dependencies

```
Phase 1 (Foundation)
  └── Phase 2 (API Integration)
        ├── Phase 3 (Navigation)
        └── Phase 4 (Translation Selector)
              └── Phase 5 (Offline Downloads)
Phase 6 (Settings & Polish) — can start after Phase 3
Phase 7 (Build Pipeline) — can start after Phase 1, finalize after Phase 6
```

## Current Status

| Phase | Status |
|-------|--------|
| 1. Foundation | 🟡 In progress (pending device verification) |
| 2. API Integration | 🟡 In progress (1 test remaining: ChapterView component test) |
| 3. Navigation | ✅ Complete |
| 4. Translation Selector | ⬜ Not started |
| 5. Offline Downloads | ⬜ Not started |
| 6. Settings & Polish | ⬜ Not started |
| 7. Build Pipeline | 🟡 In progress (workflow created, pending first run) |
