# GitHub repository operations

This directory contains automation and GitHub-specific repository configuration.

## CI/CD

`workflows/web-check.yml` runs on every pull request, on pushes to `main`, and when
started manually. It verifies the web entry point and runs the complete Node.js test
suite on Windows. Add platform build, signing, and release jobs as those projects are
introduced.

## Issue and pull request hygiene

Use issues to capture reproducible defects, source-provider requests, exporter mappings, and platform work. Pull requests should describe affected modules, data-contract changes, and validation performed. Add issue and pull-request templates in this directory when the project needs standardized intake forms.

## Local quality check

The CI checks are dependency-free. Before opening a pull request, run `node --test` and
ensure the web entry point remains available.
