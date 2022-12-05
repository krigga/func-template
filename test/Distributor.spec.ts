import { BN } from "bn.js";
import { Cell, CellMessage, CommonMessageInfo, InternalMessage, toNano } from "ton";
import { Distributor, Queries } from "../factories/Distributor";
import { expect } from "chai";
import { randomAddress } from "../softhat/src/utils";

describe('distributor', () => {
    const factory = new Distributor();

    it('should distribute coins according to shares', async () => {
        const cost = toNano('0.05');
        const amount = toNano('1');
        const count = 4;

        const shareholders = new Array(count).fill(null).map(_ => randomAddress());

        const contract = await factory.smartContract({
            owner: randomAddress(),
            processingPrice: cost,
            seed: 0,
            shares: shareholders.map((sh, i) => ({
                address: sh,
                factor: 1,
                base: 4,
                comment: i.toString(),
            })),
        });

        const res = await contract.sendMessage(new InternalMessage({
            to: contract.getShardAccount().account.address,
            from: randomAddress(),
            value: cost.add(amount),
            bounce: true,
            body: new CommonMessageInfo({
                body: new CellMessage(new Cell()),
            }),
        }));

        expect(res.transaction.description.type).to.eq('generic');
        if (res.transaction.description.type !== 'generic') return;

        expect(res.transaction.description.computePhase.type).to.eq('computed');
        if (res.transaction.description.computePhase.type !== 'computed') return;

        expect(res.transaction.description.computePhase.success);

        expect(res.transaction.outMessages.length).to.eq(shareholders.length);
        
        for (let i = 0; i < shareholders.length; i++) {
            const outMsg = res.transaction.outMessages[i];
            expect(outMsg.info.type).to.eq('internal');
            if (outMsg.info.type !== 'internal') continue;
            expect(outMsg.info.dest.equals(shareholders[i])).to.eq(true);
            expect(outMsg.info.value.coins.eq(amount.sub(res.transaction.description.actionPhase?.totalFwdFees ?? new BN(0)).divn(count))).to.eq(true);
            const body = Buffer.alloc(5);
            body[4] = '0'.charCodeAt(0) + i;
            expect(outMsg.body.bits.getTopUppedArray().equals(body)).to.eq(true);
        }
    });

    it('should respond to updateData', async () => {
        const owner = randomAddress();
        const value = toNano('0.05');

        const config = {
            owner,
            processingPrice: new BN(0),
            seed: 0,
            shares: [{
                address: randomAddress(),
                factor: 1,
                base: 1,
                comment: '',
            }],
        };

        const emptyCell = new Cell();
        
        const contract = await factory.smartContract(config);
        await contract.sendMessage(new InternalMessage({
            to: contract.getShardAccount().account.address,
            value,
            from: owner,
            bounce: true,
            body: new CommonMessageInfo({
                body: new CellMessage(Queries.updateData(emptyCell)),
            }),
        }));

        const acc = contract.getAccount();

        expect(acc.storage.state.type).to.eq('active');
        if (acc.storage.state.type !== 'active') return;

        expect(acc.storage.state.state.data!.hash().equals(emptyCell.hash())).to.eq(true);
    });

    it('should respond to update code', async () => {
        const owner = randomAddress();
        const value = toNano('0.05');

        const config = {
            owner,
            processingPrice: new BN(0),
            seed: 0,
            shares: [{
                address: randomAddress(),
                factor: 1,
                base: 1,
                comment: '',
            }],
        };

        const emptyCell = new Cell();

        const contract = await factory.smartContract(config);
        await contract.sendMessage(new InternalMessage({
            to: contract.getShardAccount().account.address,
            value,
            from: owner,
            bounce: true,
            body: new CommonMessageInfo({
                body: new CellMessage(Queries.updateCode(emptyCell)),
            }),
        }));

        const acc = contract.getAccount();

        expect(acc.storage.state.type).to.eq('active');
        if (acc.storage.state.type !== 'active') return;

        expect(acc.storage.state.state.code!.hash().equals(emptyCell.hash())).to.eq(true);
    });

    it('should respond to topup', async () => {
        const owner = randomAddress();
        const value = toNano('0.05');

        const config = {
            owner,
            processingPrice: new BN(0),
            seed: 0,
            shares: [{
                address: randomAddress(),
                factor: 1,
                base: 1,
                comment: '',
            }],
        };

        const contract = await factory.smartContract(config);
        const res = await contract.sendMessage(new InternalMessage({
            to: contract.getShardAccount().account.address,
            value,
            from: owner,
            bounce: true,
            body: new CommonMessageInfo({
                body: new CellMessage(Queries.topup()),
            }),
        }), {
            mutateAccount: false,
        });

        expect(res.shardAccount.account.storage.balance.coins.gt(contract.getAccount().storage.balance.coins)).to.eq(true);
    });
});