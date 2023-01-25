import { Address, beginCell, Cell, StateInit, storeStateInit } from "ton-core";
import { DeployProvider } from "./DeployProvider";
import { TonhubConnector, TonhubSessionStateReady, TonhubTransactionRequest } from "ton-x";
import path from "path";
import fs from "fs/promises";
import { ui } from "../ui";
import qrcode from "qrcode-terminal";

const FILE_NAME = 'tonhub_session'

type SavedSession = TonhubSessionStateReady & { id: string, seed: string }

export class TonhubProvider implements DeployProvider {
    private connector: TonhubConnector;
    private idFileDir = path.join(process.cwd(), 'temp');
    private idFilePath: string;
    private session?: SavedSession;

    constructor(network: 'mainnet' | 'testnet') {
        this.connector = new TonhubConnector({
            network,
        })
        this.idFilePath = path.join(this.idFileDir, FILE_NAME + '_' + network)
    }

    async getSession() {
        await fs.mkdir(this.idFileDir, { recursive: true })

        try {
            let session: SavedSession = JSON.parse((await fs.readFile(this.idFilePath)).toString())

            const state = await this.connector.getSessionState(session.id)

            if (state.state === 'ready') {
                session = {
                    ...state,
                    id: session.id,
                    seed: session.seed,
                }

                await fs.writeFile(this.idFilePath, JSON.stringify(session))

                return session
            }
        } catch (e) {}

        const createdSession = await this.connector.createNewSession({
            name: 'TON template project',
            url: '',
        })

        ui.updateBottomBar("Connecting to wallet...\n");

        ui.log.write("\n");

        qrcode.generate(createdSession.link, { small: true });

        ui.log.write("\n\n" + createdSession.link + "\n\n");

        ui.updateBottomBar("Scan the QR code in your wallet or open the link...");

        const state = await this.connector.awaitSessionReady(createdSession.id, 5 * 60 * 1000)

        if (state.state === 'ready') {
            const session: SavedSession = {
                ...state,
                id: createdSession.id,
                seed: createdSession.seed,
            }

            await fs.writeFile(this.idFilePath, JSON.stringify(session))

            return session
        }

        throw new Error('Could not create new session')
    }

    async connect() {
        this.session = await this.getSession()
    }

    async sendTransaction(address: Address, amount: bigint, payload?: Cell, stateInit?: StateInit) {
        if (!this.session) throw new Error('TonhubProvider is not connected')

        const request: TonhubTransactionRequest = {
            seed: this.session.seed,
            appPublicKey: this.session.wallet.appPublicKey,
            to: address.toString(),
            value: amount.toString(),
            timeout: 5 * 60 * 1000,
            payload: payload ? payload.toBoc().toString('base64') : undefined,
            stateInit: stateInit ? beginCell().storeWritable(storeStateInit(stateInit)).endCell().toBoc().toString('base64') : undefined,
        }

        const response = await this.connector.requestTransaction(request)

        if (response.type !== 'success') {
            throw new Error(`Tonhub transaction request was not successful (${response.type})`)
        }
    }
}