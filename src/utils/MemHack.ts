class MemHack {
    private memory?: Memory;

    constructor() {
        this.memory = Memory;
        // @ts-ignore
        this.memory = RawMemory._parsed as Memory;
    }

    public pretick() {
        delete global.Memory;
        global.Memory = this.memory;
        // @ts-ignore
        RawMemory._parsed = this.memory;
    }
}

export default MemHack;
