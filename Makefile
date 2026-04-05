.PHONY: install css css-watch dev build start test test-unit test-integration test-e2e clean

install:
	bun install

css:
	bunx @tailwindcss/cli -i src/styles/input.css -o public/styles.css --minify

css-watch:
	bunx @tailwindcss/cli -i src/styles/input.css -o public/styles.css --watch

dev:
	$(MAKE) css-watch & DEV_MODE=true bun --watch src/index.tsx

build: css

start: build
	bun src/index.tsx

test:
	bun test tests/unit/ tests/integration/

test-unit:
	bun test tests/unit/

test-integration:
	bun test tests/integration/

test-e2e:
	bunx playwright test

clean:
	rm -f public/styles.css
	rm -f data/*.db
	rm -f /tmp/pm-e2e-*.db
