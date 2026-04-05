.PHONY: install css css-watch dev build start test test-unit test-integration test-e2e lint clean db-reset deploy

install:
	bun install

css:
	bunx @tailwindcss/cli -i src/styles/input.css -o public/styles.css --minify

css-watch:
	bunx @tailwindcss/cli -i src/styles/input.css -o public/styles.css --watch

dev:
	$(MAKE) css-watch & bun --watch src/index.tsx

build: css

start: build
	bun src/index.tsx

test: test-unit test-integration

test-unit:
	bun test tests/unit/

test-integration:
	bun test tests/integration/

test-e2e:
	bunx playwright test

lint:
	bunx tsc --noEmit

clean:
	rm -f public/styles.css
	rm -f data/*.db
	rm -f /tmp/pm-e2e-*.db
	rm -rf test-results/

db-reset:
	rm -f data/*.db data/*.db-wal data/*.db-shm

deploy:
	@echo "Deploy: ssh into the LXC, then:"
	@echo "  cd /opt/pocket-money"
	@echo "  git pull"
	@echo "  bun install"
	@echo "  sudo systemctl restart pocket-money"
