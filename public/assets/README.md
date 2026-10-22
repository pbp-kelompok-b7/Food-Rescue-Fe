# Food Rescue UI assets

- `figma/`: original SVG exports from Food Rescue file `IHKy4C88HVCrLH0B3wCbsU`, Components page. Filenames prefix the catalog node ID (`9-269`, `11-398`, `18-462`, `18-585`, `18-719`). SVG root dimensions are preserved. `src/components/ui/Icon.jsx` maps semantic names to these files.
- `fonts/Nunito.ttf`: Nunito variable font from the Google Fonts repository, `ofl/nunito/Nunito[wght].ttf`.
- `fonts/Unbounded.ttf`: Unbounded variable font from the Google Fonts repository, `ofl/unbounded/Unbounded[wght].ttf`.
- Each font's SIL Open Font License is included beside it. Both fonts are served locally through `src/styles/components.css`.

No temporary Figma asset URL is used at runtime. Resource photos are supplied separately through component props.
