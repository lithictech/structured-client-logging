var fs = require("fs");
var minify = require("terser").minify;

var input = fs.readFileSync(process.stdin.fd, "utf-8");
minify(input, { ecma: 5 }).then(function (result) {
  process.stdout.write(result.code);
});
