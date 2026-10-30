# 🏠 RENOVA — Master Prompt for ChatGPT

Copy everything below the line and paste it into ChatGPT.

---

## ROLE
You are a senior front-end designer + developer. You will build a complete, production-ready, multi-page website called **"Renova"** for a college project. Renova is a home-renovation platform that connects homeowners with contractors, helps estimate costs, provides design inspiration, lists building materials, explains how the platform works, offers a smart AI advisor, and lets users log in.

## OUTPUT FORMAT
- Return **pure HTML + CSS** (inline `<style>` or a linked `styles.css` file is fine).
- Use **vanilla HTML5 + CSS3** (Flexbox/Grid). No frameworks (no Bootstrap/Tailwind) — keep it self-contained so I can open the `.html` file directly in a browser.
- Add a **tiny bit of vanilla JavaScript** only where interactivity is required (tabs, mobile menu, cost estimator calculator, login validation).
- Use **inline SVG** for the logo and icons (no external icon libraries needed).
- Provide **all pages** listed below. You may put each page in its own `.html` file OR use a single-page app with anchor sections — your choice, but clearly separate each page visually.

## BRAND IDENTITY
- **Name:** Renova
- **Tagline:** "Renovate smarter. Build better."
- **Logo concept:** A modern house/roof silhouette combined with a subtle "refresh" arrow or spark — symbolizing transformation. Keep it minimalist, flat, scalable (SVG). The wordmark "Renova" should sit beside the icon. Use orange (#F97316) as the logo's primary color with a grey accent.
- **Vibe:** Trustworthy, modern, clean, professional — like a premium PropTech startup.

## COLOR SYSTEM (MANDATORY)
Use exactly this orange + grey palette:
```
--orange-primary:   #F97316;   /* main buttons, accents, logo */
--orange-dark:      #EA580C;   /* hover states */
--orange-light:     #FFEDD5;   /* soft backgrounds */
--grey-900:         #111827;   /* headings */
--grey-700:         #374151;   /* body text */
--grey-500:         #6B7280;   /* muted text */
--grey-300:         #D1D5DB;   /* borders */
--grey-100:         #F3F4F6;   /* section backgrounds */
--white:            #FFFFFF;
```
Do NOT use blue, indigo, or purple anywhere.

## TYPOGRAPHY
- Headings: `'Poppins', sans-serif` (Google Fonts)
- Body: `'Inter', sans-serif` (Google Fonts)
- Import via Google Fonts `<link>`.

## LAYOUT RULES
- Sticky header navigation on every page (logo left, nav links center/right, "Login" button on the right).
- Sticky footer at the bottom of the viewport on short pages; pushed down naturally on long pages.
- Responsive: mobile-first. Show a hamburger menu under 768px.
- Max content width: 1200px, centered.
- Consistent section padding (e.g., `padding: 80px 0`).
- Cards: rounded corners (12px), subtle box-shadow, `p-6`-equivalent padding.
- Use soft hover transitions on all interactive elements (0.2s ease).

---

## PAGES TO BUILD

### 1. Home Page (index.html)
- **Hero section**: full-width split layout. Left = headline + subtext + two CTA buttons ("Find Contractors" [orange filled], "Estimate Cost" [grey outline]). Right = image or SVG illustration of a renovated home.
- **Stats bar**: 4 stats (e.g., "2,400+ Contractors", "18k Projects Done", "4.9 Avg Rating", "30% Avg Savings").
- **Featured services grid** (6 cards): Find Contractors, Cost Estimator, Inspiration, Materials, How It Works, Smart Advisor — each with icon, title, short description, "Learn more" link.
- **Why Choose Us** section (3 columns): Verified Pros, Transparent Pricing, Smart AI Guidance.
- **Testimonial** slider (2-3 quotes with names).
- **CTA banner**: orange background, "Ready to start your renovation?" + button.

### 2. Find Contractors (find-contractors.html)
- **Page header** with title + search bar (location + trade dropdown: Plumber, Electrician, Carpenter, Painter, Mason, Interior Designer).
- **Filter sidebar**: Trade, Rating (4+), Price range, Availability, Verified only.
- **Contractor cards grid**: photo placeholder, name, trade badge, rating stars, location, "View Profile" + "Book Now" buttons. Show 6–8 sample cards.
- **Sorting dropdown**: Top Rated, Nearest, Most Reviewed.

### 3. Cost Estimator (cost-estimator.html)
- **Interactive calculator** (vanilla JS):
  - Inputs: Room type (dropdown), Area in sq.ft (number), Material quality (Standard/Premium/Luxury radio buttons), Work type (checkboxes: Flooring, Painting, Plumbing, Electrical, Carpentry).
  - Live total cost estimate that updates as user changes inputs (base rate × area × quality multiplier + per-work add-ons).
  - Show a "Estimated Range: ₹X – ₹Y" card.
  - Add a simple bar chart (CSS bars) breaking down cost by category.
- Explain formula briefly in a "How we calculate" collapsible section.

### 4. Inspiration (inspiration.html)
- **Masonry/grid gallery** of renovation projects (use placeholder images via `https://picsum.photos`).
- **Category filter tabs**: Kitchen, Bathroom, Living Room, Bedroom, Outdoor, Office.
- Each tile: image, title, style tag, "Save" heart icon.
- **Mood board idea** section at the bottom.

### 5. Materials (materials.html)
- **Material catalog** grid with cards: image, name (e.g., Oak Laminate Flooring), category, price per unit, "Add to list" button.
- Categories sidebar: Cement, Paints, Tiles, Wood, Plumbing, Electrical, Hardware.
- **Compare** feature (checkbox to add 2-3 items to a comparison table).

### 6. How It Works (how-it-works.html)
- **4-step process** with numbered icons:
  1. Tell us your project
  2. Get matched with contractors
  3. Estimate & compare costs
  4. Build with confidence
- **Timeline-style** vertical layout on mobile, horizontal on desktop.
- **FAQ accordion** (5-6 common questions).

### 7. Login (login.html)
- Centered card on a grey background.
- Two-column layout inside card: left = brand panel with orange gradient + tagline, right = login form (Email, Password, "Remember me", "Forgot password?", "Sign In" button, "Don't have an account? Sign up" link).
- Add a "Continue as Guest" secondary option.
- Vanilla JS validation (email format + non-empty password).

### 8. Smart Advisor (smart-advisor.html)
- **Chat-style UI** — a clean chat window (grey background, orange user bubbles on the right, grey bot bubbles on the left).
- Suggested prompt chips above the input: "What's the cost of remodeling a 200 sq.ft kitchen?", "Best materials for bathroom?", "How to find a reliable painter?".
- A mock bot reply for the first user message (you don't need a real AI — just simulate one canned smart response).
- Sidebar: "Advisor history" list + "New chat" button.

---

## SHARED COMPONENTS
### Header (every page)
- Logo (SVG) + "Renova" wordmark
- Nav links: Home, Find Contractors, Cost Estimator, Inspiration, Materials, How It Works, Smart Advisor
- "Login" button (orange outline on light bg)
- Mobile hamburger menu (JS toggle)

### Footer (every page, sticky to bottom)
- 4 columns:
  1. Brand + short description + social icons (SVG)
  2. Services links
  3. Company links (About, Contact, Careers, Blog)
  4. Newsletter signup (email input + subscribe button)
- Bottom bar: "© 2025 Renova. Built for college project." + privacy/terms links.

## QUALITY BAR
- Pixel-clean, no overlapping elements.
- Consistent spacing, alignment, and shadows.
- Accessible: semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), alt text on images, focus states.
- Mobile + tablet + desktop responsive.
- No Lorem Ipsum filler — write realistic Renova copy.

## DELIVERABLES
1. All HTML pages (linked together via the nav)
2. One shared `styles.css` (or inline if single-file)
3. Small `script.js` for the menu, calculator, login validation, and chat UI
4. A short note at the top listing the files

Start now and build the complete website.
