# Image-generation style anchor

Append this anchor to every per-post subject when generating an
above-the-fold image for vwwwv. It keeps the look consistent across
posts so the feed reads as one publication, not a magazine of styles.

## The anchor

```
Chinese propaganda poster, 1965, hand-printed limited palette, deep
crimson and ochre on aged cream paper, heavy black outlines, flat
planes, slight off-register print, no text, no logos, no people on
laptops. References: Stefan Landsberger archive, IISH collection.
```

## How to compose a per-post prompt

```
{persistent_style_anchor}, {per_post_subject}, {composition_note}
```

### Examples

- Alpine botany post → "...Saxifraga oppositifolia growing from rock at
  altitude, two-color print, central composition with radiating light"
- Code post → "...a fist holding a soldering iron, factory smokestacks
  in the background as repeated motif"
- Trueborn fragment → "...a hand drawing a coastline that doesn't match
  the survey, ink on cream"
- Curiosities post about the gear icon → "...giant gear suspended in
  bright yellow rays over a workbench, hand-painted feel"

## What to ask the model NOT to do

- No text or lettering in the image (the figure caption does the work
  in the page layout)
- No modern UI elements (laptops, phones, monitors, chat bubbles)
- No photography-realistic rendering — keep it print-poster
- No people in business attire
- No corporate logo lockups
- Avoid heroic-figure compositions involving real political figures

## Output

WebP, 1600×900 minimum (the page crops to 21:9 for the collapsed feed
view and shows natural aspect when expanded). Background should extend
to bleed even if the page composition is centered.
