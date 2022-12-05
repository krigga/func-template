import { Address, Cell, contractAddress, StateInit } from "ton";
import { compileFunc } from "@ton-community/func-js";
import { readFileSync } from "fs";
import { SmartContract } from "@ton-community/tx-emulator";
import BN from "bn.js";

export abstract class Factory<C> {
    public static readonly entrypoints?: string | string[];

    private code?: Cell;

    public async compile(): Promise<Cell> {
        if (this.code !== undefined) return this.code;
        let ep = (<typeof Factory> this.constructor).entrypoints;
        if (ep === undefined) {
            throw new Error('entrypoints were not defined');
        }
        if (typeof ep === 'string') {
            ep = [ep];
        }
        const cr = await compileFunc({
            entryPoints: ep,
            sources: (path: string) => {
                try {
                    return readFileSync(path).toString();
                } catch (e) {}
                const slash = path.lastIndexOf('/');
                return readFileSync(__dirname + '/../includes/' + (slash >= 0 ? path.substring(slash + 1) : path)).toString();
            },
        });
        if (cr.status === 'error') throw new Error(cr.message);
        this.code = Cell.fromBoc(Buffer.from(cr.codeBoc, 'base64'))[0];
        return this.code;
    }

    public abstract dataCell(config: C): Promise<Cell>;

    public async stateInit(config: C): Promise<StateInit> {
        return new StateInit({
            code: await this.compile(),
            data: await this.dataCell(config),
        });
    }

    public async address(config: C, workchain: number = 0): Promise<Address> {
        return contractAddress({
            workchain,
            initialCode: await this.compile(),
            initialData: await this.dataCell(config),
        });
    }

    public async smartContract(config: C, opts?: { workchain?: number, balance?: BN }): Promise<SmartContract> {
        const wc = opts?.workchain ?? 0;
        return SmartContract.fromState({
            address: await this.address(config, wc),
            accountState: {
                type: 'active',
                code: await this.compile(),
                data: await this.dataCell(config),
            },
            balance: opts?.balance ?? new BN(0),
        });
    }
}