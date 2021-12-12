export class CreepSpecs {
    public parts: BodyPartConstant[];
    public name: string;
    public memory: CreepMemory;

    constructor(parts: BodyPartConstant[], name: string, memory: CreepMemory) {
        this.parts = parts;
        this.name = name;
        this.memory = memory;
    }

    public isEmpty(): boolean {
        return this.parts.length === 0;
    }

    public static empty(): CreepSpecs {
        return new CreepSpecs([], "", {});
    }
}
