# TON project template (RFC)

This is an example of what a typical TON project could look like using a tool written in TypeScript.

Current layout:
- `contracts` - contains the source code of all the smart contracts of the project and their dependencies.
- `wrappers` - contains the wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions (will usually be initially created by tinfoil).
- `scripts` - contains scripts used by the project. A common example would be a deploy script that would through some means deploy the projects' contracts (could be printing some ton:// deep links, or using a private key for a wallet and an API). Would typically use the wrappers.
- `tests` - tests for the contracts. Would typically use the wrappers.

We ask the community to provide any comments on this layout, the wanted/required changes, or even suggestions for entirely different project structures and/or tool concepts.

Everything in this repo is subject to change.