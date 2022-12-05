# TON project template (RFC)

This is an example of what a typical TON project could look like using a tool written in TypeScript. The `softhat` directory currently includes the files that would end up in said tool, and all references to it from other directories such as `factories`, `scripts`, and `test` should be treated as if it were a separate npm package.

Current layout:
- `contracts` - contains the source code of all the smart contracts of the project and their dependencies, excluding stdlib.fc (it will be provided by the tool).
- `factories` - contains the factories and (de)serialization primitives for the contracts required. The factories are connected to their contracts' sources through the `public static readonly entrypoints: string | string[];` field.
- `scripts` - contains scripts used by the project. A common example would be a deploy script that would through some means deploy the projects' contracts (could be printing some ton:// deep links, or using a private key for a wallet and an API). Would typically use the factories.
- `softhat` - the future tool's files (see above).
- `test` - tests for the contracts. Would typically use the factories.

We ask the community to provide any comments on this layout, the wanted/required changes, or even suggestions for entirely different project structures and/or tool concepts.

Everything in this repo is subject to change.