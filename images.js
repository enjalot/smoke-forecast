// download the images for the run
if (typeof fetch !== 'function') {
    global.fetch = require('node-fetch');
}
let request = require('request');
let fs = require("fs")
let d3 = require("d3");
let asynch = require("async")
const { exec } = require('child_process');

// how many we will attempt at once

let ts = process.argv[2]
let dir = "images-" + ts
console.log("dir", dir)

let run = JSON.parse(fs.readFileSync(`data/latest_run-${ts}.json`).toString())
let overlay = run["overlays"]["100m"]["hourly"]["GrayColorBar"]
let imgs = overlay["images"]

try {
  fs.mkdirSync(dir)
} catch(e) {}

asynch.eachLimit(imgs, 20, (image, cb) => {
  let i = imgs.indexOf(image)
  // try to avoid rate limiting
  let filename = dir + "/" + image
  let url = overlay.root_url + "/" + image
  console.log("url", url)

  request.head(url, function(err, res, body){
    if(err) console.log(err)
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);
    console.log("writing", image.name, i)
    request(url).pipe(fs.createWriteStream(filename)).on('close', cb);
  })
}, (err) => {
 console.log("DONE", err) 
 let imgcountcmd = `ls -lah ${dir}/*.png | wc -l`
  exec(imgcountcmd, (error, stdout, stderr) => {
    console.log(imgcountcmd, stdout)
  })

  console.log("run the next command:", "node process.js " + ts)
  
})



