import { Address, Cell } from "ton";

export const tonDeepLink = (address: Address, amount: bigint, body?: Cell, stateInit?: Cell) =>
    `ton://transfer/${address.toString({
        urlSafe: true,
        bounceable: true,
    })}?amount=${amount.toString()}${body ? ('&bin=' + body.toBoc().toString('base64url')) : ''}${stateInit ? ('&init=' + stateInit.toBoc().toString('base64url')) : ''}`;