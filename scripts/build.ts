import { compileDistributor } from "../wrappers/Distributor"

const main = async () => {
    try {
        const cell = await compileDistributor()
        console.log(cell.toString());
    } catch(e) {
        console.error("Got error: " + e)
    }
}

main()