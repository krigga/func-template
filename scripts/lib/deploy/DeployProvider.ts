import { Address, Cell, StateInit } from "ton-core";

export interface DeployProvider {
    connect(): Promise<void>;
    sendTransaction(
        address: Address,
        amount: bigint,
        payload?: Cell,
        stateInit?: StateInit,
    ): Promise<void>;
}