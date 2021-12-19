import { Colony } from "Colony";
import { CreepSpecs } from "creep/CreepSpecs";
import { Scheduler, Work, Worker, WorkerProto } from "scheduler/Scheduler";

type Target = Source | Mineral | Deposit;

const MINER_PREFIX = "NMhv";
const EARLY_MINER_PARTS = [WORK, WORK, MOVE];

export class Miner extends Worker {
    private dropContainer: StructureContainer | null;

    constructor(creep: Creep, work: MinerWork, colony: Colony) {
        super(creep, work, colony);
        this.dropContainer = Miner.lookForContainer(this.target);
    }

    private get target(): Target | null {
        return Game.getObjectById((this.work as MinerWork).targetId);
    }

    public run(): void {
        const target = this.target;
        if (!target) {
            return;
        }

        if (this.dropContainer) {
            if (!this.creep.pos.isEqualTo(this.dropContainer.pos)) {
                this.creep.moveTo(this.dropContainer, {
                    visualizePathStyle: { stroke: "#ffaa00" },
                });
            } else if (
                this.dropContainer.hits < this.dropContainer.hitsMax &&
                this.creep.store.getUsedCapacity() > 0
            ) {
                this.creep.repair(this.dropContainer);
            }
        }

        const harvest = this.creep.harvest(target);
        if (harvest === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(target, {
                visualizePathStyle: { stroke: "#ffaa00" },
            });
        }
    }

    public static lookForContainer(
        target: Target | null
    ): StructureContainer | null {
        if (!target) {
            return null;
        }
        const structs =
            target.room?.lookForAtArea(
                LOOK_STRUCTURES,
                target.pos.y - 1,
                target.pos.x - 1,
                target.pos.y + 1,
                target.pos.x + 1,
                true
            ) ?? [];
        for (const struct of structs) {
            if (
                struct.structure &&
                struct.structure.structureType === STRUCTURE_CONTAINER
            ) {
                return struct.structure as StructureContainer;
            }
        }
        return null;
    }
}

export interface MinerWork extends Work {
    targetId: string;
}

export class MinerScheduler extends Scheduler {
    public targets: Target[];

    constructor(colony: Colony) {
        super(colony);
        this.targets = [];
    }

    public initializeScheduler(opts: { [opt: string]: any }): void {
        if (!opts.roomName) {
            throw new Error(
                "Cannot initialize MinerScheduler without roomName"
            );
        }

        const room = Game.rooms[opts.roomName as string]!;
        // Only look for resources in mainRoom because this is a new colony
        const sources: Target[] = room.find(FIND_SOURCES);
        const minerals: Target[] = room.find(FIND_MINERALS);
        this.targets = sources.concat(minerals);
    }

    public set proto(proto: MinerSchedulerProto) {
        this.workers = _.reduce(
            proto.workers,
            (acc: { [id: string]: Worker }, p: WorkerProto) => {
                const creep = Game.creeps[p.name]!;
                acc[p.name] = new Miner(
                    creep,
                    p.work as MinerWork,
                    this.colony
                );
                return acc;
            },
            {}
        );
        this.targets = _.map(proto.targets, t => Game.getObjectById(t)!);
    }

    public spawn(): CreepSpecs {
        const minerByTargetId = this.getMinerByTargetId();
        switch (this.colony.rcl) {
            case 0:
                throw Error(
                    `Room ${
                        this.colony.room!.name
                    } is at level 0, maybe it's not owned`
                );
            default: {
                const needMiners = !!_.find(
                    this.targets,
                    target =>
                        target instanceof Source && !minerByTargetId[target.id]
                );
                return needMiners
                    ? new CreepSpecs(
                          EARLY_MINER_PARTS,
                          `${MINER_PREFIX}-${Game.time}`,
                          {}
                      )
                    : CreepSpecs.empty();
            }
        }
    }

    public toJSON(): MinerSchedulerProto {
        return {
            workers: _.map(_.values(this.workers), w => (w as Miner).toJSON()),
            targets: _.map(this.targets, t => t.id),
        };
    }

    protected assignWorker(creep: Creep): void {
        const work = this.assignWork(creep)!;
        this.workers[creep.name] = new Miner(creep, work, this.colony);
    }

    private assignWork(_creep: Creep): MinerWork | null {
        const rcl = this.colony.rcl;
        const targets =
            rcl >= 6
                ? this.targets
                : _.filter(this.targets, target => target instanceof Source);
        const minerByTargetId = this.getMinerByTargetId();

        for (const target of targets) {
            if (!minerByTargetId[target.id]) {
                return {
                    targetId: target.id,
                };
            }
        }

        return null;
    }

    private getMinerByTargetId(): { [targetId: string]: Miner } {
        return _.reduce(
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            _.values(this.workers) as Miner[],
            (acc: { [targetId: string]: Miner }, miner: Miner) => {
                const targetId = (miner.work as MinerWork).targetId;
                acc[targetId] = miner;
                return acc;
            },
            {}
        );
    }
}

export interface MinerSchedulerProto {
    workers: WorkerProto[];
    targets: string[];
}
