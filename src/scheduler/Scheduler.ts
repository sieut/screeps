import { Colony } from "Colony";
import { CreepSpecs } from "creep/CreepSpecs";

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

    constructor(creep: Creep, work: Work) {
        this.creepName = creep.name;
        this.work = work;
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
}

export interface WorkerProto {
    name: string;
    work: Work;
}

export interface Work {}
