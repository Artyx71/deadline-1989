# Bootstrap validation and environment

Inspection date: 2026-11-11. Scope: instructions, six specialized agents, four reusable skills, rules, planning documents, and infrastructure validation only. No application code, dependencies, assets, or game scenes were created.

## Structure

```text
Project:Deadline/
├── AGENTS.md
├── .codex/
│   ├── config.toml
│   └── agents/
│       ├── game-engineer.toml
│       ├── frontend-engineer.toml
│       ├── backend-engineer.toml
│       ├── pixel-art-director.toml
│       ├── narrative-designer.toml
│       └── qa-engineer.toml
├── .agents/
│   ├── rules/ {architecture,gameplay,frontend,backend,art-direction,testing}.md
│   └── skills/ {asset-research,phaser-gameplay,pixel-art,browser-qa}/SKILL.md
├── docs/
│   ├── GDD.md
│   ├── ARCHITECTURE.md
│   ├── ART_BIBLE.md
│   ├── ASSET_CREDITS.md
│   ├── TASKS.md
│   ├── DECISIONS.md
│   └── BOOTSTRAP.md
├── scripts/validate_bootstrap.py
├── apps/web/                 (empty)
├── apps/server/              (empty)
└── packages/shared/          (empty)
```

The existing workspace is the project root. Git is not initialized: the protected `.git` directory was empty. Empty application directories exist on disk; a later Git setup must preserve them as needed. pnpm manifests, lockfile, runtime pins, and dependency installation await the implementation goal.

## Verified capabilities

| Capability                 | Evidence and result                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installed Codex            | `codex --version`: `codex-cli 0.163.0`; reviewed CLI help and existing user configuration before writing project files                                                                            |
| Requested model            | Existing user config, bundled catalog (`codex debug models --bundled`), and cached catalog all identify `gpt-6.1-sol`; configured that exact identifier                                           |
| Reasoning                  | Local Sol catalog advertises `low`, `medium`, `high`, `xhigh`, `max`, `ultra`; project and all six roles select `high`                                                                            |
| Other visible local models | `gpt-6-astra`, `gpt-6.1-terra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, alongside Sol; availability is a catalog observation, not a new inference test                         |
| Multi-agent tools          | Current session exposes spawn, message, follow-up, interrupt, list, and wait; independent documentation workers and a read-only reviewer completed structured reports                             |
| Concurrency                | Project sets `agents.max_concurrent_threads_per_session = 4`, excluding the primary; host limits still apply. Current host allows four total agents, so at most three children can be active here |
| Instructions and skills    | Fresh `codex debug prompt-input` output contains root AGENTS.md and all four local skills in the skills instruction block; this renders prompt input without a model turn                         |
| TOML and skill metadata    | Seven TOMLs parsed with Python `tomllib`; six names are unique. Four skills passed the installed skill-creator `quick_validate.py` validator                                                      |
| Browser tooling            | Node `v26.7.0`, Playwright CLI `1.65.0`, and `/usr/bin/chromium` are installed; no dedicated browser automation MCP tool is exposed in this session                                               |
| Image generation           | Built-in `image_gen.imagegen` tool and the imagegen skill are available. Neither was invoked; no assets were generated or downloaded                                                              |
| Package manager            | pnpm was not found. No installation was attempted                                                                                                                                                 |

Project-local skills are `asset-research`, `phaser-gameplay`, `pixel-art`, and `browser-qa`. The session also exposes the installed OpenAI Docs, skill-creator, imagegen, desktop/system, and connected-app skill catalog. Availability of a connected skill does not imply it is required for this repository.

## Configuration conventions and limitations

The [official subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) specifies standalone project TOMLs under `.codex/agents/` with `name`, `description`, and `developer_instructions`, plus optional model/effort. That convention is used for all six roles. The [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) documents `agents.enabled` and `agents.max_concurrent_threads_per_session`; no invented role/ownership configuration keys are used. Ownership and reporting are instructions, not enforced filesystem boundaries.

The [skill documentation](https://learn.chatgpt.com/docs/build-skills) specifies repository skills in `.agents/skills/` with YAML `name` and `description`. The [AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md) describes root instruction discovery. Rule Markdown is explicitly referenced by AGENTS.md; it is not claimed to be automatically loaded.

Static agent files and configuration were validated against these documented conventions. **Automatic standalone agent discovery and spawning by role name were not verified by a fresh model session.** The installed prompt renderer confirms instructions/skills but does not list custom agents. Documentation workers used the current session's generic delegation tools, which do not prove these role files were applied. If the next session does not expose a role, inspect its loader diagnostics before proceeding; do not invent fallback settings or silently claim it loaded.

`--strict-config` exists in CLI help but is rejected for `codex debug`; that attempted combination was not counted as a validation pass. App-server protocol schema generation succeeded but does not validate project agent semantics. No unsupported keys were knowingly added; native strict semantic validation remains unverified.

Browser launch was not exercised. The default Playwright browser cache directory is absent; use a supported installed-browser configuration or provision browsers during authorized implementation. Installed tools/feature flags are not evidence of working browser control. No application exists to run, so application browser QA, gameplay, API tests, and persistence tests are NOT RUN. Image generation availability likewise does not establish sprite quality or licenses.

Protected `.codex` and `.agents` required filesystem escalation to install the staged files. Existing files were reviewed; those project directories were empty and installation used no-clobber copying. User-level configuration and permission policies were preserved. Codex prompt inspection also required escalation for its runtime writes. No dependencies were installed.

## Repeatable checks and review

Run from the project root:

```sh
python3 scripts/validate_bootstrap.py
```

This checks TOML syntax, expected keys, unique role names, role model/effort, required report fields, skill metadata, root instructions, referenced documents, local Markdown file links, and workspace directories using only Python 3.11+ standard library. It does not claim CLI semantic validation or runtime verification.

Independent read-only review found no high/medium defects. Its one minor finding, inconsistent training-ammunition decision status, was resolved in GDD and ADR-009. Resource latency/reservation design, deployment/identity, exact art dimensions, asset rights, and mission refresh recovery remain explicit future design decisions rather than bootstrap blockers.

Infrastructure is prepared for the master implementation goal, subject to the disclosed runtime role-discovery limitation. Start the next session at this root and verify role availability before specialized delegation. Implementation remains on hold until the user supplies that goal.
