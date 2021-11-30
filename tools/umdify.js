var fs = require("fs");
var umdify = require("libumd");

var input = fs.readFileSync(process.stdin.fd, "utf-8");
var result = umdify(input, {
  objectToExport: "_exports",
  globalAlias: "structuredClientLogging",
});
process.stdout.write(result);
