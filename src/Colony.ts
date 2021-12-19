import { CreepSpecs } from "creep/CreepSpecs";
import {
    BuilderScheduler,
    BuilderSchedulerProto,
} from "scheduler/BuilderScheduler";
import {
    DistributorScheduler,
    DistributorSchedulerProto,
} from "scheduler/DistributorScheduler";
import { MinerScheduler, MinerSchedulerProto } from "scheduler/MinerScheduler";
import { Scheduler } from "scheduler/Scheduler";
import {
    UpgraderScheduler,
    UpgraderSchedulerProto,
} from "scheduler/UpgraderScheduler";
import { Pickup } from "utils/Structure";

export class Colony {
    private roomName: string;
    private remoteRoomNames: string[];
    public schedulers: {
        minerScheduler: MinerScheduler;
        distributorScheduler: DistributorScheduler;
        upgraderScheduler: UpgraderScheduler;
        builderScheduler: BuilderScheduler;
    };

    constructor(roomName: string) {
        this.roomName = roomName;
        this.remoteRoomNames = [];
        this.schedulers = {
            minerScheduler: new MinerScheduler(this),
            distributorScheduler: new DistributorScheduler(this),
            upgraderScheduler: new UpgraderScheduler(this),
            builderScheduler: new BuilderScheduler(this),
        };
    }

    // For the first time ever setting up a colony
    public initializeColony(): void {
        this.schedulers.minerScheduler.initializeScheduler({
            roomName: this.room!.name,
        });
        this.schedulers.distributorScheduler.initializeScheduler({});
        this.schedulers.upgraderScheduler.initializeScheduler({});
        this.schedulers.builderScheduler.initializeScheduler({});
    }

    public set proto(proto: ColonyProto) {
        const minerScheduler = new MinerScheduler(this);
        minerScheduler.proto = proto.schedulers.minerScheduler;
        const distributorScheduler = new DistributorScheduler(this);
        distributorScheduler.proto = proto.schedulers.distributorScheduler;
        const upgraderScheduler = new UpgraderScheduler(this);
        upgraderScheduler.proto = proto.schedulers.upgraderScheduler;
        const builderScheduler = new BuilderScheduler(this);
        builderScheduler.proto = proto.schedulers.builderScheduler;

        this.roomName = proto.room;
        this.remoteRoomNames = proto.remoteRooms;
        this.schedulers = {
            minerScheduler,
            distributorScheduler,
            upgraderScheduler,
            builderScheduler,
        };
    }

    public get room(): Room {
        if (!Game.rooms[this.roomName]) {
            throw Error(`Room ${this.roomName} not found`);
        }
        return Game.rooms[this.roomName];
    }

    public get remoteRooms(): Room[] {
        return _.map(this.remoteRoomNames, n => Game.rooms[n]);
    }

    public get rooms(): Room[] {
        return [this.room!].concat(this.remoteRooms);
    }

    public get structures(): Structure[] {
        // TODO this should be cached
        return _.flatten(_.map(this.rooms, r => r.find(FIND_STRUCTURES)));
    }

    public get constructionSites(): ConstructionSite[] {
        return _.filter(_.values(Game.constructionSites), s =>
            this.isInColony(s as InRoom)
        );
    }

    public get rcl(): RCL {
        return (this.room!.controller?.level ?? 0) as RCL;
    }

    public get sourcePickup(): Pickup | null {
        const room = this.room;
        if (room.storage) {
            return room.storage;
        }
        // TODO update with containers
        // For lower rcl
        const dropped: Resource[] = room.find(FIND_DROPPED_RESOURCES, {
            filter: { resourceType: RESOURCE_ENERGY },
        });
        if (dropped.length > 0) {
            return dropped[_.random(0, dropped.length - 1)];
        }
        return null;
    }

    public isInColony(obj: InRoom): boolean {
        const rooms = new Set(this.remoteRoomNames.concat([this.roomName]));
        return rooms.has(obj.room.name);
    }

    public run(): void {
        this.spawnIfNeeded();

        let shouldUpdateMemory = false;
        for (const scheduler of _.values(this.schedulers)) {
            shouldUpdateMemory =
                shouldUpdateMemory || (scheduler as Scheduler).run();
        }

        if (shouldUpdateMemory) {
            Memory.colonies[this.room!.name] = this.toJSON();
        }
    }

    public toJSON(): ColonyProto {
        return {
            room: this.roomName,
            remoteRooms: this.remoteRoomNames,
            schedulers: {
                minerScheduler: this.schedulers.minerScheduler.toJSON(),
                distributorScheduler:
                    this.schedulers.distributorScheduler.toJSON(),
                upgraderScheduler: this.schedulers.upgraderScheduler.toJSON(),
                builderScheduler: this.schedulers.builderScheduler.toJSON(),
            },
        };
    }

    private spawnIfNeeded(): void {
        const distributor = this.schedulers.distributorScheduler.spawn();
        if (!distributor.isEmpty()) {
            this.spawn(distributor, this.schedulers.distributorScheduler);
            return;
        }
        const miner = this.schedulers.minerScheduler.spawn();
        if (!miner.isEmpty()) {
            this.spawn(miner, this.schedulers.minerScheduler);
            return;
        }
        const upgrader = this.schedulers.upgraderScheduler.spawn();
        if (!upgrader.isEmpty()) {
            this.spawn(upgrader, this.schedulers.upgraderScheduler);
            return;
        }
        const builder = this.schedulers.builderScheduler.spawn();
        if (!builder.isEmpty()) {
            this.spawn(builder, this.schedulers.builderScheduler);
            return;
        }
    }

    private spawn(specs: CreepSpecs, scheduler: Scheduler): void {
        const spawns: StructureSpawn[] = _.filter(
            _.values(Game.spawns),
            spawn => spawn.room.name === this.room!.name
        );
        for (const spawn of spawns) {
            if (!spawn.spawning) {
                const result = spawn.spawnCreep(specs.parts, specs.name, {
                    memory: specs.memory,
                });

                if (result === OK) {
                    scheduler.spawning(specs);
                    return;
                }
            }
        }
    }
}

export interface ColonyProto {
    room: string;
    remoteRooms: string[];
    schedulers: {
        minerScheduler: MinerSchedulerProto;
        distributorScheduler: DistributorSchedulerProto;
        upgraderScheduler: UpgraderSchedulerProto;
        builderScheduler: BuilderSchedulerProto;
    };
}

interface InRoom {
    room: Room;
}

type RCL = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
