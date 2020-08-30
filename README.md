# smoke forecast

Processing [BlueSky HRRR]() smoke forecast for California.
## metadata.js

## runs.js

## images.js
ffmpeg -framerate 24 -pattern_type glob -i "images-2020082812/*.png" -c:v libx264 -vf scale=iw+1:ih -pix_fmt yuv420p smoke-2020082812.mp4

## process.js

## hexbin.js

