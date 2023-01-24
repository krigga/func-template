import { beginCell, storeStateInit, toNano } from "ton";
import { Distributor } from "../wrappers/Distributor";
import { tonDeepLink } from "@ton-community/tinfoil";
import { randomAddress } from "@ton-community/test-utils";

const main = async () => {
    const distributor = await Distributor.createFromConfig({
        owner: randomAddress(),
        seed: 0,
        shares: [{
            address: randomAddress(),
            base: 1,
            factor: 1,
            comment: '',
        }],
        processingPrice: toNano('0.05'),
    })

    console.log(tonDeepLink(distributor.address, toNano('0.05'), undefined, beginCell().storeWritable(storeStateInit(distributor.init!)).endCell()))
}

main()