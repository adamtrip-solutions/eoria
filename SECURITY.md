# Security

Report vulnerabilities privately through GitHub's
[security advisories](https://github.com/adamtrip-solutions/eoria/security/advisories/new)
rather than a public issue. Include the package and version, a reproduction, and the impact
you see.

In scope: `@eoria/core`, the `eoria` CLI, the registry JSON served from
`eoria.adamtrip.pt/r`, and the copied component sources. The CLI writes files only inside
the configured components directory of the project it runs in and fetches only from the
configured registry; anything that breaks either of those is a bug we want to hear about.
