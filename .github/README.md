# GitHub repository operations

This directory contains automation and GitHub-specific repository configuration.

## CI/CD

`workflows/core-check.yml` and `workflows/web-check.yml` run independently on every
pull request and when started manually. The core workflow runs the backend test suite,
while the web workflow verifies the web entry point and runs the UI tests. Both checks
run on Windows. Add platform build, signing, and release jobs as those projects are
introduced.

## Issue and pull request hygiene

Use issues to capture reproducible defects, source-provider requests, exporter mappings, and platform work. Pull requests should describe affected modules, data-contract changes, and validation performed. Add issue and pull-request templates in this directory when the project needs standardized intake forms.

## Local quality check

The CI checks are dependency-free. Before opening a pull request, run
`node --test "core/**/*.test.mjs"` and `node --test ui_web/app.test.mjs`, and ensure
the web entry point remains available.
