start: build
  pnpm start

build:
  pnpm build

watch:
  watchexec -c -r -w src -e js just start
