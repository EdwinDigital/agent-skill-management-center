# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| 1.0.x | Yes |
| Earlier or unreleased builds | No |

Security fixes target the latest released patch version. This policy may expand when additional release lines exist.

## Reporting a Vulnerability

Do **not** open a public issue for a suspected vulnerability or include secrets, private Skill contents, OAuth tokens, local paths, or exploit details in public discussions.

Use [GitHub private vulnerability reporting](https://github.com/EdwinDigital/agent-skill-management-center/security/advisories/new) to submit:

- A concise description and impact.
- Affected version and operating system.
- Reproduction steps or a proof of concept.
- Relevant logs with secrets and personal paths removed.
- Any suggested mitigation.

The maintainer will acknowledge a complete report when practical, investigate it privately, and coordinate remediation and disclosure. Please allow reasonable time for a fix before public disclosure.

If GitHub private vulnerability reporting is unavailable for the repository's current visibility or settings, use a private contact method listed on the [EdwinDigital GitHub profile](https://github.com/EdwinDigital). Do not move vulnerability details into a public issue as a fallback.

## Security Boundaries

- The sidecar binds to localhost and desktop API calls require a per-launch token.
- Agent SMC reads configured Skill roots and samples local files for requested analysis.
- Requested AI evaluation and translation send Skill context to GitHub Copilot SDK.
- Desktop OAuth tokens and analysis data are stored locally; protect the operating-system user account and application data directory.
- macOS v1.0.0 is ad-hoc signed but not notarized; Windows v1.0.0 installers are unsigned. Verify Release checksums before installation.

Reports about unsupported third-party Skills, GitHub Copilot availability, or operating-system warnings without a vulnerability should use [SUPPORT.md](SUPPORT.md).
