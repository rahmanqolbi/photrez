# 20 - GitHub Actions Template (Milestone 1)

Template ini khusus untuk milestone `M1 Foundation` sesuai:

- `docs/17-test-matrix-by-milestone.md`
- `docs/18-ci-verification-plan.md`

## 1) Tujuan

- Memberi file CI siap tempel untuk M1.
- Menjalankan stage wajib M1:
1. `preflight`
2. `build_and_static_checks`
3. `test_contract`
4. `test_render_smoke`

## 2) Cara Pakai

1. Buat file: `.github/workflows/ci-m1.yml`
2. Copy YAML di bawah.
3. Ganti semua command placeholder (`echo ...`) dengan command asli repo.
4. Commit dan jalankan lewat pull request.

## 3) Template YAML (Ready To Paste)

```yaml
name: ci-m1-foundation

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-m1-${{ github.ref }}
  cancel-in-progress: true

jobs:
  preflight:
    name: Preflight
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Toolchain versions
        run: |
          rustc --version
          cargo --version
          node --version

      - name: Workspace and lockfile checks
        run: |
          # Replace with real checks if needed
          test -f Cargo.toml || echo "warning: Cargo.toml not found yet"
          test -f package.json || echo "warning: package.json not found yet"

  build_and_static_checks:
    name: Build and Static Checks
    runs-on: ubuntu-latest
    needs: preflight
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build and static checks
        run: |
          # TODO replace placeholders with real commands
          echo "cargo check --workspace"
          echo "pnpm type-check"
          echo "pnpm lint"

  test_contract:
    name: Contract Tests
    runs-on: ubuntu-latest
    needs: build_and_static_checks
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Contract tests
        run: |
          # TODO replace placeholders with real commands
          echo "cargo test --package <contract-test-crate>"

  test_render_smoke:
    name: Renderer Smoke Tests
    runs-on: ubuntu-latest
    needs: build_and_static_checks
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Renderer smoke tests
        run: |
          # TODO replace placeholders with real commands
          echo "cargo test --package <render-crate> <smoke-test-filter>"
```

## 4) Wajib Diganti Sebelum Dipakai

- `echo "cargo check --workspace"`
- `echo "pnpm type-check"`
- `echo "pnpm lint"`
- `echo "cargo test --package <contract-test-crate>"`
- `echo "cargo test --package <render-crate> <smoke-test-filter>"`

Jika belum diganti, CI hanya simulasi dan belum valid sebagai gate.

## 5) Expected Output per PR

Saat sudah aktif, setiap PR minimal menampilkan:

1. Status pass/fail tiap job.
2. Error log yang deterministik untuk job gagal.
3. Evidence bahwa stage wajib M1 berjalan.
