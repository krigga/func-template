import { selectDeployer } from "./lib/utils";
import arg from "arg";
import { createDeployer } from "./lib/deploy/createDeployer";
import { ui } from "./lib/ui";

const main = async () => {
    const args = arg({
        '--contract': String
    })

    const deployer = await createDeployer()

    const { deployer: deployerName, module } = await selectDeployer(args['--contract'])

    if (typeof module.deploy !== 'function') {
        ui.log.write(`${deployerName}.ts is missing the compile() function!`);
        process.exit(1);
    }

    await module.deploy(deployer)
};

main().catch(e => console.error(e));
