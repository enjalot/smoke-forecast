// this will take each image, pull the air quality data out of its pixels
// we save the resulting array as a csv
if (typeof fetch !== 'function') {
  global.fetch = require('node-fetch');
}
let fs = require("fs");
let d3 = require("d3");
let asynch = require("async")
// let topojson = require("topojson-client");
// let us = require("./node_modules/us-atlas/counties-10m.json");
let image = require('get-image-data');

// let stateShapes = topojson.feature(us, us.objects.states)//.features
// let statesByName = new Map(stateShapes.features.map(d => [d.properties.name, d]))
// let california = statesByName.get("California")


let ts = process.argv[2]
let dir = "images-" + ts
console.log("dir", dir)
  
let run = JSON.parse(fs.readFileSync(`data/latest_run-${ts}.json`).toString())
let overlay = run["overlays"]["100m"]["hourly"]["GrayColorBar"]
let imgs = overlay["images"]
try {
  fs.mkdirSync(dir)
} catch(e) {}

asynch.eachLimit(imgs, 20, (img, cb) => {
  let fn = dir + "/" + img 
  image(fn, function (err, info) {
    if(err) return cb(err)
    var data = info.data
    var h = info.height
    var w = info.width
    // let mercator = d3.geoMercator()
    //   .fitSize([w, h], california)

    let pixels = []
    let i = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // x + y*width is the position for point (x, y) in a flat array of pixel data
        // multiply by 4 for imageData position as each pixel is 4 (rgba) values
        i = (x+y*w)*4
        // we only need one channel, since R,G and B should all be the same value at each pixel
        if(data[i+3]) { // we check the alpha channel, since that will be 0 if no smoke
          // lnglat = mercator.invert([x, y])
          pixels.push({x, y, v:data[i]}) //, lng: lnglat[0], lat: lnglat[1]})
        }
      }
    }
    let csv = d3.csvFormat(pixels)
    fs.writeFileSync(dir + "/" + img.replace(".png", ".csv"), csv)
    cb()
  })
}, (err) => {
  console.log("DONE", err)
  console.log("run the next command:", "node hexbin.js " + ts)
})