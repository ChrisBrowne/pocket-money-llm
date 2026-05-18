.PHONY: install fonts css css-watch dev build start test test-unit test-integration test-e2e lint format clean db-reset deploy provision install-systemd-unit install-sudoers install-cron

install:
	bun install

# Fonts are self-hosted from the @fontsource* npm packages (see ADR-0038).
# `make fonts` copies the woff2 files referenced by input.css into public/fonts/
# so they're served by the static plugin at /fonts/*.woff2.
FONT_FILES = \
	public/fonts/monoton-latin-400-normal.woff2 \
	public/fonts/major-mono-display-latin-400-normal.woff2 \
	public/fonts/outfit-latin-wght-normal.woff2 \
	public/fonts/outfit-latin-ext-wght-normal.woff2 \
	public/fonts/jetbrains-mono-latin-wght-normal.woff2 \
	public/fonts/jetbrains-mono-latin-ext-wght-normal.woff2

fonts: $(FONT_FILES)

public/fonts:
	mkdir -p public/fonts

public/fonts/monoton-%.woff2: node_modules/@fontsource/monoton/files/monoton-%.woff2 | public/fonts
	cp $< $@
public/fonts/major-mono-display-%.woff2: node_modules/@fontsource/major-mono-display/files/major-mono-display-%.woff2 | public/fonts
	cp $< $@
public/fonts/outfit-%.woff2: node_modules/@fontsource-variable/outfit/files/outfit-%.woff2 | public/fonts
	cp $< $@
public/fonts/jetbrains-mono-%.woff2: node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-%.woff2 | public/fonts
	cp $< $@

css: fonts
	bunx @tailwindcss/cli -i src/styles/input.css -o public/styles.css --minify

css-watch: fonts
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
	bunx prettier --check .

format:
	bunx prettier --write .

clean:
	rm -f public/styles.css
	rm -rf public/fonts
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

provision: install-systemd-unit install-sudoers install-cron
	@echo "Provisioning complete. Start the service with: systemctl start pocket-money"

install-systemd-unit:
	@[ "$$(id -u)" = "0" ] || { echo "install-systemd-unit must be run as root (try: sudo make install-systemd-unit)"; exit 1; }
	install -m 644 scripts/pocket-money.service /etc/systemd/system/pocket-money.service
	systemctl daemon-reload
	systemctl enable pocket-money
	@echo "Installed /etc/systemd/system/pocket-money.service and enabled (not started)"

install-sudoers:
	@[ "$$(id -u)" = "0" ] || { echo "install-sudoers must be run as root (try: sudo make install-sudoers)"; exit 1; }
	install -m 440 scripts/deploy.sudoers /etc/sudoers.d/pocket-money-deploy
	visudo -c
	@echo "Installed /etc/sudoers.d/pocket-money-deploy"

install-cron:
	@[ "$$(id -u)" = "0" ] || { echo "install-cron must be run as root (try: sudo make install-cron)"; exit 1; }
	install -m 644 scripts/backup.cron /etc/cron.d/pocket-money-backup
	@echo "Installed /etc/cron.d/pocket-money-backup (cron picks it up within a minute)"
