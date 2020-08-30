if (typeof fetch !== 'function') {
  global.fetch = require('node-fetch');
}
let d3 = require("d3")
let fs = require("fs")

let tf = d3.timeFormat("%Y-%m-%d-%H")
let ts = process.argv[2] || tf(new Date())
let dir = "data-" + ts
console.log("dir", dir)

let metadata = JSON.parse(fs.readFileSync(`data/metadata-${ts}.json`).toString())
let urls = metadata.run_urls
console.log(urls.slice(0,5))

async function main() {
// this gives us important metadata about the model and its output
  let url = urls[0]
  let run
  try {
    console.log("trying latest url", url)
    run = await d3.json(`https://tools.airfire.org/websky/v2/api/run/?url=${url}`)
  } catch(e) {
    url = urls[1]
    console.log("trying second url", url)
    run = await d3.json(`https://tools.airfire.org/websky/v2/api/run/?url=${url}`)
  }
  // console.log("run", run)
  let split = url.split("/")
  console.log("split", split)
  // use the model time as the timestamp from now on
  ts = split[split.length - 1]
  let outfile = "data/latest_run-" + ts + ".json"
  fs.writeFileSync(outfile, JSON.stringify(run))
  console.log("wrote", outfile)
  console.log("timestamp", ts)
  console.log("run the next command:", "node images.js " + ts)

}

main()
