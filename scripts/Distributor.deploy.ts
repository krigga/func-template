import { toNano } from "ton-core";
import { create, testDeployment } from "../wrappers/Distributor";
import { Deployer } from "./lib/deploy/Deployer";

export async function deploy(deployer: Deployer) {
    const distributor = await create()

    await deployer.deploy(distributor, toNano('0.05'))

    const opened = deployer.getClient().open(distributor)

    await testDeployment(opened)
}