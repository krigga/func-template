import { oneOrZeroOf, sleep } from "../utils";
import { Deployer } from "./Deployer";
import arg from "arg";
import { ui } from "../ui";
import inquirer from "inquirer";
import { DeployProvider } from "./DeployProvider";
import { DeeplinkProvider } from "./DeeplinkProvider";
import { TonConnectProvider } from "./TonConnectProvider";
import { TonhubProvider } from "./TonhubProvider";
import { SendMode } from "ton-core";
import { TonClient } from "ton";
import { getHttpEndpoint } from "@orbs-network/ton-access";

export async function createDeployer(): Promise<Deployer> {
    const args = arg({
        '--mainnet': Boolean,
        '--testnet': Boolean,

        '--tonconnect': Boolean,
        '--deeplink': Boolean,
        '--tonhub': Boolean,

        '--contract': String
    });

    let network = oneOrZeroOf({
        mainnet: args['--mainnet'],
        testnet: args['--testnet'],
    })

    if (!network) {
        const { network: promptNetwork }: { network: 'mainnet' | 'testnet' } = await inquirer.prompt([
            {
                type: "list",
                name: "network",
                message: "Which network are you deploying on?",
                choices: ["mainnet", "testnet"],
            },
        ]);

        network = promptNetwork
    }

    let deployUsing = oneOrZeroOf({
        tonconnect: args['--tonconnect'],
        deeplink: args['--deeplink'],
        tonhub: args['--tonhub'],
    })

    if (!deployUsing) {
        const { deployUsing: promtDeployUsing }: { deployUsing: 'tonconnect' | 'deeplink' | 'tonhub' } = await inquirer.prompt([
            {
                type: "list",
                name: "deployUsing",
                message: "How will you deploy your contract?",
                choices: [
                    {
                        name: "TON Connect compatible mobile wallet (example: Tonkeeper)",
                        value: 'tonconnect',
                    },
                    {
                        name: "Create a ton:// deep link",
                        value: 'deeplink',
                    },
                    {
                        name: "Tonhub wallet",
                        value: 'tonhub',
                    }
                ],
            },
        ]);

        deployUsing = promtDeployUsing
    }

    let provider: DeployProvider;
    switch (deployUsing) {
        case 'deeplink':
            provider = new DeeplinkProvider();
            break;
        case 'tonconnect':
            provider = new TonConnectProvider();
            break;
        case 'tonhub':
            provider = new TonhubProvider(network);
            break;
        default:
            throw new Error('Unknown deploy option');
    }

    try {
        await provider.connect();
    } catch (e) {
        console.error("Unable to connect to wallet.");
        process.exit(1);
    } finally {
        ui.updateBottomBar("");
    }

    const tc = new TonClient({
        endpoint: await getHttpEndpoint({ network }),
    });

    return {
        deploy: async (contract, value, body, waitAttempts = 10) => {
            if (!contract.init) {
                ui.updateBottomBar("");
                ui.log.write("Contract has no init!");
                process.exit(1);
            }

            try {
                await provider.sendTransaction(
                    contract.address,
                    value,
                    body,
                    contract.init!
                )
            } catch (e) {
                ui.updateBottomBar("");
                ui.log.write("Unable to send transaction! " + e);
                process.exit(1);
            }

            if (waitAttempts === undefined || waitAttempts <= 0) return

            for (let i = 1; i <= waitAttempts; i++) {
                ui.updateBottomBar(`Awaiting contract deployment... [Attempt ${i}/${waitAttempts}]`);
                const isDeployed = await tc.isContractDeployed(
                    contract.address
                );
                if (isDeployed) {
                    ui.updateBottomBar("");
                    ui.log.write("Contract deployed!");
                    ui.log.write(
                        `You can view it at https://${
                            network === "testnet" ? "testnet." : ""
                        }tonscan.org/address/${contract.address.toString()}`
                    );
                    return;
                }
                await sleep(2000);
            }
        
            ui.updateBottomBar("");
            ui.log.write(
                "Contract was not deployed. Check your wallet's transactions"
            );
            process.exit(1);
        },
        getSender: () => ({
            send: async (args) => {
                if (args.bounce !== undefined) {
                    throw new Error('Deployer sender does not support `bounce`')
                }

                if (!(args.sendMode === undefined || args.sendMode == SendMode.PAY_GAS_SEPARATLY)) {
                    throw new Error('Deployer sender does not support `sendMode` other than `PAY_GAS_SEPARATLY`')
                }

                await provider.sendTransaction(
                    args.to,
                    args.value,
                    args.body ?? undefined,
                    args.init ?? undefined,
                )
            }
        }),
        getClient: () => tc,
    }
}