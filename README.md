# slopsquash

An MCP server that stops AI agents from installing slopsquatted packages.

## The problem

LLMs hallucinate package names, and attackers publish malware under those exact names betting your agent will install it without a human checking first. Axios, chalk/debug, TanStack, Bitwarden CLI, all compromised in the last year. When an agent installs packages directly, there's no one left to catch a name that just sounds real.

## What it does

slopsquash runs as an MCP server your agent calls before every install. It checks whether the package actually exists, how long it's been published, and whether it matches known slopsquat patterns, then blocks or warns before the install happens.

## Why this and not Aikido/PMG/Socket

Those tools guard against known-malicious packages and enforce install age. slopsquash guards the step before that: catching hallucinated names an agent invents on its own.

## Setup

TODO.

## Status

Early and actively built. Feedback, issues, and PRs welcome.

## License

GPL-3.0
