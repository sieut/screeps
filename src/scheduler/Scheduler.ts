import { Colony } from "Colony";
import { CreepSpecs } from "creep/CreepSpecs";
import { Pickup } from "utils/Structure";

export abstract class Scheduler {
    protected colony: Colony;
    protected workers: { [creepName: string]: Worker };
    protected spawnings: string[];

    constructor(colony: Colony) {
        this.colony = colony;
        this.workers = {};
        this.spawnings = [];
    }

    protected getWorker(name: string): Worker | null {
        return this.workers[name];
    }

    /** Logic that initializes the scheduler for new colonies **/
    public abstract initializeScheduler(opts: { [opt: string]: any }): void;
    public abstract spawn(): CreepSpecs;
    public abstract set proto(proto: any);
    public abstract toJSON(): any;
    protected abstract assignWorker(creep: Creep): void;

    /** Logic that is run every tick
     *   Returns true if memory should be updated
     **/
    public run(): boolean {
        const spawningsCount = this.spawnings.length;
        this.spawnings = _.filter(this.spawnings, creepName => {
            if (!Game.creeps[creepName]) {
                return true;
            }
            const creep = Game.creeps[creepName];
            this.assignWorker(creep);
            return false;
        });

        const workersCount = _.keys(this.workers).length;
        for (const creepName in this.workers) {
            if (!Memory.creeps[creepName]) {
                delete this.workers[creepName];
                continue;
            }

            this.workers[creepName].run();
        }

        return (
            this.spawnings.length !== spawningsCount ||
            _.keys(this.workers).length !== workersCount
        );
    }

    public spawning(specs: CreepSpecs): void {
        this.spawnings.push(specs.name);
    }

    public get numWorkers(): number {
        return _.keys(this.workers).length + this.spawnings.length;
    }
}

export abstract class Worker {
    public creepName: string;
    public work: Work;
    public colony: Colony;

    constructor(creep: Creep, work: Work, colony: Colony) {
        this.creepName = creep.name;
        this.work = work;
        this.colony = colony;
    }

    public get creep(): Creep {
        return Game.creeps[this.creepName];
    }

    public abstract run(): void;

    public toJSON(): WorkerProto {
        return {
            name: this.creepName,
            work: this.work,
        };
    }

    protected pickupResource(target: Pickup): void {
        if (this.creep.pos.inRangeTo(target, 1)) {
            if (target instanceof Resource) {
                this.creep.pickup(target);
            } else {
                this.creep.withdraw(target, RESOURCE_ENERGY);
            }
        } else {
            this.creep.moveTo(target);
        }
    }
}

export interface WorkerProto {
    name: string;
    work: Work;
}

export interface Work {}
