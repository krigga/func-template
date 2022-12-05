import {Address, beginCell, beginDict, Cell} from "ton";
import BN from "bn.js";
import { Factory } from "../softhat/src/Factory";

export const OpCodes = {
    updateData: 0xfa2a76a0,
    updateCode: 0x20ccb55b,
    topup: 0x59da2019,
};

export const Queries = {
    updateData: (newData: Cell) => beginCell().storeUint(OpCodes.updateData, 32).storeRef(newData).endCell(),
    updateCode: (newCode: Cell) => beginCell().storeUint(OpCodes.updateCode, 32).storeRef(newCode).endCell(),
    topup: () => beginCell().storeUint(OpCodes.topup, 32).endCell(),
};

export type DistributorConfig = {
    owner: Address
    processingPrice: BN
    shares: { address: Address, factor: number, base: number, comment: string }[]
    seed: number
}

export class Distributor extends Factory<DistributorConfig> {
    public static readonly entrypoints = 'contracts/distributor.fc';

    public async dataCell(config: DistributorConfig): Promise<Cell> {
        let shares = beginDict(32)

        let totalShares = config.shares.reduce((prev, cur) => prev + (cur.factor / cur.base), 0)

        if (totalShares !== 1) {
            throw new Error('Total shares should be 100%')
        }

        let i = 0
        for (let share of config.shares) {
            shares.storeCell(i, beginCell()
                .storeAddress(share.address)
                .storeUint(share.factor, 16)
                .storeUint(share.base, 16)
                .storeRef(beginCell().storeBuffer(Buffer.from(share.comment)).endCell())
                .endCell())
            i++
        }

        return beginCell()
            .storeAddress(config.owner)
            .storeCoins(config.processingPrice)
            .storeRef(shares.endCell())
            .storeUint(config.seed, 16)
            .endCell()
    }
}