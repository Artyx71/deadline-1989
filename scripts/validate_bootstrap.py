#!/usr/bin/env python3
"""Validate project instructions and configuration without application dependencies."""

import json
from pathlib import Path
import re
import tomllib
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
AGENTS = {
    "game-engineer", "frontend-engineer", "backend-engineer",
    "pixel-art-director", "narrative-designer", "qa-engineer",
}
SKILLS = {"asset-research", "phaser-gameplay", "pixel-art", "browser-qa"}
RULES = {"architecture", "gameplay", "frontend", "backend", "art-direction", "testing"}
DOCS = {"GDD", "ARCHITECTURE", "ART_BIBLE", "ASSET_CREDITS", "TASKS", "DECISIONS", "BOOTSTRAP"}


def check(condition, message):
    if not condition:
        raise SystemExit("FAIL: " + message)


def main():
    instruction = ROOT / "AGENTS.md"
    check(instruction.is_file(), "root AGENTS.md missing")
    check(0 < instruction.stat().st_size < 32768, "AGENTS.md exceeds default discovery budget")
    check(not (ROOT / "AGENTS.override.md").exists(), "root override needs manual review")
    for directory in ["apps/web", "apps/server", "packages/shared"]:
        check((ROOT / directory).is_dir(), f"missing {directory}")
    for name in RULES:
        p = ROOT / f".agents/rules/{name}.md"
        check(p.is_file() and p.stat().st_size > 0, f"missing rule {name}")
    for name in DOCS:
        check((ROOT / f"docs/{name}.md").is_file(), f"missing document {name}")

    tomls = list((ROOT / ".codex").rglob("*.toml"))
    check(len(tomls) == 7, "expected project config and six agent TOMLs")
    for path in tomls:
        with path.open("rb") as stream:
            tomllib.load(stream)
    config = tomllib.loads((ROOT / ".codex/config.toml").read_text())
    check(set(config) == {"model", "model_reasoning_effort", "agents"}, "unexpected project config keys")
    check(config["model"] == "gpt-6.1-sol", "unexpected model")
    check(config["model_reasoning_effort"] == "high", "expected high reasoning")
    check(config["agents"] == {"enabled": True, "max_concurrent_threads_per_session": 4}, "unexpected agent settings")
    names = []
    fields = {"name", "description", "model", "model_reasoning_effort", "developer_instructions"}
    for path in sorted((ROOT / ".codex/agents").glob("*.toml")):
        role = tomllib.loads(path.read_text())
        check(set(role) == fields, f"unexpected agent fields: {path.name}")
        check(role["name"] == path.stem, f"agent filename/name mismatch: {path}")
        check(role["description"].strip() and role["developer_instructions"].strip(), f"empty agent: {path}")
        check(role["model"] == config["model"] and role["model_reasoning_effort"] == "high", f"model/effort mismatch: {path}")
        for heading in ["Summary", "Files", "Verification", "Risks", "Dependencies", "Status"]:
            check(heading in role["developer_instructions"], f"report section {heading} missing: {path}")
        names.append(role["name"])
    check(len(names) == len(set(names)) == 6 and set(names) == AGENTS, "agent names differ or collide")

    skill_paths = list((ROOT / ".agents/skills").glob("*/SKILL.md"))
    check({p.parent.name for p in skill_paths} == SKILLS, "skill names differ")
    for path in skill_paths:
        text = path.read_text()
        match = re.match(r"\A---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n\n(.+)", text, re.S)
        check(match is not None, f"invalid skill metadata: {path}")
        name, description, body = match.groups()
        # These files deliberately use JSON quoted strings, a valid YAML subset.
        description = json.loads(description)
        check(name == path.parent.name and len(name) < 64, f"invalid skill name: {path}")
        check(isinstance(description, str) and 0 < len(description) <= 1024, f"invalid skill description: {path}")
        check(body.strip(), f"empty skill body: {path}")

    markdown = [instruction, *ROOT.glob("docs/*.md"), *ROOT.glob(".agents/**/*.md")]
    for path in markdown:
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", path.read_text()):
            target = target.strip().strip("<>")
            if urlsplit(target).scheme or target.startswith("#"):
                continue
            local = unquote(target.split("#", 1)[0])
            if local:
                check((path.parent / local).exists(), f"broken local link: {path.relative_to(ROOT)} -> {target}")
    instructions = instruction.read_text()
    for path in [*ROOT.glob(".agents/rules/*.md"), *skill_paths]:
        check(str(path.relative_to(ROOT)) in instructions, f"AGENTS.md omits {path}")
    print("PASS: seven TOMLs; six unique agent definitions; four skill metadata records.")
    print("PASS: AGENTS.md size/discovery location, rule references, document links, workspace directories.")
    print("Runtime agent discovery, configuration semantics, browser launch, and application behavior require separate evidence; see docs/BOOTSTRAP.md.")


if __name__ == "__main__":
    main()
