import arg from 'arg'
import { init } from './init'

const argSpec = {}

export type Args = arg.Result<typeof argSpec>

export type Runner = (args: Args) => Promise<void>

const runners: Record<string, Runner> = {
    init,
}

async function main() {
    const args = arg(argSpec)

    if (args._.length === 0) {
        console.error('No command was specified.')
        console.log('Get help by running with -h.')
        process.exit(1)
    }

    await runners[args._[0]](args)
}

main()