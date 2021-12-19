import { Colony } from "Colony";
import { CreepSpecs } from "creep/CreepSpecs";
import { Scheduler, Work, Worker, WorkerProto } from "./Scheduler";

const DIST_PREFIX = "VBIt";
const EARLY_DIST_PARTS = [CARRY, CARRY, MOVE];

type Pickup =
    | StructureContainer
    | StructureStorage
    | StructureTerminal
    | Resource;
type Target =
    | StructureSpawn
    | StructureExtension
    | StructureTerminal
    | StructureTower;

const TARGETS = new Set([
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
    STRUCTURE_TERMINAL,
    STRUCTURE_TOWER,
]);

export class Distributor extends Worker {
    public pickup: Pickup | null;
    private pickingUp: boolean;
    public targets: Target[];
    private next: Target | null;

    constructor(creep: Creep, work: Work, colony: Colony) {
        super(creep, work, colony);
        this.pickup = null;
        this.pickingUp = true;
        this.targets = [];
        this.next = null;
    }

    public run(): void {
        if (
            this.pickingUp &&
            this.creep.store.getUsedCapacity(RESOURCE_ENERGY) >= 50
        ) {
            this.reset();
            this.pickingUp = false;
        }
        if (
            !this.pickingUp &&
            this.creep.store.getUsedCapacity(RESOURCE_ENERGY) < 50
        ) {
            this.reset();
            this.pickingUp = true;
        }

        let target = this.pickingUp
            ? this.getOrCalcPickup()
            : this.getOrCalcNext();
        if (!target && !this.pickingUp) {
            this.pickingUp = true;
            target = this.getOrCalcPickup();
        } else if (!target && this.pickingUp) {
            return;
        }

        if (this.creep.pos.inRangeTo(target!, 1)) {
            if (this.pickingUp) {
                if (target instanceof Resource) {
                    this.creep.pickup(target);
                } else {
                    this.creep.withdraw(target!, RESOURCE_ENERGY);
                }

                this.reset();
                this.pickingUp = false;
                target = this.getOrCalcNext();
            } else {
                const amount = (target as Target).store.getFreeCapacity(
                    RESOURCE_ENERGY
                );
                const transfer = this.creep.transfer(
                    target! as Target,
                    RESOURCE_ENERGY
                );
                if (transfer === OK) {
                    this.reset();
                    const store =
                        this.creep.store.getUsedCapacity(RESOURCE_ENERGY) -
                        amount;
                    const targets = _.filter(
                        this.targets,
                        t => t.id !== target!.id
                    );
                    if (store < 50 || targets.length === 0) {
                        this.pickingUp = true;
                        target = this.getOrCalcPickup();
                    } else {
                        target = this.getOrCalcNext(targets);
                    }
                }
            }
        }

        if (target) {
            this.creep.moveTo(target);
        }
    }

    private reset(): void {
        this.pickup = null;
        this.next = null;
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

    private getOrCalcNext(targets = this.targets): Target | null {
        if (!this.next) {
            this.next = this.creep.pos.findClosestByRange(
                this.toFills(targets)
            );
        }
        return this.next;
    }

    private toFills(targets = this.targets): Target[] {
        return _.filter(
            targets,
            t => t.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
    }
}

export class DistributorScheduler extends Scheduler {
    public targets: Target[];

    constructor(colony: Colony) {
        super(colony);

        this.targets = this.colony.room!.find(FIND_STRUCTURES, {
            // @ts-ignore Don't know why it's checking types here
            filter: s => TARGETS.has(s.structureType),
        });
    }

    public initializeScheduler(opts: { [opt: string]: any }): void {}

    public set proto(proto: DistributorSchedulerProto) {
        this.workers = _.reduce(
            proto.workers,
            (acc: { [id: string]: Worker }, p: WorkerProto) => {
                const creep = Game.creeps[p.name]!;
                acc[p.name] = new Distributor(creep, p.work, this.colony);
                (acc[p.name] as Distributor).targets = this.targets;
                return acc;
            },
            {}
        );
    }

    public spawn(): CreepSpecs {
        switch (this.colony.rcl) {
            case 0:
                throw Error(
                    `Room ${
                        this.colony.room!.name
                    } is at level 0, maybe it's not owned`
                );
            default: {
                if (this.numWorkers < 1) {
                    return new CreepSpecs(
                        EARLY_DIST_PARTS,
                        `${DIST_PREFIX}-${Game.time}`,
                        {}
                    );
                } else {
                    return CreepSpecs.empty();
                }
            }
        }
    }

    public toJSON(): DistributorSchedulerProto {
        return {
            workers: _.map(_.values(this.workers), w =>
                (w as Distributor).toJSON()
            ),
        };
    }

    protected assignWorker(creep: Creep): void {
        this.workers[creep.name] = new Distributor(creep, {}, this.colony);
        (this.workers[creep.name] as Distributor).targets = this.targets;
    }
}

export interface DistributorSchedulerProto {
    workers: WorkerProto[];
}
