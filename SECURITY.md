# Security Policy

## Supported Versions
This project currently supports the latest `main` branch only.

## Reporting a Vulnerability
- Please do not open public issues for security vulnerabilities.
- Report vulnerabilities privately to the maintainer before disclosure.
- Include reproduction steps, affected files/routes, and impact.

## Secret handling
- Never commit real secrets to this repository.
- Use `.env.example` for public templates.
- Use `.env.server` and CI/Vercel secret stores for private keys/tokens.
