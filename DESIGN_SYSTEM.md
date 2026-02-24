# 🎨 Design System Quick Reference

## Color Variables
```css
:root {
    --gold: #C9A961              /* Primary accent (warm, sophisticated) */
    --gold-dim: #A68B4F          /* Muted variant for depth */
    --gold-light: #E8D9B0        /* Soft highlight (rarely used) */
    --bg-white: #FFFFFF          /* Primary background */
    --bg-cream: #FAF9F6          /* Subtle texture, warm white */
    --text-dark: #1A1A1A         /* Primary text (almost black) */
    --text-medium: #4A4A4A       /* Secondary text (labels, hints) */
    --text-light: #6B6B6B        /* Tertiary text (de-emphasized) */
}

:root.dark {
    --bg-white: #0F0F0F          /* True black for OLED */
    --bg-cream: #1A1A1A          /* Slightly lighter than true black */
    --text-dark: #F0F0F0         /* Off-white (not pure white) */
    --text-medium: #B8B8B8       /* Medium gray */
    --text-light: #909090        /* Light gray */
}
```

## Spacing Variables
```css
--spacing-section: 56px          /* Vertical rhythm: 48-64px between major sections */
--spacing-card: 28px             /* Padding inside cards: 24-32px */

/* Usage */
.memory-card { margin-bottom: 80px; }        /* mb-20 in Tailwind = 80px */
.section-spacer { height: 56px; }            /* Explicit vertical break */

/* Mobile (< 768px) */
--spacing-section: 42px          /* 75% of desktop (56px * 0.75) */
```

## Border Radius Variables
```css
--radius-card: 18px              /* Cards, memory containers */
--radius-button: 12px            /* Buttons, inputs */

/* Always use 16-20px for cards as per design system */
```

---

## Typography System

### Serif Hierarchy (Playfair Display)
```
H1: 5xl–6xl, 700, leading-tight       /* Message title: "HAPPY BIRTHDAY" */
H2: 2xl, 700, leading-normal          /* Section title: "Special Place" */
H3: xl, 700, leading-normal           /* Card title: "Favourite Song" */
```

### Sans-Serif Hierarchy (Inter)
```
Body: 1rem, 400, leading-relaxed      /* Message text, readable */
Label: 0.75rem, 500, tracking-wide    /* "Video Memory", "Love Note" */
Caption: 0.875rem, 400, tracking-wide /* "A memory captured just for you" */
Button: 0.875rem, 600, letter-spacing /* "Play on Spotify", "Open in Maps" */
```

### NO ITALICS (Design system rule)
```
/* DON'T DO THIS */
<p style="font-style: italic;">Italicized text</p>

/* DO THIS INSTEAD */
<p style="font-weight: 300;">Lighter weight for emphasis</p>
<p style="font-weight: 700;">Heavier weight for emphasis</p>
```

---

## Component Recipes

### Memory Card
```html
<div class="memory-card mb-20">                    <!-- Reusable container -->
    <span class="section-label accent">Section</span>  <!-- Label in gold -->
    <!-- Content here -->
</div>
```

### Reveal Page - Title Card (First Card)
```html
<div class="memory-card-swipe" data-card="intro">
    <img id="message-image" src="" alt="" class="card-intro-image" />
    <div class="card-intro-content">
        <h1 id="message-title" class="serif-title text-4xl md:text-5xl leading-tight mb-4 text-center">
            <!-- Dynamic title from ITEM_DATA.title -->
        </h1>
        <span id="message-from" class="text-gold text-xs italic font-light text-center block mb-2">
            <!-- Author: "With love: [sender name]" -->
        </span>
        <span id="message-sign" class="text-gold text-xs uppercase tracking-widest text-center block">
            <!-- Signature or fallback sender name -->
        </span>
    </div>
</div>
```
**Data mapping:**
- Image: `ITEM_DATA.image_url` or `ITEM_DATA.image` → top 40% of card
- Title: `ITEM_DATA.title` or `ITEM_DATA.heading` → bottom 60%
- With Love: `ITEM_DATA.sender` → displays as "With love: [name]"
- Signature: `ITEM_DATA.signature` → custom signature (optional)

### Reveal Page - Message Card (Second Card - Merged Video + Message)
```html
<div class="memory-card-swipe" data-card="message">
    <div id="video-card" class="hidden">
        <div id="video-thumbnail-container" class="w-full h-1/2 cursor-pointer group relative overflow-hidden">
            <img id="video-thumbnail" src="" alt="" class="w-full h-full object-cover" />
            <!-- Play button overlay (shown on hover) -->
        </div>
    </div>
    <div class="flex flex-col h-full overflow-auto">
        <p id="message-body" class="serif-title text-xl md:text-2xl leading-relaxed font-light text-center break-words whitespace-pre-wrap px-6 py-8">
            <!-- Dynamic message text -->
        </p>
    </div>
</div>
```
**Features:**
- Video thumbnail occupies top 50% (hidden if no video)
- Message text occupies remaining space (scrollable if needed)
- Video clickable to open modal
- Responsive typography for mobile

