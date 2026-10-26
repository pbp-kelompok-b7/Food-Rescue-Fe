# Food Rescue UI assets

- `figma/`: original SVG exports from Food Rescue file `IHKy4C88HVCrLH0B3wCbsU`, Components page. Filenames prefix the catalog node ID (`9-269`, `11-398`, `18-462`, `18-585`, `18-719`). SVG root dimensions are preserved. `src/components/ui/Icon.tsx` maps semantic names to these files.
- `fonts/Nunito.ttf`: Nunito variable font from the Google Fonts repository, `ofl/nunito/Nunito[wght].ttf`.
- `fonts/Unbounded.ttf`: Unbounded variable font from the Google Fonts repository, `ofl/unbounded/Unbounded[wght].ttf`.
- Each font's SIL Open Font License is included beside it. Both fonts are served locally through `src/index.css` and registered as Tailwind's `font-sans` and `font-brand`.
- `fonts/Silkscreen-Regular.ttf`: Silkscreen Regular and its SIL Open Font License from Google Fonts (`ofl/silkscreen`), used for landing captions as `font-caption`.
- `figma/landing-*.svg`: original SVGs downloaded from live landing frames `2:105` and `2:106`. Their root dimensions (22/24/28/32px) are preserved. Existing catalog assets are reused for the example listing cards and mobile resource types.

No temporary Figma asset URL is used at runtime. Resource photos are supplied separately through component props.
