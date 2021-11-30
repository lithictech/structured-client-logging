install:
	yarn install

build:
	@rm -r dist 2> /dev/null || true
	@mkdir dist
	@cat index.js | node tools/umdify.js > dist/structured-client-logging.js
	@cat dist/structured-client-logging.js | node tools/minify.js > dist/structured-client-logging.min.js

fmt:
	yarn run fmt
