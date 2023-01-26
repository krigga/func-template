import arg from "arg";
import fs from "fs/promises";
import path from "path";
import { ui } from "./lib/ui";
import { selectContract, wrappersDir } from "./lib/utils";

const buildDir = path.join(process.cwd(), "build");

const main = async () => {
  const args = arg({
    "--contract": String,
  });

  const { module, contract } = await selectContract(args["--contract"]);

  ui.log.write(`Build script running, compiling ${contract}`);

  const contractPath = path.join(wrappersDir, `${contract}.ts`);

  const buildArtifactPath = path.join(buildDir, `${contract}.compiled.json`);

  try {
    await fs.unlink(buildArtifactPath);
  } catch (e) {}

  const contractModule = await import(contractPath);

  if (!contractModule.compile) {
    ui.log.write(`${contract}.ts is missing the compile() function!`);
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

main().catch(console.error);