### Section with Spacing
```html
<div class="section-spacer"></div>               <!-- 56px vertical break -->
<div class="text-center pt-12 border-t border-gold/15">
    <!-- Content with top border and spacing -->
</div>
```

### Button Pair
```html
<div class="flex gap-3 justify-center">
    <button class="btn-primary-outline flex-1">
        <i data-lucide="send"></i> Share
    </button>
    <button class="btn-primary-outline flex-1">
        <i data-lucide="link"></i> Copy Link
    </button>
</div>
```

### Icon + Text
```html
<div class="flex items-center justify-center gap-2">
    <i data-lucide="music" class="w-4 h-4 text-gold"></i>
    <span class="text-sm text-medium">Play on Spotify</span>
</div>
```

---

## State Variations

### Buttons
```css
.btn-primary
  default     -> gradient gold, white text
  :hover      -> translateY(-2px), shadow increase
  :active     -> scale(0.98), shadow decrease

.btn-primary-outline
  default     -> transparent, gold border
  :hover      -> filled gold, white text, shadow
  :active     -> scale(0.98)
```

### Memory Cards
```css
.memory-card
  default     -> soft shadow, subtle border
  :hover      -> shadow increase, border color shift
```

### Video Thumbnail
```css
#video-thumbnail-container
  default     -> thumbnail visible, play icon visible
  :hover      -> thumbnail opacity increases, play icon scales up
  :click      -> opens video modal (overlay with iframe)
```

---

## Dark Mode Implementation

### CSS Variable Override
```css
:root.dark {
    --text-dark: #F0F0F0;
    --bg-white: #0F0F0F;
    /* All components automatically adapt */
}
```

### Component Overrides
```css
.dark .memory-card {
    background: rgba(15, 15, 15, 0.85);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.dark .btn-primary-outline:hover {
    background: var(--gold);
    color: #0F0F0F;                    /* Text becomes dark on gold */
}
```

### Automatic on Toggle
```html
<button class="theme-toggle" id="theme-toggle">🌙</button>
<!-- JavaScript adds/removes .dark class on html element -->
<!-- All CSS variables and .dark rules apply automatically -->
```

---

## Responsive Breakpoints

### Desktop (> 768px)
```css
.reveal-page-wrapper {
    padding: 60px 24px;
    max-width: 800px;
    margin: 0 auto;
}

.section-spacer {
    height: 56px;
}

.memory-card {
    padding: 28px 32px;
    margin-bottom: 80px;
}
```

### Mobile (< 768px)
```css
.reveal-page-wrapper {
    padding: 40px 16px;              /* Reduced horizontal padding */
}

.section-spacer {
    height: 42px;                    /* 75% of desktop */
}

.memory-card {
    padding: 24px;                   /* Reduced from 28-32px */
}

h1 {
    font-size: 2.25rem;              /* Reduced from 4rem */
}
```

---

## Animation & Transitions

### Smooth Interactions
```css
transition: all 0.3s ease;          /* Default on buttons */
transition: background-color 0.3s, color 0.3s;
transition: box-shadow 0.2s ease;   /* Subtle shadow shift */
```

### Hover Effects
```css
transform: translateY(-2px);        /* Lift effect on hover */
box-shadow: 0 6px 24px rgba(...);   /* Shadow increase */
```

### GPU Optimization
```css
/* Use transform and opacity (GPU accelerated) */
transform: translateY(-2px);
opacity: 0.7;

/* Avoid repaints: don't animate width, height, left, etc. */
/* DON'T: animation: slide { left: 0 → 100px; } */
```

---

## Screen & Page Styling

### Card Stack - Portrait Orientation
```css
/* Card dimensions: portrait (narrow width, tall height) */
.memory-card-swipe {
    width: 85%;
    max-width: 450px;
    height: 90vh;
    max-height: 900px;
    background: #1A1A1A;
    border-radius: 24px;
    overflow: hidden;
}

@media (max-width: 768px) {
    .memory-card-swipe {
        width: 90%;
        height: 88vh;
    }
}
```
```css
/* Screen container - handles transitions */
.screen {
    display: none;                   /* Hidden by default */
}

.screen.active {
    display: flex;                   /* Visible & active */
}

.hidden-up {
    display: none;                   /* Initially hidden, revealed via JS */
}
```

