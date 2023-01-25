import qrcode from "qrcode-terminal";
import TonConnect, {
    IStorage,
    WalletInfo,
    WalletInfoRemote,
} from "@tonconnect/sdk";
import fs from "fs/promises";
import inquirer from "inquirer";
import { Address, beginCell, Cell, StateInit, storeStateInit } from "ton-core";
import { ui } from "../ui";
import path from "path";
import { DeployProvider } from "./DeployProvider";

class Storage implements IStorage {
    _path = path.join(process.cwd(), "temp", "tonconnect");

    async setItem(key: string, value: string): Promise<void> {
        await fs.mkdir(this._path, { recursive: true });
        return fs.writeFile(path.join(this._path, key), value);
    }
    async getItem(key: string): Promise<string | null> {
        try {
            return (await fs.readFile(path.join(this._path, key))).toString();
        } catch (e) {
            return null;
        }
    }
    async removeItem(key: string): Promise<void> {
        return fs.unlink(path.join(this._path, key));
    }
}

function isRemote(walletInfo: WalletInfo): walletInfo is WalletInfoRemote {
    return "universalLink" in walletInfo && "bridgeUrl" in walletInfo;
}

export class TonConnectProvider implements DeployProvider {
    private connector = new TonConnect({
        storage: new Storage(),
        manifestUrl:
            "https://raw.githubusercontent.com/ton-defi-org/tonconnect-manifest-temp/main/tonconnect-manifest.json", // TODO TC2 should enable passing contents directly
    });

    async connect(): Promise<void> {
        await this._connect();
        ui.log.write(
            `Connected to wallet at address: ${Address.parse(
                this.connector.wallet!.account.address
            ).toString()}\n`
        );
    }

    private async _connect(): Promise<void> {
        const wallets = (await this.connector.getWallets()).filter(isRemote);

        await this.connector.restoreConnection();

        if (this.connector.wallet) {
            return;
        }

        const answers = await inquirer.prompt([
            {
                type: "list",
                name: "wallet",
                message: "Choose your wallet",
                choices: wallets.map((w) => w.name),
            },
        ]);

        ui.updateBottomBar("Connecting to wallet...\n");

        const wallet = wallets.find((w) => w.name === answers.wallet)!;

        const url = this.connector.connect({
            universalLink: wallet.universalLink,
            bridgeUrl: wallet.bridgeUrl,
        }) as string;

        ui.log.write("\n");

        qrcode.generate(url, { small: true });

        ui.log.write("\n\n" + url + "\n\n");

        ui.updateBottomBar("Scan the QR code in your wallet or open the link...");

        return new Promise((resolve, reject) => {
            this.connector.onStatusChange((w) => {
                if (w) {
                    resolve();
                } else {
                    reject("Wallet is not connected");
                }
            }, reject);
        });
    }

    async sendTransaction(
        address: Address,
        amount: bigint,
        payload?: Cell,
        stateInit?: StateInit,
    ): Promise<void> {
        ui.updateBottomBar("Sending transaction. Approve in your wallet...");

        await this.connector.sendTransaction({
            validUntil: Date.now() + 5 * 60 * 1000,
            messages: [
                {
                    address: address.toString(),
                    amount: amount.toString(),
                    payload: payload?.toBoc().toString("base64"),
                    stateInit: stateInit
                        ? beginCell()
                            .storeWritable(storeStateInit(stateInit))
                            .endCell()
                            .toBoc()
                            .toString("base64")
                        : undefined,
                },
            ],
        });

        ui.log.write("Sent transaction");
    }
}