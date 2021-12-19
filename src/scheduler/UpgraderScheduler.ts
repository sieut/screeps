import { Colony } from "Colony";
import { CreepSpecs } from "creep/CreepSpecs";
import { Pickup } from "utils/Structure";
import { Scheduler, Work, Worker, WorkerProto } from "./Scheduler";

const UPGR_PREFIX = "MLfJ";
const EARLY_UPGR_PARTS = [WORK, CARRY, MOVE];

export class Upgrader extends Worker {
    public pickup: Pickup | null;
    private pickingUp: boolean;

    constructor(creep: Creep, work: Work, colony: Colony) {
        super(creep, work, colony);
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
            this.pickupResource(target);
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
            this.pickup = this.colony.sourcePickup;
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
                acc[p.name] = new Upgrader(creep, p.work, this.colony);
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
                if (this.numWorkers < 3) {
                    return new CreepSpecs(
                        EARLY_UPGR_PARTS,
                        `${UPGR_PREFIX}-${Game.time}`,
                        {}
                    );
                } else {
                    return CreepSpecs.empty();
                }
            }
        }
    }

    public toJSON(): UpgraderSchedulerProto {
        return {
            workers: _.map(_.values(this.workers), w =>
                (w as Upgrader).toJSON()
            ),
        };
    }

    protected assignWorker(creep: Creep): void {
        this.workers[creep.name] = new Upgrader(creep, {}, this.colony);
    }
}

export interface UpgraderSchedulerProto {
    workers: WorkerProto[];
}
