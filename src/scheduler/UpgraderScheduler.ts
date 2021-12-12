import { CreepSpecs } from "creep/CreepSpecs";
import { Scheduler, Work, Worker, WorkerProto } from "./Scheduler";

const UPGR_PREFIX = "MLfJ";
const EARLY_UPGR_PARTS = [WORK, CARRY, MOVE];

type Pickup =
    | StructureContainer
    | StructureStorage
    | StructureTerminal
    | Resource;

export class Upgrader extends Worker {
    public pickup: Pickup | null;
    private pickingUp: boolean;

    constructor(creep: Creep, work: Work) {
        super(creep, work);
        this.pickup = null;
        this.pickingUp = true;
    }

    public run(): void {
        if (this.pickingUp && this.creep.store.getFreeCapacity() === 0) {
            this.pickup = null;
            this.pickingUp = false;
        }
        if (
            !this.pickingUp &&
            this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0
        ) {
            this.pickingUp = true;
        }

        if (this.pickingUp) {
            const target = this.getOrCalcPickup();
            if (!target) {
                return;
            }

            if (this.creep.pos.inRangeTo(target, 1)) {
                if (target instanceof Resource) {
                    this.creep.pickup(target);
                } else {
                    this.creep.withdraw(target, RESOURCE_ENERGY);
                }
            } else {
                this.creep.moveTo(target);
            }
        } else {
            const target = this.creep.room.controller!;
            const upgrade = this.creep.upgradeController(target);
            if (upgrade === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(target);
            }
        }
    }

    private getOrCalcPickup(): Pickup | null {
        if (!this.pickup || !Game.getObjectById(this.pickup.id)) {
            const room = this.creep.room;
            if (room.storage) {
                this.pickup = room.storage;
            }
            // For lower rcl
            const dropped: Resource[] = room.find(FIND_DROPPED_RESOURCES, {
                filter: { resourceType: RESOURCE_ENERGY },
            });
            if (dropped.length > 0) {
                this.pickup = dropped[_.random(0, dropped.length - 1)];
            }
        }

        return this.pickup;
    }
}

export class UpgraderScheduler extends Scheduler {
    public initializeScheduler(opts: { [opt: string]: any }): void {}

    public set proto(proto: UpgraderSchedulerProto) {
        this.workers = _.reduce(
            proto.workers,
            (acc: { [id: string]: Worker }, p: WorkerProto) => {
                const creep = Game.creeps[p.name]!;
                acc[p.name] = new Upgrader(creep, p.work);
                return acc;
            },
            {}
        );
    }

    public spawn(): CreepSpecs {
        const rcl = this.colony.rcl;
        if (rcl === 0) {
            throw Error(
                `Room ${
                    this.colony.room!.name
                } is at level 0, maybe it's not owned`
            );
        } else if (rcl < 3) {
            const desired = rcl;
            if (this.numWorkers < desired) {
                return new CreepSpecs(
                    EARLY_UPGR_PARTS,
                    `${UPGR_PREFIX}-${Game.time}`,
                    {}
                );
            }
        }

        return CreepSpecs.empty();
    }

    public toJSON(): UpgraderSchedulerProto {
        return {
            workers: _.map(_.values(this.workers), w =>
                (w as Upgrader).toJSON()
            ),
        };
    }

    protected assignWorker(creep: Creep): void {
        this.workers[creep.name] = new Upgrader(creep, {});
    }
}

export interface UpgraderSchedulerProto {
    workers: WorkerProto[];
}
