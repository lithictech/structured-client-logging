install:
	npm install terser -g

build:
	@rm -r umd 2> /dev/null || true
	@mkdir umd
	@cp index.js umd/client-logger.js
	@terser index.js -c --ecma=5 --output=umd/client-logger.min.js
