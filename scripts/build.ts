import fs from "fs/promises";
import inquirer from "inquirer";
import path from "path";
import { Cell } from "ton";
import { ui } from "./lib/ui";

const wrappersDir = path.join(process.cwd(), "wrappers");
const buildDir = path.join(process.cwd(), "build");

const main = async () => {
    let selectedContract = process.argv[2];
    const contracts = (await fs.readdir(wrappersDir)).map(
        (f) => path.parse(f).name
    );

    if (!selectedContract) {
        ui.log.write(
            "Build script running, let's find some FunC contracts to compile.."
        );
        const { contract } = await inquirer.prompt([
            {
                type: "list",
                name: "contract",
                message: "Which contract do you want to build?",
                choices: contracts,
            },
        ]);
        selectedContract = contract;
    } else {
        const foundContract = contracts.find(
            (c) => c.toLowerCase() === selectedContract.toLowerCase()
        );
        if (!foundContract) {
            ui.log.write(
                `Contract wrapper file ${path.join(
                wrappersDir,
                `${selectedContract}.ts`
                )} not found!`
            );
            process.exit(1);
        }
        selectedContract = foundContract;
        ui.log.write(`Build script running, compiling ${selectedContract}`);
    }

    const contractPath = path.join(wrappersDir, `${selectedContract}.ts`);

    const buildArtifactPath = path.join(
        buildDir,
        `${selectedContract}.compiled.json`
    );

    try {
        await fs.unlink(buildArtifactPath);
    } catch (e) {}

    const contractModule = await import(contractPath);

    if (!contractModule.compile) {
        ui.log.write(`${selectedContract}.ts is missing the compile() function!`);
        process.exit(1);
    }

    ui.updateBottomBar("Compiling...");
    try {
        const cell = await contractModule.compile();
        ui.updateBottomBar("");
        ui.log.write("\nCompiled successfully! Cell BOC hex result:\n\n");
        ui.log.write(cell.toBoc().toString("hex"));

        await fs.mkdir(buildDir, { recursive: true });

        await fs.writeFile(
            buildArtifactPath,
            JSON.stringify({
                hex: cell.toBoc().toString("hex"),
            })
        );

        ui.log.write(
            `\nWrote compilation artifact to ${path.relative(
            process.cwd(),
            buildArtifactPath
            )}`
        );
    } catch (e) {
        ui.updateBottomBar("");
        ui.log.write(e);
        process.exit(1);
    }
};

main();
