import { CreepSpecs } from "creep/CreepSpecs";
import {
    DistributorScheduler,
    DistributorSchedulerProto,
} from "scheduler/DistributorScheduler";
import { MinerScheduler, MinerSchedulerProto } from "scheduler/MinerScheduler";
import { Scheduler } from "scheduler/Scheduler";

export class Colony {
    public room: Room | null;
    public schedulers: {
        minerScheduler: MinerScheduler;
        distributorScheduler: DistributorScheduler;
    };

    constructor(roomName: string) {
        this.room = Game.rooms[roomName];
        this.schedulers = {
            minerScheduler: new MinerScheduler(this),
            distributorScheduler: new DistributorScheduler(this),
        };
    }

    // For the first time ever setting up a colony
    public initializeColony(): void {
        this.schedulers.minerScheduler.initializeScheduler({
            roomName: this.room!.name,
        });
        this.schedulers.distributorScheduler.initializeScheduler({});
    }

    public set proto(proto: ColonyProto) {
        const minerScheduler = new MinerScheduler(this);
        minerScheduler.proto = proto.schedulers.minerScheduler;
        const distributorScheduler = new DistributorScheduler(this);
        distributorScheduler.proto = proto.schedulers.distributorScheduler;

        this.room = Game.rooms[proto.room];
        this.schedulers = {
            minerScheduler,
            distributorScheduler,
        };
    }

    public get rcl(): number {
        return this.room!.controller?.level ?? 0;
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
            room: this.room!.name,
            schedulers: {
                minerScheduler: this.schedulers.minerScheduler.toJSON(),
                distributorScheduler:
                    this.schedulers.distributorScheduler.toJSON(),
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
    schedulers: {
        minerScheduler: MinerSchedulerProto;
        distributorScheduler: DistributorSchedulerProto;
    };
}
