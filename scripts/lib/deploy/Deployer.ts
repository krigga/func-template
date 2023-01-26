import { TonClient } from "ton";
import { Cell, Contract, Sender } from "ton-core";

export interface Deployer {
    deploy(contract: Contract, value: bigint, body?: Cell, waitAttempts?: number): Promise<void>
    getSender(): Sender
    getClient(): TonClient
}