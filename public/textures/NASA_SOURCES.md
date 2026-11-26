# NASA & Public Scientific Texture Sources

Mission Alpha 3.0 packages public scientific imagery for offline use.

## Earth
- **Day map**: NASA Visible Earth — Blue Marble (land, shallow water, topo/bathy)
  - `eoimages.gsfc.nasa.gov` Blue Marble products
- **Night lights**: NASA Black Marble 2016
- **Clouds**: Solar System Scope 2k clouds (CC-BY 4.0, NASA-derived MODIS lineage)
- **Normal / specular**: three.js examples planet pack (NASA Blue Marble derived)

## Moon
- Lunar Reconnaissance Orbiter lineage map via three.js public textures

## Mars
- MRO / science composite via Solar System Scope (CC-BY 4.0)

## Mercury
- MESSENGER mission composite via Solar System Scope (CC-BY 4.0)

## Venus
- Magellan radar / atmosphere composite via Solar System Scope (CC-BY 4.0)

## Jupiter
- Juno / science composite via Solar System Scope (CC-BY 4.0)

## Saturn + rings
- Cassini composite via Solar System Scope (CC-BY 4.0)

## Uranus / Neptune
- Voyager / NASA composites via Solar System Scope (CC-BY 4.0)

## Pluto
- NASA New Horizons global color mosaic ("Pluto global color map", nasa.gov, public domain; via Wikimedia Commons `Pluto_color_mapmosaic.jpg`), resized to 2048x1024.
  New Horizons did not image Pluto's far-south region; that unmapped band is filled with a smooth, procedurally blended extrapolation of the neighbouring terrain colours.

## Sun
- SDO / science solar map via Solar System Scope (CC-BY 4.0)

## Milky Way
- Scientific starfield panorama via Solar System Scope (CC-BY 4.0)

## License notes
- NASA material is generally not copyrighted (public domain) unless noted.
- Solar System Scope textures: Creative Commons Attribution 4.0.
- Credit NASA / Solar System Scope in derivative works as required.

## Mobile set (`public/textures/mobile/`)
- Downscaled copies (max 1024x512, JPEG q80; ring PNG keeps alpha) of the maps above, used only on phones/tablets.
- Regenerate with Pillow if a source map changes.
