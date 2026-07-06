# Typography System Guide

## Overview

A standardized typography system has been implemented across IKNA to ensure consistent font sizes and bold headings throughout the website.

## Font Weights

All headings now use **bold weight** by default:
- **h1, heading-xl**: `font-black` (900)
- **h2-h5, heading-lg to heading-xs**: `font-bold` (700)
- **h6**: `font-semibold` (600)
- **Body text**: Regular weight (400)

## Heading Hierarchy

Use these semantic HTML tags or CSS classes for all headings:

### Large Headings
```tsx
<h1>Main Page Title</h1>                    {/* 56px */}
<h2>Primary Section Heading</h2>            {/* 36px */}
<h3>Secondary Section Heading</h3>          {/* 30px */}
<h4>Tertiary Heading</h4>                   {/* 24px */}
<h5>Minor Heading</h5>                      {/* 20px */}
<h6>Small Heading</h6>                      {/* 16px */}
```

### Alternative: CSS Classes

If you prefer utility classes:

```tsx
{/* Using heading classes */}
<div className="heading-xl">Main Title</div>
<div className="heading-lg">Section Title</div>
<div className="heading-md">Subsection Title</div>
<div className="heading-sm">Minor Title</div>
<div className="heading-xs">Small Title</div>
```

## Body Text Sizes

### Paragraph Sizes
```tsx
<p>Regular paragraph text (16px on desktop, 14px on mobile)</p>
<p className="body-lg">Large body text (18px on desktop)</p>
<p className="body-sm">Small body text (14px on desktop)</p>
<p className="body-xs">Extra small text (12px on desktop)</p>
```

### Special Text Styles
```tsx
{/* Subtitle - emphasis below main heading */}
<p className="subtitle">Supporting subtitle text</p>

{/* Caption - small emphasis text, uppercase */}
<p className="caption">FEATURED COLLECTION</p>

{/* Label - for form labels and small headings */}
<label className="label">Choose Size</label>

{/* Error & Success Messages */}
<p className="error-text">Please fill in all fields</p>
<p className="success-text">Order placed successfully</p>
```

## Responsive Sizing

All sizes scale automatically on mobile/tablet/desktop:

### Font Size Breakpoints
- **Mobile**: Base sizes
- **Tablet (md)**: +2-4px increase
- **Desktop (lg)**: +4-8px increase

Example:
```tsx
{/* Automatically scales: 24px (mobile) → 30px (tablet) → 36px (desktop) */}
<h2>Responsive Heading</h2>

{/* Manual scaling if needed */}
<p className="text-sm md:text-base lg:text-lg">Custom responsive text</p>
```

## Common Patterns

### Page Header Section
```tsx
<section>
  <h1>Page Title</h1>
  <p className="subtitle">Supporting description</p>
</section>
```

### Section with Cards
```tsx
<section>
  <h2>Section Title</h2>
  <div className="grid">
    <div>
      <h3>Card Title</h3>
      <p className="body-sm">Card description text</p>
    </div>
  </div>
</section>
```

### Form Section
```tsx
<form>
  <label className="label">Email Address</label>
  <input type="email" />
  <p className="caption">Required field</p>
  {error && <p className="error-text">{error}</p>}
</form>
```

## Before and After

### Before (Inconsistent)
```tsx
<h2 className="text-xl md:text-2xl font-serif">Section Title</h2>
<p className="text-sm md:text-base">Paragraph text</p>
```

### After (Standardized)
```tsx
<h2>Section Title</h2>
<p>Paragraph text</p>
```

## Migration Guide

If updating existing components:

1. **Remove custom font sizes from headings** - Just use `<h1>` through `<h6>`
2. **Replace text-lg, text-xl with semantic tags** - `<h2>`, `<h3>`, etc.
3. **Use body text classes** - `.body-lg`, `.body-sm` instead of custom `text-*`
4. **Remove redundant font-bold** - Added by default in h1-h5

## Font Families

- **Headings**: `font-serif` (elegant serif font for h1-h6)
- **Body**: `font-sans` (clean sans-serif for paragraph text)
- **Mono**: `font-mono` (monospace for code only)

## Accessibility

All typography follows WCAG 2.1 standards:
- ✅ Sufficient contrast ratios
- ✅ Logical heading hierarchy (h1 → h2 → h3)
- ✅ Readable line heights
- ✅ Scalable font sizes (no fixed pixels)

## Customization

To modify global typography, edit:
- `app/globals.css` - Base heading and text styles
- `tailwind.config.ts` - Font size and weight values

Changes will apply site-wide automatically.
