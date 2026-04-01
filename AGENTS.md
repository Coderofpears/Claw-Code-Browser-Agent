# AGENTS.md — Claw Code

## Project Overview

This repository contains two parallel implementations:
- **Python porting workspace** (`src/`, `tests/`) — Python modules mirroring Claw Code's harness architecture
- **Rust port** (`rust/`) — systems-language port with a CLI binary (`claw`)

## Build / Lint / Test Commands

### Python (run from repo root)

```bash
# Run all tests
python3 -m unittest discover -s tests -v

# Run a single test
python3 -m unittest tests.test_porting_workspace.PortingWorkspaceTests.test_manifest_counts_python_files -v

# Run the CLI entrypoint
python3 -m src.main summary
python3 -m src.main manifest
python3 -m src.main parity-audit
python3 -m src.main commands --limit 10
python3 -m src.main tools --limit 10
python3 -m src.main route "review MCP tool" --limit 5
python3 -m src.main bootstrap "review MCP tool" --limit 5
```

### Rust (run from `rust/` directory)

```bash
cd rust

# Build
cargo build
cargo build --release

# Lint (must be clean)
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings

# Type-check
cargo check --workspace

# Run all tests
cargo test --workspace

# Run a single test
cargo test -p <crate-name> <test_name>
# Example: cargo test -p runtime test_session_bootstrap
```

## Code Style — Python

- **Imports**: Use `from __future__ import annotations` at the top of every file. Prefer explicit relative imports (`.module`) within `src/`. Group imports: stdlib, third-party, local.
- **Types**: Use type hints on all function signatures and class attributes. Prefer `list[T]`, `dict[K, V]` syntax over `List[T]`. Use `| None` for optional types.
- **Dataclasses**: Prefer `@dataclass(frozen=True)` for immutable value objects (see `src/models.py`).
- **Naming**: `PascalCase` for classes, `snake_case` for functions/variables/modules, `UPPER_SNAKE_CASE` for module-level constants.
- **Formatting**: 4-space indentation. Line length follows standard Python conventions (79-100 chars).
- **Error handling**: Use `parser.error()` for CLI argument errors. Return `int` exit codes from `main()`. Use `check=True` on `subprocess.run`.
- **Docstrings**: Use single-line `"""..."""` docstrings for modules and public functions.

## Code Style — Rust

- **Edition**: Rust 2021. Resolver 2.
- **Formatting**: Run `cargo fmt --all`. Follow existing patterns in the touched crate.
- **Clippy**: Must be clean with `-D warnings`. Workspace lints forbid `unsafe_code`. `pedantic` is warn-level. `module_name_repetitions`, `missing_panics_doc`, `missing_errors_doc` are allowed.
- **Naming**: `snake_case` for functions/variables, `PascalCase` for types, `SCREAMING_SNAKE_CASE` for constants.
- **Error handling**: Use `Result<T, E>` with `?` operator. Prefer `anyhow` for application-level errors. No `unwrap()` in production paths.
- **Dependencies**: Use workspace-level dependency versions in `rust/Cargo.toml`. Reference sibling crates with `path = "../crate-name"`.
- **Imports**: Group standard library, external crates, then local crate imports. Use `use crate::` for intra-crate paths.

## Repository Structure

```
.
├── src/            # Python porting workspace (66 entries)
├── tests/          # Python verification (unittest)
├── rust/           # Rust workspace
│   ├── crates/     # api, runtime, tools, commands, plugins, claw-cli, server, lsp, compat-harness
│   └── Cargo.toml  # Workspace root
├── CLAW.md         # Claw Code repo guidance
└── README.md       # Project overview
```

## Working Agreements

- Keep `src/` and `tests/` aligned — update both when behavior changes.
- Prefer small, reviewable PRs scoped to one clear change.
- Do not overwrite `CLAW.md` automatically; update intentionally when workflows change.
- Run full verification before committing: Python tests + Rust fmt/clippy/test.
