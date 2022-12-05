import BN from "bn.js";
import { Address, Cell, contractAddress, Message, StateInit } from "ton";

const pseudoRandomBytes = (n: number): Buffer => {
    const b = Buffer.alloc(n);
    for (let i = 0; i < n; i++) {
        b[i] = Math.floor(Math.random() * 256);
    }
    return b;
};

export const randomAddress = (workchain: number = 0) => new Address(workchain, pseudoRandomBytes(32));

export const addressFromStateInit = (stateInit: StateInit, workchain: number = 0) => contractAddress({
    workchain,
    initialCode: stateInit.code,
    initialData: stateInit.data,
});

export const messageToCell = (message: Message) => {
    const c = new Cell();
    message.writeTo(c);
    return c;
};

export const tonDeepLink = (address: Address, amount: BN, body?: Cell, stateInit?: Cell) =>
    `ton://transfer/${address.toFriendly({
        urlSafe: true,
        bounceable: true,
    })}?amount=${amount.toString()}${body ? ('&bin=' + body.toBoc().toString('base64url')) : ''}${stateInit ? ('&init=' + stateInit.toBoc().toString('base64url')) : ''}`;