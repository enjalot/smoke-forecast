// this will take each image, pull the air quality data out of its pixels
// we save the resulting array as a csv
if (typeof fetch !== 'function') {
  global.fetch = require('node-fetch');
}
let fs = require("fs");
let d3 = require("d3");
let d3h = require("d3-hexbin");
let topojson = require("topojson-client");
let us = require("./node_modules/us-atlas/counties-10m.json");

let asynch = require("async")
let image = require('get-image-data');

let stateShapes = topojson.feature(us, us.objects.states)//.features
let statesByName = new Map(stateShapes.features.map(d => [d.properties.name, d]))
let california = statesByName.get("California")
let countyShapes = topojson.feature(us, us.objects.counties)//.features
let countyExtent = {
  type: "FeatureCollection", 
    features: countyShapes.features.filter(d => (
      d.properties.name == "Marin" || 
      d.properties.name == "Santa Clara") && d.id.slice(0,2) == "06") 
}

let ts = process.argv[2]
let dir = "images-" + ts
console.log("dir", dir)

let filterWidth = 600
let filterHeight = 400

// save space by not including all data
let hours = 71
  
// converter from grayscale pixels to AQI value
let pmLookup = new Map([
  [201, 12], // the first value is the grayscale color, the second is the PM2.5
  [200, 12], 
  [175, 35],
  [150, 55],
  [125, 150],
  [100, 250],
  [74, 350],
  [75, 350],
  [24, 500],
  [25, 500]
])

let run = JSON.parse(fs.readFileSync(`data/latest_run-${ts}.json`).toString())
let region = run.region
console.log("run", region)
let overlay = run["overlays"]["100m"]["hourly"]["GrayColorBar"]
let imgs = overlay["images"]
try {
  fs.mkdirSync(dir)
} catch(e) {}

image(dir + "/" + imgs[0], function (err, info) {
  var h = info.height
  var w = info.width
  let mercator = d3.geoMercator()
    .fitSize([w, h], california)

  let alb = d3.geoAlbersUsa()
    .fitSize([955, 500], countyExtent)


  let nw = mercator([region.west_lon, region.north_lat])
  let ne = mercator([region.east_lon, region.north_lat])
  let se = mercator([region.east_lon, region.south_lat])
  let sw = mercator([region.west_lon, region.south_lat])
  console.log("NW", nw)

  let sx = (ne[0] - nw[0]) / w
  let sy = (se[1] - ne[1]) / h
  console.log("scale", sx, sy)
  
  // i may need to rescale the coordinates before i invert their projection
  // if this doesn't happen to be the exact extent
  
  let hexbin = d3h.hexbin()
    .extent([[0, 0], [w, h]])
    .radius(1.5)
    .x(d => d.x)
    .y(d => d.y)

  asynch.mapLimit(imgs.slice(0,hours), 20, (img, cb) => {
    console.log("hexbinning", img)
    let i = imgs.indexOf(img)
    let data = d3.csvParse(fs.readFileSync(dir+"/"+img.replace(".png", ".csv")).toString(), d3.autoType)

    // TODO: filter this to smaller bounding box
    // ideally this would be a parameter somehow
    // can imagine generating other regions or even tiles

    let filtered = data.filter(d => {
      let m = mercator.invert([d.x, d.y])
      let p = alb(m)
      if(!p) return false
      return (p[0] > 0 && p[0] < filterWidth && p[1] > 0 && p[1] < filterHeight)
    })
    console.log("FILTERED", filtered.length)

    let binned = hexbin(filtered)
      
    // this looks like an array of arrays, where each inner array is the
    // set of points that fell within the same hex
    console.log("BINNED", binned[0])
    function round(n) {
      let prec = 10000
      return Math.floor(n * prec) / prec
    }

    
    
    let hexdata = binned.map(arr => {
      // we want the median value for all the points
      // we also want the lat lon of the center of the hexagon
      let lnglat = mercator.invert([arr.x*sx + nw[0], arr.y*sy + nw[1]])
      let median = d3.median(arr, d => pmLookup.get(d.v))
      return {
        // x: arr.x,
        // y: arr.y,
        lng: round(lnglat[0]),
        lat: round(lnglat[1]),
        pm1: median,
        i
      }
    })
    console.log("HEXXED", hexdata[0])
    let hexcsv = d3.csvFormat(hexdata)

    fs.writeFileSync(dir + "/" + img.replace(".png", "_hex.csv"), hexcsv)
    // hexdata.forEach(d => d.img = img)
    cb(null, hexdata)
  }, (err, hexes) => {
    console.log("DONE", err, hexes.length)
    let joined = []
    hexes
      .filter(d => !!d)
      .forEach((d,i) => {
        console.log("d",i, d.length)
        joined = joined.concat(d) 
      })
    let csv = d3.csvFormat(joined)
    fs.writeFileSync(`data/hexbin-${ts}.csv`, csv)

    console.log(`zip data/hexbin-${ts}.csv.zip data/hexbin-${ts}.csv`)

  })
})