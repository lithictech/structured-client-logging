install:
	yarn install

build:
	@rm -r umd 2> /dev/null || true
	@mkdir umd
	@cat index.js | node tools/umdify.js > umd/client-logger.js
	@cat umd/client-logger.js | node tools/minify.js > umd/client-logger.min.js

fmt:
	yarn run fmt
