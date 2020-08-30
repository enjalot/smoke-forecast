if (typeof fetch !== 'function') {
  global.fetch = require('node-fetch');
}
let d3 = require("d3")
let fs = require("fs")

let tf = d3.timeFormat("%Y-%m-%d-%H")
// year, month, day, hour timestamp
let ts = tf(new Date())

let dir = "data"
try {
  fs.mkdirSync(dir)
} catch(e) {}

async function main() {
  let data = await d3.json("https://tools.airfire.org/websky/v2/api/runs/standard/CANSAC-1.33km/")
  // console.log("bluesky", data)
  let outfile = "data/metadata-" + ts + ".json"
  fs.writeFileSync(outfile, JSON.stringify(data))
  console.log("wrote", outfile)
  console.log("timestamp", ts)
  console.log("run the next command:", "node runs.js " + ts)
}
main()