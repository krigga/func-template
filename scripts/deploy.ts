import { ui } from "./lib/ui";
import { Address, toNano, TonClient } from "ton";
import { Distributor } from "../wrappers/Distributor";
import { randomAddress } from "@ton-community/test-utils";
import {
  CLIConnectProvider,
  TonConnectProvider,
  DeeplinkProvider,
} from "./lib/connect";
import inquirer from "inquirer";
import { getHttpEndpoint } from "@orbs-network/ton-access";

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

  const { deploy, network } = await inquirer.prompt([
    {
      type: "list",
      name: "network",
      message: "Which network are you deploying on?",
      choices: ["mainnet", "testnet"],
    },
    {
      type: "list",
      name: "deploy",
      message: "How will you deploy your contract?",
      choices: [
        {
          name: "TON Connect compatible mobile wallet (example: Tonkeeper)",
          value: "TC",
        },
        {
          name: "Create a ton:// deep link",
          value: "deepLink",
        },
      ],
    },
  ]);

  let provider: CLIConnectProvider;

  switch (deploy) {
    case "deepLink":
      provider = new DeeplinkProvider();
      break;
    case "TC":
      provider = new TonConnectProvider();
      break;
    default:
      throw new Error("Unknown option");
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
      distributor.address.toString(),
      toNano("0.05").toString(),
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

  const sleep = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
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
