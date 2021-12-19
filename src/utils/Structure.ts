import { Colony } from "Colony";

export const RAMPART_HP_BY_RCL = {
    0: 0,
    1: 0,
    2: 0,
    3: 50000,
    4: 50000,
    5: 50000,
    6: 50000,
    7: 50000,
    8: 50000,
};

export const WALL_HP_BY_RCL = {
    0: 0,
    1: 0,
    2: 0,
    3: 50000,
    4: 50000,
    5: 50000,
    6: 50000,
    7: 50000,
    8: 50000,
};

export type Pickup =
    | StructureContainer
    | StructureStorage
    | StructureTerminal
    | Resource;

export function repairPoints(struct: Structure, colony: Colony): number {
    switch (struct.structureType) {
        case STRUCTURE_RAMPART:
            return RAMPART_HP_BY_RCL[colony.rcl] - struct.hits;
        case STRUCTURE_WALL:
            return WALL_HP_BY_RCL[colony.rcl] - struct.hits;
        case STRUCTURE_ROAD:
            return struct.hitsMax / 2 - struct.hits;
        case STRUCTURE_INVADER_CORE:
            return 0;
        default:
            return struct.hitsMax - struct.hits;
    }
}
