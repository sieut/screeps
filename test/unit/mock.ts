export const Game: {
  creeps: { [name: string]: any };
  rooms: any;
  spawns: any;
  time: any;
} = {
  creeps: {},
  rooms: [],
  spawns: {},
  time: 12345
};

interface MockMemory {
  creeps: { [name: string]: any };
}

export const Memory: MockMemory = {
  creeps: {}
};

export const RawMemory: {
    _parsed: MockMemory;
} = {
    _parsed: Memory
};
