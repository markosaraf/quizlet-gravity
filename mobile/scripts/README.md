The opening mark is generated from `mobile/artwork/brand-q-original-gold-thick-transparent.svg`.

Run `python3 mobile/scripts/generate-transparent-logo.py` to generate native vector paths and the shadow-only SVG. Render that shadow SVG at 1024 × 1024 with Sharp to `mobile/app/src/main/res/drawable-nodpi/logo_gold_3d_shadows.png`. The layer-list combines the transparent shadow with the native vector; neither layer paints a blue rectangle. The 156 dp layout is unchanged.

The launcher PNG uses the Original Gold Thick original raster, resized to 1024 × 1024 and centred at (256, 256) on a 1536 × 1536 #3945FC canvas for the adaptive-icon safe area. Google Play uses the same raster at 512 × 512.
