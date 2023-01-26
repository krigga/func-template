import { compileFunc } from "@ton-community/func-js";
import { randomAddress } from "@ton-community/test-utils";
import { assert } from "console";
import { readFileSync } from "fs";
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, OpenedContract, Sender, SendMode, toNano } from "ton-core";
import { ui } from "../scripts/lib/ui";

export type DistributorShare = { address: Address, factor: number, base: number, comment: string }

const DistributorShareValue: DictionaryValue<DistributorShare> = {
    serialize: (src: DistributorShare, builder) => {
        builder
            .storeAddress(src.address)
            .storeUint(src.factor, 16)
            .storeUint(src.base, 16)
            .storeRef(beginCell()
                .storeBuffer(Buffer.from(src.comment)))
    },
    parse: (src) => {
        const address = src.loadAddress()
        const factor = src.loadUint(16)
        const base = src.loadUint(16)
        const commentSlice = src.loadRef().beginParse()
        const comment = commentSlice.loadBuffer(commentSlice.remainingBits / 8).toString()
        return {
            address,
            factor,
            base,
            comment,
        }
    },
}

export type DistributorConfig = {
    owner: Address
    processingPrice: bigint
    shares: DistributorShare[]
    seed: number
}

export function distributorConfigToCell(config: DistributorConfig): Cell {
    const shares = Dictionary.empty(Dictionary.Keys.Uint(32), DistributorShareValue)

    const totalShares = config.shares.reduce((prev, cur) => prev + (cur.factor / cur.base), 0)

    if (totalShares !== 1) {
        throw new Error('Total shares should be 100%')
    }

    for (let i = 0; i < config.shares.length; i++) {
        shares.set(i, config.shares[i])
    }

    return beginCell()
        .storeAddress(config.owner)
        .storeCoins(config.processingPrice)
        .storeRef(beginCell().storeDictDirect(shares))
        .storeUint(config.seed, 16)
        .endCell()
}

export async function compile(): Promise<Cell> {
    const cr = await compileFunc({
        targets: ['contracts/distributor.fc'],
        sources: (path: string) => readFileSync(path).toString(),
    })

    if (cr.status === 'error') throw new Error(cr.message)

    return Cell.fromBase64(cr.codeBoc)
}

export async function create() {
    return Distributor.createFromConfig({
        owner: Address.parse("EQDKh53EejfT72JatL9HvrOw_7mUpNLFmrMgeAd15FIMBqnb"), //randomAddress(),
        seed: 0,
        shares: [
            {
                address: Address.parse("EQDKh53EejfT72JatL9HvrOw_7mUpNLFmrMgeAd15FIMBqnb"), // randomAddress(),
                base: 1,
                factor: 1,
                comment: "",
            },
        ],
        processingPrice: toNano("0.05"),
    });
}

export async function testDeployment(distributor: OpenedContract<Distributor>): Promise<void> {
    const processingPrice = await distributor.getProcessingPrice();
    ui.log.write("Processing price: " + processingPrice.toString());
}

export class Distributor implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell, data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Distributor(address)
    }

    static async createFromConfig(config: DistributorConfig, workchain = 0) {
        const code = await compile()
        const data = distributorConfigToCell(config)
        const init = { code, data }
        return new Distributor(contractAddress(workchain, init), init)
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATLY,
            body: beginCell()
                .endCell(),
        })
    }

    async sendUpdateData(provider: ContractProvider, via: Sender, newData: Cell) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATLY,
            body: beginCell()
                .storeUint(0xfa2a76a0, 32)
                .storeRef(newData)
                .endCell(),
        })
    }

    async sendUpdateCode(provider: ContractProvider, via: Sender, newCode: Cell) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATLY,
            body: beginCell()
                .storeUint(0x20ccb55b, 32)
                .storeRef(newCode)
                .endCell(),
        })
    }

    async sendTopup(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATLY,
            body: beginCell()
                .storeUint(0x59da2019, 32)
                .endCell(),
        })
    }

    async getProcessingPrice(provider: ContractProvider): Promise<BigInt> {
        return (await provider.get("processing_price", [])).stack.readBigNumber();
    }

    async getBalance(provider: ContractProvider) {
        return (await provider.getState()).balance
    }
}