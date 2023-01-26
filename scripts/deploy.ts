import { ui } from "./lib/ui";
import { Address, toNano, TonClient } from "ton";
import inquirer from "inquirer";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { DeeplinkProvider } from "./lib/deploy/DeeplinkProvider";
import { TonConnectProvider } from "./lib/deploy/TonConnectProvider";
import { TonhubProvider } from "./lib/deploy/TonhubProvider";
import { oneOrZeroOf, selectContract, sleep } from "./lib/utils";
import arg from "arg";
import { DeployProvider } from "./lib/deploy/DeployProvider";

const main = async () => {
    const args = arg({
        '--mainnet': Boolean,
        '--testnet': Boolean,

        '--tonconnect': Boolean,
        '--deeplink': Boolean,
        '--tonhub': Boolean,

        '--contract': String
    });

    const {module, contract} = await selectContract(args['--contract']);

    if (!module.create) {
        throw new Error(`${contract}.ts is missing the create() function`);
    }

    const contractClass = await module.create();

    ui.log.write(
        "Deploying contract to address: " + contractClass.address.toString()
    );

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

    const tc = new TonClient({
        endpoint: await getHttpEndpoint({ network }),
    });

    let isDeployed = await tc.isContractDeployed(
        Address.parse(contractClass.address.toString())
    );

    if (!isDeployed) {
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
    
        try {
            await provider.sendTransaction(
                contractClass.address,
                toNano("0.05"),
                undefined,
                contractClass.init!
            );
        } catch (e) {
            ui.updateBottomBar("");
            ui.log.write("Unable to send transaction!" + e);
            process.exit(1);
        }

        for (let i = 1; i <= 10; i++) {
            ui.updateBottomBar(`Awaiting contract deployment... [Attempt ${i}/10]`);
            isDeployed = await tc.isContractDeployed(
                Address.parse(contractClass.address.toString())
            );
            if (isDeployed) {
                ui.updateBottomBar("");
                ui.log.write("Contract deployed!");
                ui.log.write(
                    `You can view it at https://${
                        network === "testnet" ? "testnet." : ""
                    }tonscan.org/address/${contractClass.address.toString()}`
                );
                break;
            }
            await sleep(2000);
        }
    
        if (!isDeployed) {
            ui.updateBottomBar("");
            ui.log.write(
                "Contract was not deployed. Check your wallet's transactions"
            );
            process.exit(1);
        }
    } else {
        ui.log.write("Contract is already deployed.")
    }

    if (module.testDeployment) {
        const opened = tc.open(contractClass);
        ui.log.write("Testing contract...")
        try {
            await module.testDeployment(opened);
        } catch(e) {
            ui.log.write(e);
        }
    }

};

main().catch(e => console.error(e));
