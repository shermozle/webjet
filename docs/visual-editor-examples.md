# Webjet developer-led edit examples

These are reviewable examples for the landing page. They are not an installed Statsig visual editor. Statsig Sidecar is currently deprecated; confirm the supported product/workflow before using it in a pitch.

## HTML

Change the supporting paragraph to:

```html
<p id="hero-description">Compare your options. See your total. Book your next escape with confidence.</p>
```

## CSS

```css
#hero-cta {
  background: #ffffff;
  color: #08736c;
  padding: 14px 20px;
  border-radius: 8px;
  text-decoration: none;
}
```

## JavaScript

```js
const headline = document.querySelector('#hero-headline');
if (headline) headline.textContent = 'Less searching. More going.';
```

DOM edits should be applied after React renders and may be replaced by React updates. For a persistent SDK-controlled experience, implement changes through the React component's experiment parameters. Keep local forced controls off while demonstrating a separate visual editing tool.
