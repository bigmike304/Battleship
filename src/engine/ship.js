let shipIdCounter = 0;

export const SHIP_TYPES = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
];

export function createShip(name, length) {
  return {
    id: ++shipIdCounter,
    name,
    length,
    positions: [],
    hits: new Set(),
    isSunk: false,
  };
}

export function createFleet() {
  return SHIP_TYPES.map(type => createShip(type.name, type.length));
}

export function resetShipIdCounter() {
  shipIdCounter = 0;
}
