# GitHub repository operations

This directory contains automation and GitHub-specific repository configuration.

## CI/CD

`workflows/ci.yml` runs on pushes and pull requests targeting `main`. It checks required scaffold files, Markdown headings, and trailing whitespace on Ubuntu and Windows runners. Add platform build, test, signing, and release jobs here when executable projects are introduced.

## Issue and pull request hygiene

Use issues to capture reproducible defects, source-provider requests, exporter mappings, and platform work. Pull requests should describe affected modules, data-contract changes, and validation performed. Add issue and pull-request templates in this directory when the project needs standardized intake forms.

## Local quality check

The CI checks are intentionally dependency-free while this repository is a scaffold. Before opening a pull request, ensure required README files exist, use level-one headings, and avoid trailing whitespace.
