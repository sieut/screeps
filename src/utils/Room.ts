export function roomLevel(room: Room): number {
    return room.controller?.level ?? 0;
}
