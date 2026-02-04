# Battleship Graphics Pack (Classic Navy)

This pack is **self-contained** and uses **SVG assets** (crisp at any size).

## Folder layout

- `assets/tiles/` water tiles
- `assets/ships/` ship sprites (carrier, battleship, cruiser, submarine, destroyer)
- `assets/markers/` hit/miss markers
- `assets/ui/` small icons (manual/random/rotate)
- `css/theme.css` drop-in theme starter

## Quick install (plain HTML/JS)

1) Copy `assets/` and `css/` into your repo root (or wherever your game is hosted).
2) Include the stylesheet in your `index.html`:

```html
<link rel="stylesheet" href="css/theme.css">
```

3) Apply classes:
- Add `board` to your grid container.
- Add `cell` to each grid square.
- Add `ship` for squares that contain a ship (optionally override the ship image).
- Add `hit` or `miss` for fired-on squares.

## Choosing which ship sprite to show

Option A: swap per-cell with inline style

```js
cellEl.style.backgroundImage = `url('assets/tiles/water.svg'), url('assets/ships/battleship.svg')`;
cellEl.style.backgroundSize = 'cover, 90% 90%';
cellEl.style.backgroundRepeat = 'no-repeat, no-repeat';
cellEl.style.backgroundPosition = 'center, center';
```

Option B: per-ship class names (recommended)
Add classes like `ship ship--battleship` and define CSS rules:

```css
.cell.ship--battleship{
  background-image: url("../assets/tiles/water.svg"), url("../assets/ships/battleship.svg");
}
```

## Notes
- These are SVGs, so you can recolor them quickly if you want a different vibe.
- If your game uses a different folder structure, update the relative paths in `css/theme.css`.
