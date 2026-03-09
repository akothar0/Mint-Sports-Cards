# Contributing

## Development
1. `npm install`
2. `cp .env.example .env`
3. `npm run dev`

## Before opening a PR
1. Keep changes scoped and focused.
2. Run `npm run lint` and ensure it passes.
3. Update docs when behavior, commands, or env vars change.
4. Avoid committing secrets or local-only files.

## Code style
- Follow existing React + hooks patterns in `src/`.
- Prefer small, composable components and utility functions.
- Keep naming descriptive and avoid dead code.

## Asset and legal checks
- Do not add logos/images you do not have redistribution rights for.
- If adding third-party assets, include attribution and license terms in the PR description.
