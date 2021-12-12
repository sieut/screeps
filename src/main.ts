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

    for (const roomName in Memory.colonies) {
        const room = Game.rooms[roomName];
        if (!room || !room.controller?.my) {
            delete Memory.colonies[roomName];
            continue;
        }

        const proto = Memory.colonies[roomName];
        const colony = new Colony(roomName);
        colony.proto = proto;

        global.colonies[roomName] = colony;
    }

    const rooms: Room[] = _.values(Game.rooms);
    for (const room of rooms) {
        if (!global.colonies[room.name] && room.controller?.my) {
            const colony = new Colony(room.name);
            colony.initializeColony();
            global.colonies[room.name] = colony;
            Memory.colonies[room.name] = colony.toJSON();
        }
    }

    INIT = true;
}
