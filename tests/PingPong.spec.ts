import { Blockchain } from "@ton-community/sandbox";
import { beginCell, Cell, SendMode, toNano } from "ton-core";
import { Opcodes, PingPong } from "../wrappers/PingPong";
import { pseudoRandomBytes } from "crypto";
import "@ton-community/test-utils";

describe('PingPong', () => {
    it('should deploy', async () => {
        const blockchain = await Blockchain.create()

        const pingPong = blockchain.openContract(await PingPong.createFromConfig({
            id: 0,
        }))

        const deployer = await blockchain.treasury('deployer')

        const deployResult = await pingPong.sendDeploy(deployer.getSender(), toNano('0.05'))

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: pingPong.address,
            deploy: true,
        })
    })

    it('should accept topup', async () => {
        const blockchain = await Blockchain.create()

        const pingPong = blockchain.openContract(await PingPong.createFromConfig({
            id: 0,
        }))

        const deployer = await blockchain.treasury('deployer')

        await pingPong.sendDeploy(deployer.getSender(), toNano('0.05'))

        const topuper = await blockchain.treasury('topuper')

        const value = toNano('1')

        const topupResult = await pingPong.sendTopup(topuper.getSender(), value)

        expect(topupResult.transactions).toHaveTransaction({
            from: topuper.address,
            to: pingPong.address,
            exitCode: 0,
            outMessagesCount: 0,
        })
    })

    it('should respond to ping', async () => {
        const blockchain = await Blockchain.create()

        const pingPong = blockchain.openContract(await PingPong.createFromConfig({
            id: 0,
        }))

        const deployer = await blockchain.treasury('deployer')

        await pingPong.sendDeploy(deployer.getSender(), toNano('0.05'))

        const pinger = await blockchain.treasury('pinger')

        const value = toNano('1')

        const messageBytes = pseudoRandomBytes(4)

        const pingResult = await pingPong.sendPing(pinger.getSender(), {
            value,
            message: beginCell().storeBuffer(messageBytes).endCell().beginParse(),
        })

        expect(pingResult.transactions).toHaveTransaction({
            from: pinger.address,
            to: pingPong.address,
            exitCode: 0,
            outMessagesCount: 1,
        })
        expect(pingResult.transactions).toHaveTransaction({
            from: pingPong.address,
            to: pinger.address,
            body: (x: Cell) => {
                const s = x.beginParse()
                if (s.loadUint(32) !== Opcodes.pong) return false
                if (!s.loadBuffer(messageBytes.length).equals(messageBytes)) return false
                if (s.remainingBits !== 0 || s.remainingRefs !== 0) return false
                return true
            },
        })
    })

    it('should fail on random op codes', async () => {
        const blockchain = await Blockchain.create()

        const pingPong = blockchain.openContract(await PingPong.createFromConfig({
            id: 0,
        }))

        const deployer = await blockchain.treasury('deployer')

        await pingPong.sendDeploy(deployer.getSender(), toNano('0.05'))

        const sender = await blockchain.treasury('sender')

        const value = toNano('1')

        let op = pseudoRandomBytes(4).readUInt32BE()
        while (op === Opcodes.ping || op === Opcodes.topup) {
            op = pseudoRandomBytes(4).readUInt32BE()
        }

        const sendResult = await sender.send({
            to: pingPong.address,
            value,
            sendMode: SendMode.PAY_GAS_SEPARATLY,
            body: beginCell().storeUint(op, 32).endCell(),
        })

        expect(sendResult.transactions).toHaveTransaction({
            from: sender.address,
            to: pingPong.address,
            exitCode: (x?: number) => x !== 0,
        })
    })
})