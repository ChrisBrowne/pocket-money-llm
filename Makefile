.PHONY: install css css-watch dev build start test test-unit test-integration test-e2e lint clean db-reset deploy install-cron

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
	git pull
	bun install
	$(MAKE) build
	sudo systemctl restart pocket-money

install-cron:
	@[ "$$(id -u)" = "0" ] || { echo "install-cron must be run as root (try: sudo make install-cron)"; exit 1; }
	install -m 644 scripts/backup.cron /etc/cron.d/pocket-money-backup
	systemctl reload cron
	@echo "Installed /etc/cron.d/pocket-money-backup and reloaded cron"
