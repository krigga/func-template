import { compileFunc } from "@ton-community/func-js";
import { readFileSync } from "fs";
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, Slice } from "ton-core";

export type PingPongConfig = {
    id: number // to distinguish different ping pong instances
}

export function pingPongConfigToCell(config: PingPongConfig): Cell {
    return beginCell()
        .storeUint(config.id, 32)
        .endCell()
}

export async function compilePingPong(): Promise<Cell> {
    const cr = await compileFunc({
        targets: ['contracts/ping_pong.fc'],
        sources: (path: string) => readFileSync(path).toString(),
    })

    if (cr.status === 'error') throw new Error(cr.message)

    return Cell.fromBase64(cr.codeBoc)
}

export const Opcodes = {
    topup: 0x59da2019,
    ping: 0x50494e47,
    pong: 0x504f4e47,
}

export class PingPong implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell, data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new PingPong(address)
    }

    static async createFromConfig(config: PingPongConfig, workchain = 0) {
        const code = await compilePingPong()
        const data = pingPongConfigToCell(config)
        const init = { code, data }
        return new PingPong(contractAddress(workchain, init), init)
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATLY,
            body: beginCell()
                .endCell(),
        })
    }

    async sendTopup(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATLY,
            body: beginCell()
                .storeUint(Opcodes.topup, 32)
                .endCell(),
        })
    }

    async sendPing(provider: ContractProvider, via: Sender, params: {
        value: bigint
        message?: Slice
    }) {
        await provider.internal(via, {
            value: params.value,
            sendMode: SendMode.PAY_GAS_SEPARATLY,
            body: beginCell()
                .storeUint(Opcodes.ping, 32)
                .storeSlice(params.message ?? new Cell().beginParse())
                .endCell(),
        })
    }
}