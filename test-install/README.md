# Test Install — Isolated Docker Environment

Tests `npm install -g infinite-realms` in a clean Node 20 container. No PostgreSQL needed — PGlite runs embedded.

## Steps

```bash
# 1. From the project root, build & pack
npm run build
npm pack

# 2. Move tarball into test-install/
mv infinite-realms-*.tgz test-install/

# 3. Build & run
cd test-install
docker build -t ir-test .
docker run -it --rm -p 3000:3000 ir-test

# 4. Open http://localhost:3000
```

## One-liner (after packing)

```bash
docker build -t ir-test test-install && docker run -it --rm -p 3000:3000 ir-test
```

## Cleanup

```bash
docker rmi ir-test
```
