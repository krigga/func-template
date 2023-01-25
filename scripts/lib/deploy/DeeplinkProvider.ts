import { Address, beginCell, Cell, StateInit, storeStateInit } from "ton-core";
import { DeployProvider } from "./DeployProvider";
import { tonDeepLink } from "@ton-community/tinfoil";
import qrcode from "qrcode-terminal";
import { ui } from "../ui";
import inquirer from "inquirer";

export class DeeplinkProvider implements DeployProvider {
    async connect(): Promise<void> {
        return;
    }
    async sendTransaction(
        address: Address,
        amount: bigint,
        payload?: Cell,
        stateInit?: StateInit,
    ): Promise<void> {
        const deepLink = tonDeepLink(
            address,
            amount,
            payload,
            stateInit ? beginCell().storeWritable(storeStateInit(stateInit)).endCell() : undefined,
        );

        qrcode.generate(deepLink, { small: true });
        ui.log.write("\n");
        ui.log.write(deepLink);
        ui.log.write(
            "\nScan the QR code above, or open the ton:// link to send this transaction"
        );

        await inquirer.prompt([
            {
                type: "confirm",
                name: "Press enter when transaction was issued",
            },
        ]);
    }
}