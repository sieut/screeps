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
    public abstract set proto(proto: any);
    /** Logic that is run every tick
     *   Returns true if memory should be updated
     **/
    public abstract run(): boolean;
    public abstract spawn(): CreepSpecs;

    public spawning(specs: CreepSpecs): void {
        this.spawnings.push(specs.name);
    }

    public abstract toJSON(): any;

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
