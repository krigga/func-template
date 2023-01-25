import { ui } from "./lib/ui";
import { Address, toNano, TonClient } from "ton";
import { Distributor } from "../wrappers/Distributor";
import { randomAddress } from "@ton-community/test-utils";
import inquirer from "inquirer";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { DeeplinkProvider } from "./lib/deploy/DeeplinkProvider";
import { TonConnectProvider } from "./lib/deploy/TonConnectProvider";
import { TonhubProvider } from "./lib/deploy/TonhubProvider";
import { sleep } from "./lib/utils";

const main = async () => {
    const distributor = await Distributor.createFromConfig({
        owner: randomAddress(),
        seed: 0,
        shares: [
            {
                address: randomAddress(),
                base: 1,
                factor: 1,
                comment: "",
            },
        ],
        processingPrice: toNano("0.05"),
    });

    ui.log.write(
        "Deploying contract to address: " + distributor.address.toString()
    );

    const { network }: { network: 'mainnet' | 'testnet' } = await inquirer.prompt([
        {
            type: "list",
            name: "network",
            message: "Which network are you deploying on?",
            choices: ["mainnet", "testnet"],
        },
    ]);

    const { provider }: { provider: DeeplinkProvider } = await inquirer.prompt([
        {
            type: "list",
            name: "provider",
            message: "How will you deploy your contract?",
            choices: [
                {
                    name: "TON Connect compatible mobile wallet (example: Tonkeeper)",
                    value: new TonConnectProvider(),
                },
                {
                    name: "Create a ton:// deep link",
                    value: new DeeplinkProvider(),
                },
                {
                    name: "Tonhub wallet",
                    value: new TonhubProvider(network),
                }
            ],
        },
    ]);

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
            distributor.address,
            toNano("0.05"),
            undefined,
            distributor.init!
        );
    } catch (e) {
        ui.updateBottomBar("");
        ui.log.write("Unable to send transaction!");
        process.exit(1);
    }

    const tc = new TonClient({
        endpoint: await getHttpEndpoint({ network }),
    });

    for (let i = 1; i <= 10; i++) {
        ui.updateBottomBar(`Awaiting contract deployment... [Attempt ${i}/10]`);
        const isDeployed = await tc.isContractDeployed(
            Address.parse(distributor.address.toString())
        );
        if (isDeployed) {
            ui.updateBottomBar("");
            ui.log.write("Contract deployed!");
            ui.log.write(
                `You can view it at https://${
                    network === "testnet" ? "testnet." : ""
                }tonscan.org/address/${distributor.address.toString()}`
            );
            break;
        } else if (i === 10) {
            ui.updateBottomBar("");
            ui.log.write(
                "Contract was not deployed. Check your wallet's transactions"
            );
        }
        await sleep(2000);
    }
};

main();
