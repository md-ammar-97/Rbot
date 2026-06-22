---
name: Vibrant Intelligence
colors:
  surface: '#fbf8ff'
  surface-dim: '#d9d9e6'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2ff'
  surface-container: '#ededfa'
  surface-container-high: '#e7e7f4'
  surface-container-highest: '#e2e1ef'
  on-surface: '#191b24'
  on-surface-variant: '#434656'
  inverse-surface: '#2e303a'
  inverse-on-surface: '#f0effd'
  outline: '#747688'
  outline-variant: '#c4c5d9'
  surface-tint: '#124af0'
  primary: '#0040e0'
  on-primary: '#ffffff'
  primary-container: '#2e5bff'
  on-primary-container: '#efefff'
  inverse-primary: '#b8c3ff'
  secondary: '#6b38d4'
  on-secondary: '#ffffff'
  secondary-container: '#8455ef'
  on-secondary-container: '#fffbff'
  tertiary: '#005e6e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00788c'
  on-tertiary-container: '#d7f6ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c3ff'
  on-primary-fixed: '#001356'
  on-primary-fixed-variant: '#0035be'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#fbf8ff'
  on-background: '#191b24'
  surface-variant: '#e2e1ef'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-technical:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 8px
  container-padding: 24px
  gutter: 16px
  section-gap: 48px
---

## Brand & Style
The brand personality is high-momentum, intelligent, and motivating. It positions itself as a powerful co-pilot that transforms the tedious job application process into a high-performance career engine. Unlike sterile corporate tools, this design system embraces a "Hyper-Functional Neon" aesthetic, blending the precision of high-end SaaS with the energy of creative tech.

The visual style is a hybrid of **Modern Glassmorphism** and **Tactile Depth**. It uses vibrant gradients and floating UI elements to create a sense of lightness and speed. The interface should feel "alive"—not just a static tool, but an active partner that celebrates every milestone with rich visual feedback and 3D-inflected depth.

## Colors
The palette is built around "Electric" saturations. **Electric Blue** serves as the primary action color, signaling trust and professional stability. **Violet** and **Cyan** are used for secondary functions and AI-driven insights, creating a "tech-forward" aura.

**Emerald** is reserved for positive Fit-Scores and successful submissions, while **Gold/Orange** highlights achievements (e.g., "Interview Secured"). Surfaces are predominantly semi-transparent glass with subtle white tints, allowing background gradients of soft blue and violet to peek through, ensuring the UI feels deep and layered rather than flat.

## Typography
The system utilizes **Inter** for the majority of the interface to maintain maximum readability for complex job descriptions and resume data. Headlines use a tight tracking (letter-spacing) and heavy weights to convey momentum.

To contrast the humanist feel of Inter, **Geist** is used for technical labels, metadata, and AI status indicators. This adds a "developer-tool" precision that aligns with the PM persona. For mobile, headline sizes scale down significantly to ensure long job titles do not break the layout, while maintaining the bold, authoritative weight.

## Layout & Spacing
The layout follows a **Fluid-Fixed Hybrid**. While the sidebar and utility panels are fixed widths, the primary workspace expands to accommodate data-heavy tables and resume editors. We utilize an 8px spacing scale to ensure mathematical harmony between elements.

On desktop, the layout is a 12-column grid. On mobile, the interface collapses into a single-column stack where "Floating Action Buttons" (FABs) take over primary tasks like "Apply with RBot." Dynamic padding is used for "Glass" cards to create a sense of breathability, with internal card padding never dropping below 20px to maintain a premium feel.

## Elevation & Depth
Elevation is not conveyed through simple gray shadows, but through **Color-Tinted Ambient Shadows**. High-priority cards (like a 'Top Match' job) cast a soft blue or violet shadow to pull them away from the background.

We use three primary layers:
1.  **The Canvas:** The bottom-most layer with soft, sweeping mesh gradients.
2.  **The Glass Layer:** Semi-transparent containers with a `backdrop-filter: blur(20px)`. These have a 1px solid white border at 20% opacity to define their edges.
3.  **Floating Elements:** Buttons and tooltips that sit at the highest Z-index, casting deep, soft shadows (Blur: 30px, Y: 10px, Opacity: 15% of the primary color).

## Shapes
The design system uses a consistent **12px to 16px radius** for all primary containers and cards. This "Rounded" approach softens the technical nature of the AI, making the co-pilot feel approachable.

- **Small Components (Inputs/Chips):** 8px radius.
- **Standard Cards:** 16px radius.
- **Large Modals/Sheets:** 24px radius.
- **Buttons:** 12px or fully pill-shaped for "AI-generated" actions to distinguish them from standard navigation.

## Components
### Buttons & Controls
Primary buttons use a **Vibrant Gradient** (Electric Blue to Violet) with a subtle inner glow. Hover states should "lift" the button using a shadow expansion. Secondary buttons use the Glassmorphism style: a semi-transparent fill with a crisp 1px border.

### Fit-Score Reveals
The Fit-Score is a signature component. It should be a circular gauge or a high-contrast pill using the **Emerald** to **Gold** spectrum. The score should animate from 0 to the final value using a "spring" easing function to create a sense of excitement.

### Input Fields
Inputs are clean with a light background and a 1px border that glows **Electric Blue** when focused. Placeholder text should be high-contrast enough for accessibility but distinct from user input.

### Illustration & AI Indicators
Visuals should be 3D-inflected with a "claymorphism" or "glass-and-metal" texture. AI status is indicated by a pulsing "Aura" effect—a soft, glowing ring that breathes around active elements.

### Animation Guidelines
Transitions must be snappy but smooth (approx 300ms). Use `cubic-bezier(0.34, 1.56, 0.64, 1)` for "entry" animations to give elements a slight bounce, reinforcing the high-momentum tone. Progress bars should have a "shimmer" effect moving through the fill.