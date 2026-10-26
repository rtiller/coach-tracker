/* Tiny static server for tests. Serves ../index.html only and records every request line and body. */
const http = require("http"), fs = require("fs"), path = require("path");
module.exports = function start() {
  const log = [];
  const srv = http.createServer((req, res) => {
    let body = ""; req.on("data", d => body += d); req.on("end", () => {
      log.push({ method: req.method, url: req.url, body, headers: req.headers });
      const u = req.url.split("?")[0];
      if (u === "/" || u === "/index.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(fs.readFileSync(path.join(__dirname, "..", "index.html"))); }
      else { res.writeHead(404); res.end(); }
    });
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ url: "http://127.0.0.1:" + srv.address().port + "/", log, close: () => srv.close() })));
};
