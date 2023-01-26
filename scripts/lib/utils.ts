import path from "path";
import fs from 'fs/promises';
import inquirer from "inquirer";

export function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function oneOrZeroOf<T extends { [k: string]: boolean | undefined }>(options: T): keyof T | undefined {
    let opt: keyof T | undefined = undefined
    for (const k in options) {
        if (options[k]) {
            if (opt === undefined) {
                opt = k
            } else {
                throw new Error(`Please pick only one of the options: ${Object.keys(options).join(', ')}`)
            }
        }
    }
    return opt
}

export const wrappersDir = path.join(process.cwd(), "wrappers");

export const findContracts = async () =>
  (await fs.readdir(wrappersDir)).map((f) => path.parse(f).name);

export async function selectContract(contract?: string) {
    const contracts = await findContracts();

    let selected;
    
    if (contract) {
        selected = contracts.find(c => c.toLowerCase() === contract);
        if (!selected) {
            throw new Error(`Please pick only one of the options: ${contracts.join(', ')}`)
        }
    } else {
        const { contract } = await inquirer.prompt([
            {
              type: "list",
              name: "contract",
              message: "Choose contract",
              choices: contracts,
            },
          ]);
        selected = contract;
    }

    const contractPath = path.join(wrappersDir, `${selected}.ts`);
    const contractModule = await import(contractPath);

    return {contract: selected, module: contractModule};
}