### Screen Background Styling
```html
<!-- Connecting Screen (NFC Handshake) -->
<div id="screen-connect" class="screen active bg-gradient-to-b from-white to-cream dark:from-[#0F0F0F] dark:to-[#1A1A1A]">

<!-- Welcome Screen -->
<div id="screen-welcome" class="screen hidden-up bg-gradient-to-b from-white to-cream dark:from-[#0F0F0F] dark:to-[#1A1A1A]">

<!-- Details Screen (3D Model Viewer) -->
<div id="screen-details" class="screen hidden-up bg-white/95 backdrop-blur-sm dark:bg-[#1A1A1A]/95">

<!-- Message/Reveal Screen (Premium Content) -->
<div id="screen-message" class="screen hidden-up bg-white/95 backdrop-blur-sm dark:bg-[#1A1A1A]/95">

<!-- Not Found Screen (Error State) -->
<div id="screen-notfound" class="screen hidden-up bg-gradient-to-b from-white to-cream dark:from-[#0F0F0F] dark:to-[#1A1A1A]">
```

### Screen-Specific Classes
```css
/* All screens use consistent spacing wrapper */
.reveal-page-wrapper {
    max-width: 800px;
    margin: 0 auto;
    padding: 60px 24px;              /* Desktop */
}

@media (max-width: 768px) {
    .reveal-page-wrapper {
        padding: 40px 16px;          /* Mobile */
    }
}

/* 3D Model Viewer Container */
#model-viewer {
    width: 100%;
    height: 600px;                   /* Responsive height */
    border-radius: var(--radius-card);
}

/* NFC Status & Loading States */
.nfc-status {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: var(--radius-button);
    background: rgba(201, 169, 97, 0.1);
    border: 1px solid var(--gold)/20;
}
```

---

## Common Patterns

### De-emphasized Element
```html
<button class="back-arrow">
    <i data-lucide="arrow-left" class="w-5 h-5"></i>
</button>
```
```css
.back-arrow {
    color: var(--text-medium);       /* Medium gray */
    opacity: 0.7;                    /* Subtle */
    transition: all 0.3s ease;
}

.back-arrow:hover {
    color: var(--gold);              /* Highlights on hover */
    opacity: 1;
}
```

### Emotional Focus (Large Serif)
```html
<h1 class="serif-title text-5xl md:text-6xl font-bold">HAPPY BIRTHDAY</h1>
```
- Serif font (Playfair)
- Large size (80-96px on desktop)
- Bold weight (700)
- No italics

### Secondary Label
```html
<span class="section-label">Love Note</span>
```
- Small (0.75rem)
- Letter-spaced (0.15em)
- Uppercase
- Medium gray (non-competing)

### External Link Button
```html
<a href="https://..." class="btn-primary" target="_blank" rel="noopener noreferrer">
    <i data-lucide="music"></i>
    <span>Play on Spotify</span>
</a>
```

---

## Accessibility Checklist

✅ **Contrast Ratios**
- Dark text on white: 18.75:1 (WCAG AAA)
- Gold on white: 4.2:1 (WCAG AA)

✅ **Font Sizes**
- Body text: 1rem (16px) minimum
- Labels: 0.75rem (12px) only for secondary info
- Buttons: 0.875rem (14px) with adequate padding

✅ **Focus States**
- Buttons have visible :hover and :focus states
- Modal close button has clear focus indicator

✅ **Color Not Alone**
- Buttons use icon + text (not color alone)
- Links use icons or clear text labels

✅ **Touch Targets**
- Buttons: minimum 44×44px
- Back arrow: 40×40px area

---

## Troubleshooting

### Font Not Loading
**Problem**: Serif/sans-serif fonts appear as fallback
**Solution**: Check Google Fonts CDN link in `<head>`
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### Dark Mode Not Working
**Problem**: Dark mode toggle doesn't switch colors
**Solution**: Ensure `.dark` class is on `<html>` element
```javascript
/* In theme.js */
if (isDarkMode) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}
```

### Video Thumbnail Blank
**Problem**: Video thumbnail image doesn't load
**Solution**: YouTube thumbnail must be valid format
```javascript
// Correct format:
`https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg`

// Variants available:
// /default.jpg (120×90)
// /mqdefault.jpg (320×180)
// /hqdefault.jpg (480×360)
```

### Mobile Layout Broken
**Problem**: Content doesn't reflow on mobile
**Solution**: Check media query is applying
```css
@media (max-width: 768px) {
    .reveal-page-wrapper { padding: 40px 16px; }
}
```

---

## Import Statements (For Reference)

### CSS
```css
/* Design System Variables */
:root { --gold: #C9A961; ... }

/* Reusable Components */
.memory-card { ... }
.section-label { ... }
.btn-primary { ... }
.btn-primary-outline { ... }

/* Component-Specific */
#video-card { ... }
#song-card { ... }
#location-card { ... }
```

### HTML
```html
<!-- Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">

<!-- Styles -->
<link rel="stylesheet" href="styles.css">

<!-- Icons -->
<script src="https://unpkg.com/lucide@latest"></script>
```

### JavaScript
```javascript
// Video modal function (defined in script.js)
function openVideoModal(videoUrl) { ... }

// Data population logic (in Supabase fetch handler)
const videoCard = document.getElementById('video-card');
videoCard.classList.remove('hidden');
```

---

**Ready to use! Copy-paste recipes above for consistent implementation across components.** ✨
