# AGENTS.md

## Project stack

This project uses:
- React / React Native / Next.js
- TypeScript where possible
- AWS Amplify for backend
- GitHub for source control

## Development rules

- Before editing backend code, inspect the `amplify/` directory.
- Do not modify production AWS resources unless I explicitly approve it.
- Do not edit `.env`, AWS credentials, secrets, API keys, or deployment tokens.
- Prefer small, focused changes.
- Explain the files you plan to modify before making large changes.
- After code changes, run the correct checks from `package.json`, such as:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
- For Next.js, preserve server/client component boundaries.
- For React Native, do not add native dependencies unless I approve.
- For Amplify, follow current Amplify Gen 2 patterns when working in `amplify/`.

## Pull request rules

- Use clear commit messages.
- Include what changed, why it changed, and how it was tested.
- Do not open a PR until lint/typecheck/tests are passing or explain why they cannot run.\