import { Blockchain } from "@ton-community/sandbox";
import { Cell, SendMode, toNano } from "ton-core";
import { Distributor } from "../wrappers/Distributor";
import "@ton-community/test-utils";
import { randomAddress } from "@ton-community/test-utils";

describe('Distributor', () => {
    it('should deploy', async () => {
        const blockchain = await Blockchain.create()

        const distributor = blockchain.openContract(await Distributor.createFromConfig({
            owner: randomAddress(),
            processingPrice: toNano('0.05'),
            shares: [{
                address: randomAddress(),
                factor: 1,
                base: 1,
                comment: '',
            }],
            seed: 0,
        }))

        const deployer = await blockchain.treasury('deployer')

        const deployResult = await distributor.sendDeploy(deployer.getSender(), toNano('0.05'))

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: distributor.address,
            deploy: true,
        })
    })

    it('should distribute coins according to shares', async () => {
        const blockchain = await Blockchain.create()

        const owner = await blockchain.treasury('owner')

        const cost = toNano('0.05')
        const amount = toNano('1')
        const count = 4

        const shareholders = new Array(count).fill(null).map(_ => randomAddress())

        const distributor = blockchain.openContract(await Distributor.createFromConfig({
            owner: owner.address,
            processingPrice: cost,
            seed: 0,
            shares: shareholders.map((sh, i) => ({
                address: sh,
                factor: 1,
                base: 4,
                comment: i.toString(),
            })),
        }))

        await distributor.sendDeploy(owner.getSender(), toNano('0.05'))

        const sender = await blockchain.treasury('sender')

        const result = await sender.send({
            to: distributor.address,
            value: amount,
            sendMode: SendMode.PAY_GAS_SEPARATLY,
        })
        
        for (let i = 0; i < shareholders.length; i++) {
            expect(result.transactions).toHaveTransaction({
                from: distributor.address,
                to: shareholders[i],
            })
        }
    })

    it('should respond to updateData', async () => {
        const blockchain = await Blockchain.create()

        const owner = await blockchain.treasury('owner')

        const config = {
            owner: owner.address,
            processingPrice: 0n,
            seed: 0,
            shares: [{
                address: randomAddress(),
                factor: 1,
                base: 1,
                comment: '',
            }],
        }

        const distributor = blockchain.openContract(await Distributor.createFromConfig(config))

        const emptyCell = new Cell()

        await distributor.sendUpdateData(owner.getSender(), emptyCell)

        const state = (await blockchain.getContract(distributor.address)).accountState

        if (state?.type !== 'active') throw new Error('state should be active')

        expect(state.state.data?.equals(emptyCell)).toBeTruthy()
    })

    it('should respond to updateCode', async () => {
        const blockchain = await Blockchain.create()

        const owner = await blockchain.treasury('owner')

        const config = {
            owner: owner.address,
            processingPrice: 0n,
            seed: 0,
            shares: [{
                address: randomAddress(),
                factor: 1,
                base: 1,
                comment: '',
            }],
        }

        const distributor = blockchain.openContract(await Distributor.createFromConfig(config))

        const emptyCell = new Cell()

        await distributor.sendUpdateCode(owner.getSender(), emptyCell)

        const state = (await blockchain.getContract(distributor.address)).accountState

        if (state?.type !== 'active') throw new Error('state should be active')

        expect(state.state.code?.equals(emptyCell)).toBeTruthy()
    })

    it('should respond to topup', async () => {
        const blockchain = await Blockchain.create()

        const owner = await blockchain.treasury('owner')
        const value = toNano('0.05')

        const config = {
            owner: owner.address,
            processingPrice: 0n,
            seed: 0,
            shares: [{
                address: randomAddress(),
                factor: 1,
                base: 1,
                comment: '',
            }],
        }

        const distributor = blockchain.openContract(await Distributor.createFromConfig(config))

        const balanceBefore = await distributor.getBalance()

        await distributor.sendTopup(owner.getSender(), value)

        const balanceAfter = await distributor.getBalance()

        expect(balanceAfter > balanceBefore).toBeTruthy()
    })
})