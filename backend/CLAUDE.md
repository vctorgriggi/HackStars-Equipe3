# Project instructions

NestJS boilerplate using relational persistence (TypeORM/PostgreSQL). The document (Mongoose/MongoDB) variant was removed from this repo — only the `*:relational` generators exist.

## When adding entities, schemas, or properties

Use the `generate` skill (auto-loaded from [.claude/skills/generate/SKILL.md](.claude/skills/generate/SKILL.md)). It documents the project's CLI generators (`npm run generate:resource:*`, `npm run add:property:to-*`) which keep both database variants, DTOs, modules, and migrations in sync. Do not hand-write entity files.
