import { toNano } from "ton-core";
import { create, testDeployment } from "../wrappers/PingPong";
import { Deployer } from "./lib/deploy/Deployer";

export async function deploy(deployer: Deployer) {
    const pingPong = await create()

    await deployer.deploy(pingPong, toNano('0.05'))

    const opened = deployer.getClient().open(pingPong)

    await testDeployment(opened)
}