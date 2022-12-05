import { toNano } from "ton";
import { Distributor } from "../factories/Distributor";
import { addressFromStateInit, messageToCell, randomAddress, tonDeepLink } from "../softhat/src/utils";

const main = async () => {
    const factory = new Distributor();

    const stateInit = await factory.stateInit({
        owner: randomAddress(),
        seed: 0,
        shares: [{
            address: randomAddress(),
            base: 1,
            factor: 1,
            comment: '',
        }],
        processingPrice: toNano('0.05'),
    });

    console.log(tonDeepLink(addressFromStateInit(stateInit), toNano('0.05'), undefined, messageToCell(stateInit)));
};

main();