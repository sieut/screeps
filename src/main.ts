import { Colony, ColonyProto } from "Colony";
import { ErrorMapper } from "utils/ErrorMapper";
import MemHack from "utils/MemHack";

declare global {
    /*
        Example types, expand on these or remove them and add your own.
        Note: Values, properties defined here do no fully *exist* by this type definiton alone.
                    You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

        Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
        Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
    */
    interface Memory {
        colonies: { [mainRoom: string]: ColonyProto };
    }

    interface CreepMemory {}

    interface RoomMemory {
        // Indicates room is mainRoom of a colony
        mainRoom: boolean;
    }

    // Syntax for adding proprties to `global` (ex "global.log")
    namespace NodeJS {
        interface Global {
            Memory?: Memory;
            colonies: { [mainRoom: string]: Colony };
        }
    }
}

let INIT = false;
const MEMHACK: MemHack = new MemHack();

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
    init();

    MEMHACK.pretick();
    // Automatically delete memory of missing creeps
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }

    for (const colonyName in global.colonies) {
        global.colonies[colonyName].run();
    }
});

function init(): void {
    if (INIT) {
        return;
    }

    if (!Memory.colonies) {
        Memory.colonies = {};
    }
    global.colonies = {};

    for (const room in Memory.colonies) {
        const proto = Memory.colonies[room];
        const colony = new Colony(room);
        colony.proto = proto;

        global.colonies[room] = colony;
    }
    // For the very first spawn, we have to set the first colony
    // if (_.keys(Game.rooms).length === 1) {
    //     const room = _.keys(Game.rooms)[0];
    //     global.colonies[room] = new Colony(room);
    //     global.colonies[room].initializeColony();
    //     Memory.colonies[room] = global.colonies[room].toJSON();
    // }

    INIT = true;
}
