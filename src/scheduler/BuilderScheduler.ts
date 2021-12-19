import { Colony } from "Colony";
import { CreepSpecs } from "creep/CreepSpecs";
import { Pickup, repairPoints } from "utils/Structure";
import { Scheduler, Work, Worker, WorkerProto } from "./Scheduler";

// Scale down repair work because it's 100/tick and costs 1 energy
const REPAIR_SCALE_DOWN = 100;

const BUILDER_PREFIX = "Aerl";
const EARLY_BUILDER_PARTS = [CARRY, CARRY, WORK, MOVE, MOVE];

export class Builder extends Worker {
    private pickup: Pickup | null;
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
            const toRepair = this.creep.pos.findClosestByRange(
                FIND_STRUCTURES,
                { filter: s => repairPoints(s, this.colony) > 0 }
            );
            if (toRepair) {
                if (this.creep.repair(toRepair) === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(toRepair);
                }
                return;
            }

            const toBuild = this.colony.constructionSites;
            if (toBuild.length > 0) {
                if (this.creep.build(toBuild[0]) === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(toBuild[0]);
                }
                return;
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

export class BuilderScheduler extends Scheduler {
    public initializeScheduler(opts: { [opt: string]: any }): void {}

    public set proto(proto: BuilderSchedulerProto) {
        this.workers = _.reduce(
            proto.workers,
            (acc: { [id: string]: Worker }, p: WorkerProto) => {
                const creep = Game.creeps[p.name]!;
                acc[p.name] = new Builder(creep, p.work, this.colony);
                return acc;
            },
            {}
        );
    }

    public spawn(): CreepSpecs {
        if (this.numWorkers >= this.maxBuilders) {
            return CreepSpecs.empty();
        }

        const toBuild = _.sum(
            _.map(
                this.colony.constructionSites,
                s => s.progressTotal - s.progress
            )
        );
        // TODO update logic with remoteRooms' roads
        const toRepair = _.sum(
            _.map(this.colony.structures, s => repairPoints(s, this.colony))
        );

        const totalWork = toBuild + toRepair / REPAIR_SCALE_DOWN;
        let expected = Math.min(totalWork / 2500, this.maxBuilders);
        if (toBuild > 0) {
            expected = Math.max(expected, 1);
        }

        if (this.numWorkers >= expected) {
            return CreepSpecs.empty();
        }

        switch (this.colony.rcl) {
            case 0:
                throw Error(
                    `Room ${
                        this.colony.room!.name
                    } is at level 0, maybe it's not owned`
                );
            default:
                return new CreepSpecs(
                    EARLY_BUILDER_PARTS,
                    `${BUILDER_PREFIX}-${Game.time}`,
                    {}
                );
        }
    }

    public toJSON(): BuilderSchedulerProto {
        return {
            workers: [],
        };
    }

    protected assignWorker(creep: Creep): void {
        this.workers[creep.name] = new Builder(creep, {}, this.colony);
    }

    private get maxBuilders(): number {
        switch (this.colony.rcl) {
            case 1:
            case 2:
            case 3:
                return 1;
            case 4:
            case 5:
                return 2;
            default:
                return 3;
        }
    }
}

export interface BuilderSchedulerProto {
    workers: WorkerProto[];
}
