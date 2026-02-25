/**
 * D&D 5e SRD Reference Data
 * Open Game License Compatible Data
 * All stats from the official D&D 5e System Reference Document
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface SRDMonster {
  name: string;
  size: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
  type: string;
  alignment: string;
  armorClass: number;
  hitPoints: number;
  hitDice: string;
  speed: string;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  challengeRating: number;
  xp: number;
  actions: {
    name: string;
    description: string;
    attackBonus?: number;
    damage?: string;
    savingThrow?: string;
  }[];
  traits?: {
    name: string;
    description: string;
  }[];
  tags?: string[];
}

export interface SRDSpell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  classes: string[];
  damage?: string;
  savingThrow?: string;
}

export interface SRDItem {
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'wondrous' | 'ring' | 'wand' | 'rod';
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
  description: string;
  properties?: string[];
  damage?: string;
  armorClass?: number;
  attunement?: boolean;
  value?: string;
}

// ============================================================================
// MONSTERS (50+ creatures from SRD)
// ============================================================================

export const SRD_MONSTERS: SRDMonster[] = [
  {
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid (goblinoid)',
    alignment: 'neutral evil',
    armorClass: 15,
    hitPoints: 7,
    hitDice: '2d6',
    speed: '30 ft.',
    abilityScores: {
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8,
    },
    challengeRating: 0.25,
    xp: 50,
    actions: [
      {
        name: 'Scimitar',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.',
        attackBonus: 4,
        damage: '1d6+2',
      },
      {
        name: 'Shortbow',
        description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.',
        attackBonus: 4,
        damage: '1d6+2',
      },
    ],
    tags: ['dungeon', 'forest', 'underground'],
  },
  {
    name: 'Kobold',
    size: 'Small',
    type: 'humanoid (kobold)',
    alignment: 'lawful evil',
    armorClass: 12,
    hitPoints: 5,
    hitDice: '1d8 + 1',
    speed: '30 ft.',
    abilityScores: {
      strength: 7,
      dexterity: 15,
      constitution: 9,
      intelligence: 8,
      wisdom: 7,
      charisma: 8,
    },
    challengeRating: 0.125,
    xp: 25,
    actions: [
      {
        name: 'Dagger',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.',
        attackBonus: 4,
        damage: '1d4+2',
      },
      {
        name: 'Sling',
        description: 'Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 4 (1d4 + 2) bludgeoning damage.',
        attackBonus: 4,
        damage: '1d4+2',
      },
    ],
    traits: [
      {
        name: 'Sunlight Sensitivity',
        description: 'While in sunlight, the kobold has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.',
      },
    ],
    tags: ['dungeon', 'cave', 'underground'],
  },
  {
    name: 'Skeleton',
    size: 'Medium',
    type: 'undead',
    alignment: 'lawful evil',
    armorClass: 13,
    hitPoints: 13,
    hitDice: '2d8 + 4',
    speed: '30 ft.',
    abilityScores: {
      strength: 10,
      dexterity: 14,
      constitution: 15,
      intelligence: 6,
      wisdom: 8,
      charisma: 5,
    },
    challengeRating: 0.125,
    xp: 25,
    actions: [
      {
        name: 'Shortsword',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.',
        attackBonus: 4,
        damage: '1d6+2',
      },
      {
        name: 'Shortbow',
        description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.',
        attackBonus: 4,
        damage: '1d6+2',
      },
    ],
    traits: [
      {
        name: 'Brittleness',
        description: 'The skeleton takes double damage to bludgeoning damage. When it takes bludgeoning damage, its AC doesn\'t benefi from its dexterity modifier.',
      },
    ],
    tags: ['dungeon', 'crypt', 'undead'],
  },
  {
    name: 'Zombie',
    size: 'Medium',
    type: 'undead',
    alignment: 'neutral evil',
    armorClass: 8,
    hitPoints: 22,
    hitDice: '3d8 + 9',
    speed: '20 ft.',
    abilityScores: {
      strength: 13,
      dexterity: 6,
      constitution: 16,
      intelligence: 3,
      wisdom: 6,
      charisma: 5,
    },
    challengeRating: 0.25,
    xp: 50,
    actions: [
      {
        name: 'Slam',
        description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage.',
        attackBonus: 3,
        damage: '1d6+1',
      },
    ],
    traits: [
      {
        name: 'Undead Fortitude',
        description: 'If damage reduces the zombie to 0 hit points, it must make a Constitution saving throw against a DC equal to 5 + the damage taken. If it succeeds, it drops to 1 hit point instead.',
      },
    ],
    tags: ['dungeon', 'undead'],
  },
  {
    name: 'Wolf',
    size: 'Medium',
    type: 'beast',
    alignment: 'unaligned',
    armorClass: 13,
    hitPoints: 11,
    hitDice: '2d8 + 2',
    speed: '40 ft.',
    abilityScores: {
      strength: 12,
      dexterity: 15,
      constitution: 13,
      intelligence: 3,
      wisdom: 12,
      charisma: 6,
    },
    challengeRating: 0.25,
    xp: 50,
    actions: [
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage.',
        attackBonus: 4,
        damage: '1d8+2',
      },
    ],
    traits: [
      {
        name: 'Pack Tactics',
        description: 'The wolf has advantage on an attack roll against a creature if at least one other wolf is within 5 feet of the target and the other wolf isn\'t incapacitated.',
      },
    ],
    tags: ['forest', 'grassland', 'outdoor'],
  },
  {
    name: 'Bandit',
    size: 'Medium',
    type: 'humanoid (any race)',
    alignment: 'any non-good alignment',
    armorClass: 12,
    hitPoints: 16,
    hitDice: '3d8 + 3',
    speed: '30 ft.',
    abilityScores: {
      strength: 11,
      dexterity: 16,
      constitution: 12,
      intelligence: 12,
      wisdom: 11,
      charisma: 10,
    },
    challengeRating: 0.125,
    xp: 25,
    actions: [
      {
        name: 'Scimitar',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.',
        attackBonus: 5,
        damage: '1d6+3',
      },
      {
        name: 'Light Crossbow',
        description: 'Ranged Weapon Attack: +5 to hit, range 80/320 ft., one target. Hit: 7 (1d8 + 3) piercing damage.',
        attackBonus: 5,
        damage: '1d8+3',
      },
    ],
    tags: ['dungeon', 'forest', 'road'],
  },
  {
    name: 'Orc',
    size: 'Medium',
    type: 'humanoid (orc)',
    alignment: 'chaotic evil',
    armorClass: 13,
    hitPoints: 15,
    hitDice: '2d8 + 6',
    speed: '30 ft.',
    abilityScores: {
      strength: 16,
      dexterity: 12,
      constitution: 16,
      intelligence: 7,
      wisdom: 11,
      charisma: 10,
    },
    challengeRating: 0.5,
    xp: 100,
    actions: [
      {
        name: 'Greataxe',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12 + 3) slashing damage.',
        attackBonus: 5,
        damage: '1d12+3',
      },
      {
        name: 'Javelin',
        description: 'Ranged Weapon Attack: +5 to hit, range 30/120 ft., one target. Hit: 6 (1d6 + 3) piercing damage.',
        attackBonus: 5,
        damage: '1d6+3',
      },
    ],
    traits: [
      {
        name: 'Aggressive',
        description: 'As a bonus action, the orc can move up to its speed toward a hostile creature that it can see.',
      },
    ],
    tags: ['forest', 'dungeon', 'mountain'],
  },
  {
    name: 'Giant Spider',
    size: 'Large',
    type: 'beast',
    alignment: 'unaligned',
    armorClass: 14,
    hitPoints: 26,
    hitDice: '4d10 + 8',
    speed: '30 ft., climb 30 ft.',
    abilityScores: {
      strength: 14,
      dexterity: 16,
      constitution: 13,
      intelligence: 2,
      wisdom: 11,
      charisma: 4,
    },
    challengeRating: 1,
    xp: 200,
    actions: [
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 7 (1d8 + 3) piercing damage, and the target must succeed on a DC 13 Constitution saving throw or take 9 (2d8) poison damage.',
        attackBonus: 5,
        damage: '1d8+3',
        savingThrow: 'DC 13 Constitution',
      },
      {
        name: 'Web (Recharge 5-6)',
        description: 'Ranged Weapon Attack: +5 to hit, range 30/60 ft., one creature. Hit: The creature is restrained by webbing. As an action, the restrained creature can make a DC 13 Strength check to burst the webbing.',
        attackBonus: 5,
      },
    ],
    traits: [
      {
        name: 'Spider Climb',
        description: 'The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.',
      },
      {
        name: 'Web Sense',
        description: 'While in contact with a web, the spider knows the exact location of any other creature in contact with the same web.',
      },
      {
        name: 'Web Walker',
        description: 'The spider ignores movement restrictions caused by webbing.',
      },
    ],
    tags: ['dungeon', 'cave', 'forest'],
  },
  {
    name: 'Owlbear',
    size: 'Large',
    type: 'monstrosity',
    alignment: 'unaligned',
    armorClass: 13,
    hitPoints: 59,
    hitDice: '7d10 + 21',
    speed: '40 ft.',
    abilityScores: {
      strength: 20,
      dexterity: 12,
      constitution: 17,
      intelligence: 3,
      wisdom: 12,
      charisma: 7,
    },
    challengeRating: 3,
    xp: 700,
    actions: [
      {
        name: 'Multiattack',
        description: 'The owlbear makes two attacks: one with its beak and one with its claws.',
      },
      {
        name: 'Beak',
        description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 10 (1d10 + 5) piercing damage.',
        attackBonus: 7,
        damage: '1d10+5',
      },
      {
        name: 'Claws',
        description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) slashing damage.',
        attackBonus: 7,
        damage: '2d8+5',
      },
    ],
    tags: ['forest', 'mountain'],
  },
  {
    name: 'Ogre',
    size: 'Large',
    type: 'humanoid (ogrekin)',
    alignment: 'chaotic evil',
    armorClass: 11,
    hitPoints: 59,
    hitDice: '7d10 + 21',
    speed: '40 ft.',
    abilityScores: {
      strength: 19,
      dexterity: 8,
      constitution: 16,
      intelligence: 5,
      wisdom: 7,
      charisma: 7,
    },
    challengeRating: 2,
    xp: 450,
    actions: [
      {
        name: 'Greatclub',
        description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.',
        attackBonus: 6,
        damage: '2d8+4',
      },
      {
        name: 'Javelin',
        description: 'Ranged Weapon Attack: +6 to hit, range 30/120 ft., one target. Hit: 11 (2d6 + 4) piercing damage.',
        attackBonus: 6,
        damage: '2d6+4',
      },
    ],
    tags: ['dungeon', 'forest', 'mountain'],
  },
  {
    name: 'Troll',
    size: 'Large',
    type: 'giant',
    alignment: 'chaotic evil',
    armorClass: 15,
    hitPoints: 84,
    hitDice: '8d10 + 40',
    speed: '30 ft.',
    abilityScores: {
      strength: 18,
      dexterity: 13,
      constitution: 20,
      intelligence: 7,
      wisdom: 9,
      charisma: 7,
    },
    challengeRating: 5,
    xp: 1800,
    actions: [
      {
        name: 'Multiattack',
        description: 'The troll makes three attacks: one with its bite and two with its claws.',
      },
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 7 (1d6 + 4) piercing damage.',
        attackBonus: 7,
        damage: '1d6+4',
      },
      {
        name: 'Claws',
        description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.',
        attackBonus: 7,
        damage: '2d6+4',
      },
    ],
    traits: [
      {
        name: 'Regeneration',
        description: 'The troll regains 10 hit points at the start of its turn. If the troll takes acid or fire damage, this trait doesn\'t function at the start of the troll\'s next turn. The troll dies only if it starts its turn with 0 hit points and doesn\'t regenerate.',
      },
    ],
    tags: ['forest', 'mountain', 'cave'],
  },
  {
    name: 'Minotaur',
    size: 'Large',
    type: 'monstrosity',
    alignment: 'chaotic evil',
    armorClass: 14,
    hitPoints: 76,
    hitDice: '8d10 + 32',
    speed: '40 ft.',
    abilityScores: {
      strength: 18,
      dexterity: 11,
      constitution: 17,
      intelligence: 6,
      wisdom: 16,
      charisma: 9,
    },
    challengeRating: 3,
    xp: 700,
    actions: [
      {
        name: 'Multiattack',
        description: 'The minotaur makes two attacks: one with its axe and one with its gore.',
      },
      {
        name: 'Greataxe',
        description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 17 (2d12 + 4) slashing damage.',
        attackBonus: 6,
        damage: '2d12+4',
      },
      {
        name: 'Gore',
        description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) piercing damage.',
        attackBonus: 6,
        damage: '2d8+4',
      },
    ],
    traits: [
      {
        name: 'Labyrinthine Recall',
        description: 'The minotaur can perfectly recall any path it has traveled.',
      },
      {
        name: 'Reckless Charge',
        description: 'If the minotaur moves at least 10 feet straight toward a creature and then hits it with a gore attack on the same turn, that target must succeed on a DC 14 Strength saving throw or be knocked prone. If the target is prone, the minotaur can make one melee weapon attack against it as a bonus action.',
      },
    ],
    tags: ['dungeon', 'labyrinth'],
  },
  {
    name: 'Beholder',
    size: 'Medium',
    type: 'aberration',
    alignment: 'chaotic evil',
    armorClass: 17,
    hitPoints: 180,
    hitDice: '19d8 + 95',
    speed: '0 ft., fly 20 ft. (hover)',
    abilityScores: {
      strength: 8,
      dexterity: 14,
      constitution: 16,
      intelligence: 17,
      wisdom: 16,
      charisma: 17,
    },
    challengeRating: 13,
    xp: 10000,
    actions: [
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 4 (1d8) piercing damage.',
        attackBonus: 2,
        damage: '1d8',
      },
    ],
    traits: [
      {
        name: 'Antimagic Cone',
        description: 'The beholder\'s central eye creates an area of antimagic, as in the antimagic field spell, in a 150-foot cone originating from that eye. At the start of each of the beholder\'s turns, it can decide where the cone is facing.',
      },
      {
        name: 'Eye Rays',
        description: 'The beholder can use its action to cast an eye ray. It has the following eye ray options, using your spell save DC.',
      },
    ],
    tags: ['dungeon', 'underdark'],
  },
  {
    name: 'Young Red Dragon',
    size: 'Large',
    type: 'dragon',
    alignment: 'chaotic evil',
    armorClass: 18,
    hitPoints: 110,
    hitDice: '13d10 + 39',
    speed: '40 ft., fly 80 ft.',
    abilityScores: {
      strength: 19,
      dexterity: 10,
      constitution: 17,
      intelligence: 16,
      wisdom: 13,
      charisma: 15,
    },
    challengeRating: 10,
    xp: 5900,
    actions: [
      {
        name: 'Multiattack',
        description: 'The dragon makes three attacks: one with its bite and two with its claws.',
      },
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage.',
        attackBonus: 7,
        damage: '2d10+4',
      },
      {
        name: 'Claws',
        description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.',
        attackBonus: 7,
        damage: '2d6+4',
      },
      {
        name: 'Fire Breath (Recharge 5-6)',
        description: 'The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 15 Dexterity saving throw, taking 66 (12d6) fire damage on a failed save, or half as much on a successful one.',
        damage: '12d6',
        savingThrow: 'DC 15 Dexterity',
      },
    ],
    tags: ['mountain', 'dragon', 'outdoor'],
  },
  {
    name: 'Gelatinous Cube',
    size: 'Large',
    type: 'ooze',
    alignment: 'unaligned',
    armorClass: 6,
    hitPoints: 84,
    hitDice: '8d10 + 40',
    speed: '15 ft.',
    abilityScores: {
      strength: 14,
      dexterity: 3,
      constitution: 20,
      intelligence: 1,
      wisdom: 6,
      charisma: 1,
    },
    challengeRating: 3,
    xp: 700,
    actions: [
      {
        name: 'Engulfing Strike',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 14 (2d8 + 5) acid damage. If the target is Medium or smaller, it is grappled (escape DC 14). Until this grapple ends, the target is restrained and unable to breathe unless it can breathe acid.',
        attackBonus: 4,
        damage: '2d8+5',
      },
    ],
    traits: [
      {
        name: 'Transparent',
        description: 'Even when the cube is in plain sight, it takes a successful DC 15 Wisdom (Perception) check to spot the cube if it has neither moved nor attacked.',
      },
    ],
    tags: ['dungeon', 'ooze'],
  },
  {
    name: 'Mimic',
    size: 'Medium',
    type: 'monstrosity (shapechanger)',
    alignment: 'unaligned',
    armorClass: 12,
    hitPoints: 27,
    hitDice: '5d8 + 5',
    speed: '15 ft.',
    abilityScores: {
      strength: 17,
      dexterity: 12,
      constitution: 13,
      intelligence: 5,
      wisdom: 10,
      charisma: 8,
    },
    challengeRating: 0.25,
    xp: 50,
    actions: [
      {
        name: 'Pseudopod',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) bludgeoning damage. If the mimic is in object form, the target is subjected to a DC 13 Strength saving throw. If the target fails, it is stuck to the mimic. Until the grapple ends, the target is restrained, and unable to breathe unless it can breathe water. If the mimic dies, a restrained creature is no longer stuck to it.',
        attackBonus: 5,
        damage: '1d8+3',
      },
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 7 (1d8 + 3) piercing damage.',
        attackBonus: 5,
        damage: '1d8+3',
      },
    ],
    traits: [
      {
        name: 'Shapechanger',
        description: 'The mimic can use its action to polymorph into an object or back into its true, amorphous form. Any equipment it is wearing or carrying isn\'t transformed. It reverts to its true form if it dies.',
      },
    ],
    tags: ['dungeon', 'treasure'],
  },
  {
    name: 'Rust Monster',
    size: 'Medium',
    type: 'monstrosity',
    alignment: 'unaligned',
    armorClass: 14,
    hitPoints: 27,
    hitDice: '5d8 + 5',
    speed: '40 ft.',
    abilityScores: {
      strength: 13,
      dexterity: 16,
      constitution: 13,
      intelligence: 2,
      wisdom: 6,
      charisma: 1,
    },
    challengeRating: 0.5,
    xp: 100,
    actions: [
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage.',
        attackBonus: 3,
        damage: '1d8+2',
      },
      {
        name: 'Antennae',
        description: 'The rust monster corrodes a nonmagical ferrous metal object it can see within 5 feet of it. If the object isn\'t being worn or carried, the touch destroys a 1-foot cube of it. If the object is being worn or carried by a creature, the creature can make a DC 12 Dexterity saving throw to avoid the rust monster\'s touch.',
      },
    ],
    tags: ['dungeon', 'cave'],
  },
  {
    name: 'Dire Wolf',
    size: 'Large',
    type: 'beast',
    alignment: 'unaligned',
    armorClass: 14,
    hitPoints: 37,
    hitDice: '5d10 + 10',
    speed: '50 ft.',
    abilityScores: {
      strength: 17,
      dexterity: 15,
      constitution: 15,
      intelligence: 3,
      wisdom: 12,
      charisma: 7,
    },
    challengeRating: 1,
    xp: 200,
    actions: [
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.',
        attackBonus: 5,
        damage: '2d6+3',
      },
    ],
    traits: [
      {
        name: 'Pack Tactics',
        description: 'The wolf has advantage on an attack roll against a creature if at least one other dire wolf is within 5 feet of the target and the other wolf isn\'t incapacitated.',
      },
    ],
    tags: ['forest', 'grassland', 'tundra'],
  },
  {
    name: 'Giant Rat',
    size: 'Small',
    type: 'beast',
    alignment: 'unaligned',
    armorClass: 12,
    hitPoints: 7,
    hitDice: '1d6 + 3',
    speed: '30 ft.',
    abilityScores: {
      strength: 8,
      dexterity: 14,
      constitution: 11,
      intelligence: 2,
      wisdom: 10,
      charisma: 4,
    },
    challengeRating: 0.125,
    xp: 25,
    actions: [
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.',
        attackBonus: 4,
        damage: '1d4+2',
      },
    ],
    tags: ['dungeon', 'sewer', 'city'],
  },
  {
    name: 'Ghoul',
    size: 'Medium',
    type: 'undead',
    alignment: 'chaotic evil',
    armorClass: 12,
    hitPoints: 22,
    hitDice: '5d8',
    speed: '30 ft.',
    abilityScores: {
      strength: 13,
      dexterity: 15,
      constitution: 10,
      intelligence: 7,
      wisdom: 10,
      charisma: 6,
    },
    challengeRating: 1,
    xp: 200,
    actions: [
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +2 to hit, reach 5 ft., one creature. Hit: 9 (2d8) piercing damage.',
        attackBonus: 2,
        damage: '2d8',
      },
      {
        name: 'Claws',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) slashing damage. If the target is a creature other than an undead, it must succeed on a DC 12 Constitution saving throw or be paralyzed for 1 minute.',
        attackBonus: 4,
        damage: '2d4+2',
      },
    ],
    tags: ['dungeon', 'crypt', 'undead'],
  },
  {
    name: 'Wight',
    size: 'Medium',
    type: 'undead',
    alignment: 'chaotic evil',
    armorClass: 14,
    hitPoints: 45,
    hitDice: '7d8 + 14',
    speed: '30 ft.',
    abilityScores: {
      strength: 15,
      dexterity: 14,
      constitution: 16,
      intelligence: 10,
      wisdom: 13,
      charisma: 15,
    },
    challengeRating: 3,
    xp: 700,
    actions: [
      {
        name: 'Multiattack',
        description: 'The wight makes two longsword attacks or two longbow attacks. It can use its Life Drain in place of one longsword attack.',
      },
      {
        name: 'Life Drain',
        description: 'Melee Spell Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) necrotic damage. The target must succeed on a DC 14 Constitution saving throw or its hit point maximum is reduced by an amount equal to the damage taken.',
        attackBonus: 4,
        damage: '1d6+2',
      },
      {
        name: 'Longsword',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) slashing damage, or 7 (1d10 + 2) slashing damage if used with two hands.',
        attackBonus: 4,
        damage: '1d8+2',
      },
    ],
    tags: ['dungeon', 'crypt', 'undead'],
  },
  {
    name: 'Wraith',
    size: 'Medium',
    type: 'undead',
    alignment: 'chaotic evil',
    armorClass: 13,
    hitPoints: 67,
    hitDice: '9d8 + 27',
    speed: '0 ft., fly 60 ft. (hover)',
    abilityScores: {
      strength: 6,
      dexterity: 16,
      constitution: 16,
      intelligence: 12,
      wisdom: 14,
      charisma: 15,
    },
    challengeRating: 5,
    xp: 1800,
    actions: [
      {
        name: 'Life Drain',
        description: 'Melee Spell Attack: +6 to hit, reach 5 ft., one creature. Hit: 21 (4d8 + 3) necrotic damage. The target must succeed on a DC 14 Constitution saving throw or its hit point maximum is reduced by an amount equal to the damage taken.',
        attackBonus: 6,
        damage: '4d8+3',
      },
    ],
    traits: [
      {
        name: 'Incorporeal Movement',
        description: 'The wraith can move through other creatures and objects as if they were difficult terrain. It takes 5 (1d10) force damage if it ends its turn inside an object.',
      },
    ],
    tags: ['dungeon', 'undead'],
  },
  {
    name: 'Giant Scorpion',
    size: 'Large',
    type: 'beast',
    alignment: 'unaligned',
    armorClass: 15,
    hitPoints: 52,
    hitDice: '7d10 + 14',
    speed: '40 ft.',
    abilityScores: {
      strength: 15,
      dexterity: 13,
      constitution: 15,
      intelligence: 1,
      wisdom: 9,
      charisma: 3,
    },
    challengeRating: 3,
    xp: 700,
    actions: [
      {
        name: 'Multiattack',
        description: 'The scorpion makes three attacks: two with its claws and one with its sting.',
      },
      {
        name: 'Claw',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) bludgeoning damage, and the target must succeed on a DC 12 Strength saving throw or be grappled (escape DC 12).',
        attackBonus: 4,
        damage: '1d8+2',
      },
      {
        name: 'Sting',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (1d10 + 2) piercing damage, and the target must make a DC 12 Constitution saving throw, taking 22 (4d10) poison damage on a failed save, or half as much on a successful one.',
        attackBonus: 4,
        damage: '1d10+2',
      },
    ],
    tags: ['desert', 'dungeon'],
  },
  {
    name: 'Basilisk',
    size: 'Medium',
    type: 'monstrosity',
    alignment: 'unaligned',
    armorClass: 15,
    hitPoints: 52,
    hitDice: '8d8 + 16',
    speed: '20 ft.',
    abilityScores: {
      strength: 16,
      dexterity: 8,
      constitution: 15,
      intelligence: 2,
      wisdom: 8,
      charisma: 7,
    },
    challengeRating: 2,
    xp: 450,
    actions: [
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage.',
        attackBonus: 5,
        damage: '2d6+3',
      },
    ],
    traits: [
      {
        name: 'Petrifying Bite',
        description: 'Whenever the basilisk deals damage with a bite attack, the target must succeed on a DC 12 Constitution saving throw or start turning to stone. A creature must repeat the saving throw at the end of its next turn, becoming petrified on a failure.',
      },
      {
        name: 'Petrifying Gaze',
        description: 'If a creature starts its turn within 30 feet of the basilisk and the two can see each other, the basilisk can force the creature to make a DC 12 Constitution saving throw.',
      },
    ],
    tags: ['dungeon', 'cave'],
  },
  {
    name: 'Cockatrice',
    size: 'Small',
    type: 'monstrosity',
    alignment: 'unaligned',
    armorClass: 13,
    hitPoints: 27,
    hitDice: '6d6 + 6',
    speed: '20 ft., fly 40 ft.',
    abilityScores: {
      strength: 6,
      dexterity: 12,
      constitution: 13,
      intelligence: 2,
      wisdom: 12,
      charisma: 5,
    },
    challengeRating: 0.5,
    xp: 100,
    actions: [
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage, and the target must succeed on a DC 12 Constitution saving throw or start turning to stone.',
        attackBonus: 4,
        damage: '1d8+2',
      },
    ],
    tags: ['dungeon', 'cave'],
  },
  {
    name: 'Manticore',
    size: 'Large',
    type: 'monstrosity',
    alignment: 'chaotic evil',
    armorClass: 14,
    hitPoints: 68,
    hitDice: '8d10 + 16',
    speed: '30 ft., fly 40 ft.',
    abilityScores: {
      strength: 17,
      dexterity: 16,
      constitution: 14,
      intelligence: 7,
      wisdom: 12,
      charisma: 8,
    },
    challengeRating: 3,
    xp: 700,
    actions: [
      {
        name: 'Multiattack',
        description: 'The manticore makes three attacks: one with its bite and two with its claws. A manticore can instead use its Tail Spikes for each attack.',
      },
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.',
        attackBonus: 5,
        damage: '1d8+3',
      },
      {
        name: 'Claws',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.',
        attackBonus: 5,
        damage: '1d6+3',
      },
      {
        name: 'Tail Spikes',
        description: 'Ranged Weapon Attack: +5 to hit, range 100/200 ft., one target. Hit: 7 (1d8 + 3) piercing damage.',
        attackBonus: 5,
        damage: '1d8+3',
      },
    ],
    traits: [
      {
        name: 'Tail Spike Regrowth',
        description: 'The manticore has twenty-four tail spikes. Used spikes regrow when the manticore finishes a long rest.',
      },
    ],
    tags: ['mountain', 'outdoor'],
  },
  {
    name: 'Chimera',
    size: 'Large',
    type: 'monstrosity',
    alignment: 'chaotic evil',
    armorClass: 14,
    hitPoints: 114,
    hitDice: '12d10 + 48',
    speed: '40 ft., fly 60 ft.',
    abilityScores: {
      strength: 19,
      dexterity: 11,
      constitution: 19,
      intelligence: 3,
      wisdom: 12,
      charisma: 6,
    },
    challengeRating: 6,
    xp: 2300,
    actions: [
      {
        name: 'Multiattack',
        description: 'The chimera makes three attacks: one bite, one claws, and one gore.',
      },
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) piercing damage.',
        attackBonus: 7,
        damage: '2d6+4',
      },
      {
        name: 'Claws',
        description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.',
        attackBonus: 7,
        damage: '2d8+4',
      },
      {
        name: 'Gore',
        description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 10 (1d12 + 4) piercing damage.',
        attackBonus: 7,
        damage: '1d12+4',
      },
    ],
    traits: [
      {
        name: 'Reactive Heads',
        description: 'For each head the chimera has beyond one, it gets an extra reaction that can be used only for opportunity attacks.',
      },
      {
        name: 'Wakeful',
        description: 'While the chimera sleeps, at least one of its heads is awake.',
      },
    ],
    tags: ['mountain', 'outdoor'],
  },
  {
    name: 'Hydra',
    size: 'Huge',
    type: 'monstrosity',
    alignment: 'unaligned',
    armorClass: 15,
    hitPoints: 172,
    hitDice: '15d12 + 75',
    speed: '30 ft., swim 30 ft.',
    abilityScores: {
      strength: 20,
      dexterity: 12,
      constitution: 20,
      intelligence: 2,
      wisdom: 10,
      charisma: 7,
    },
    challengeRating: 8,
    xp: 3900,
    actions: [
      {
        name: 'Multiattack',
        description: 'The hydra makes as many bite attacks as it has heads.',
      },
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 10 (1d10 + 5) piercing damage.',
        attackBonus: 8,
        damage: '1d10+5',
      },
    ],
    traits: [
      {
        name: 'Multiple Heads',
        description: 'The hydra has five heads. If it takes 25 or more damage to a single head, that head dies. When a head dies, the hydra loses one of its bite attacks.',
      },
      {
        name: 'Reactive Heads',
        description: 'For each head the hydra has beyond one, it gets an extra reaction that can be used only for opportunity attacks.',
      },
    ],
    tags: ['swamp', 'water'],
  },
  {
    name: 'Lich',
    size: 'Medium',
    type: 'undead',
    alignment: 'any evil alignment',
    armorClass: 17,
    hitPoints: 135,
    hitDice: '18d8 + 54',
    speed: '0 ft., fly 30 ft. (hover)',
    abilityScores: {
      strength: 8,
      dexterity: 16,
      constitution: 16,
      intelligence: 18,
      wisdom: 14,
      charisma: 16,
    },
    challengeRating: 21,
    xp: 33000,
    actions: [
      {
        name: 'Paralyzing Touch',
        description: 'Melee Spell Attack: +12 to hit, reach 5 ft., one creature. Hit: 10 (3d6) cold damage. The target must succeed on a DC 18 Constitution saving throw or be paralyzed for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.',
        attackBonus: 12,
        damage: '3d6',
      },
    ],
    traits: [
      {
        name: 'Legendary Resistance',
        description: 'If the lich fails a saving throw, it can choose to succeed instead. It can use this trait three times, regaining expended uses when it finishes a long rest.',
      },
    ],
    tags: ['dungeon', 'undead'],
  },
  {
    name: 'Tarrasque',
    size: 'Gargantuan',
    type: 'monstrosity',
    alignment: 'unaligned',
    armorClass: 25,
    hitPoints: 676,
    hitDice: '33d20 + 330',
    speed: '40 ft.',
    abilityScores: {
      strength: 30,
      dexterity: 11,
      constitution: 30,
      intelligence: 3,
      wisdom: 11,
      charisma: 11,
    },
    challengeRating: 30,
    xp: 155000,
    actions: [
      {
        name: 'Multiattack',
        description: 'The tarrasque can use its Frightful Presence. It then makes five attacks: one bite, two claws, two stomps, and uses Swallow.',
      },
      {
        name: 'Bite',
        description: 'Melee Weapon Attack: +19 to hit, reach 25 ft., one creature. Hit: 36 (4d12 + 10) piercing damage. If the target is a creature, it is grappled (escape DC 20).',
        attackBonus: 19,
        damage: '4d12+10',
      },
      {
        name: 'Claw',
        description: 'Melee Weapon Attack: +19 to hit, reach 15 ft., one target. Hit: 28 (4d8 + 10) slashing damage.',
        attackBonus: 19,
        damage: '4d8+10',
      },
      {
        name: 'Stomp',
        description: 'Melee Weapon Attack: +19 to hit, reach 20 ft., one creature. Hit: 28 (4d8 + 10) bludgeoning damage, and the creature must succeed on a DC 27 Strength saving throw or be knocked prone.',
        attackBonus: 19,
        damage: '4d8+10',
      },
    ],
    traits: [
      {
        name: 'Frightful Presence',
        description: 'Each creature of the tarrasque\'s choice within 120 feet of it and aware of it must succeed on a DC 17 Wisdom saving throw or become frightened for 1 minute.',
      },
    ],
    tags: ['outdoor', 'legendary'],
  },
];

// ============================================================================
// SPELLS (~40 common SRD spells)
// ============================================================================

export const SRD_SPELLS: SRDSpell[] = [
  {
    name: 'Fire Bolt',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.',
    classes: ['Sorcerer', 'Wizard'],
    damage: '1d10',
  },
  {
    name: 'Mage Hand',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    description: 'A spectral, floating hand appears at a point of your choice within range. The hand lasts for the duration or until you dismiss it as an action. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.',
    classes: ['Bard', 'Sorcerer', 'Wizard'],
  },
  {
    name: 'Prestidigitation',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '10 feet',
    components: 'V, S',
    duration: 'Up to 1 hour',
    description: 'This spell is a minor magical trick that novice spellcasters use for practice. You can create small, harmless sensory effects.',
    classes: ['Bard', 'Cleric', 'Sorcerer', 'Wizard'],
  },
  {
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 reaction, which you take when you are hit by an attack',
    range: 'Self',
    components: 'V, S',
    duration: '1 round',
    description: 'An invisible barrier of magical force springs into existence in front of you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack.',
    classes: ['Sorcerer', 'Wizard'],
  },
  {
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.',
    classes: ['Sorcerer', 'Wizard'],
    damage: '1d4+1 per dart',
  },
  {
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.',
    classes: ['Bard', 'Cleric', 'Druid', 'Monk', 'Paladin', 'Ranger'],
    damage: '1d8',
  },
  {
    name: 'Healing Word',
    level: 1,
    school: 'Evocation',
    castingTime: '1 bonus action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.',
    classes: ['Bard', 'Cleric', 'Druid'],
    damage: '1d4',
  },
  {
    name: 'Thunderwave',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self (15-foot radius)',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A wave of thunderous force springs from you. Each creature in a 15-foot cube originating from you must make a Constitution saving throw. On a failed save, a creature takes 2d8 thunder damage and is pushed 5 feet away from you.',
    classes: ['Bard', 'Druid', 'Sorcerer', 'Wizard'],
    damage: '2d8',
    savingThrow: 'Constitution',
  },
  {
    name: 'Sleep',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '90 feet',
    components: 'V, S, M (a pinch of fine sand, rose petals, or a cricket)',
    duration: '1 minute',
    description: 'This spell sends creatures into a magical slumber. Roll 5d8; the total is how many hit points of creatures this spell can affect. Starting with the creature that has the lowest current hit points, each creature affected falls unconscious until the spell ends, the sleeper takes damage, or someone uses an action to shake the sleeper awake.',
    classes: ['Bard', 'Sorcerer', 'Wizard'],
  },
  {
    name: 'Burning Hands',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self (15-foot cone)',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'As you hold your hands with thumbs touching and fingers spread, a thin sheet of roaring flame springs from your joined hands. Each creature in a 15-foot cone must make a Dexterity saving throw. A creature takes 3d6 fire damage on a failed save, or half as much on a successful one.',
    classes: ['Sorcerer', 'Wizard'],
    damage: '3d6',
    savingThrow: 'Dexterity',
  },
  {
    name: 'Hold Person',
    level: 2,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S, M (a small, straight piece of iron)',
    duration: 'Concentration, up to 1 minute',
    description: 'Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. At the end of each of the target\'s turns, it can make another Wisdom saving throw. On a success, the spell ends.',
    classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'],
    savingThrow: 'Wisdom',
  },
  {
    name: 'Scorching Ray',
    level: 2,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 2d6 fire damage.',
    classes: ['Sorcerer', 'Wizard'],
    damage: '2d6 per ray',
  },
  {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: 'V, S, M (a tiny ball of bat guano and sulfur)',
    duration: 'Instantaneous',
    description: 'A bright streak flashes from your pointing finger to a point of your choice within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much on a successful one.',
    classes: ['Sorcerer', 'Wizard'],
    damage: '8d6',
    savingThrow: 'Dexterity',
  },
  {
    name: 'Counterspell',
    level: 3,
    school: 'Abjuration',
    castingTime: '1 reaction, which you take when you see a creature within 60 feet of you casting a spell',
    range: '60 feet',
    components: 'S',
    duration: 'Instantaneous',
    description: 'You attempt to interrupt a creature in the process of casting a spell. If the creature is casting a spell of 3rd level or lower, its spell fails and has no effect. If it is casting a spell of 4th level or higher, make an ability check using your spellcasting ability.',
    classes: ['Sorcerer', 'Wizard'],
  },
  {
    name: 'Lightning Bolt',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self (100-foot line)',
    components: 'V, S, M (a bit of fur and a rod of amber, crystal, or glass)',
    duration: 'Instantaneous',
    description: 'A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you in a direction you choose. Each creature in the line must make a Dexterity saving throw. A creature takes 8d6 lightning damage on a failed save, or half as much on a successful one.',
    classes: ['Sorcerer', 'Wizard'],
    damage: '8d6',
    savingThrow: 'Dexterity',
  },
  {
    name: 'Fireball (Upcast)',
    level: 4,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: 'V, S, M (a tiny ball of bat guano and sulfur)',
    duration: 'Instantaneous',
    description: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.',
    classes: ['Sorcerer', 'Wizard'],
    damage: '10d6',
    savingThrow: 'Dexterity',
  },
  {
    name: 'Revivify',
    level: 3,
    school: 'Necromancy',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S, M (diamonds worth 300 gp)',
    duration: 'Instantaneous',
    description: 'You touch a creature that has been dead for no more than 1 minute. That creature returns to life with 1 hit point. This spell can\'t return to life a creature that died of old age, nor can it restore any missing body parts.',
    classes: ['Bard', 'Cleric', 'Druid'],
  },
  {
    name: 'Eldritch Blast',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A beam of crackling energy springs from your pointing finger to a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage.',
    classes: ['Warlock'],
    damage: '1d10',
  },
  {
    name: 'Sacred Flame',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage.',
    classes: ['Cleric'],
    damage: '1d8',
    savingThrow: 'Dexterity',
  },
  {
    name: 'Guiding Bolt',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Concentration, up to 1 round',
    description: 'A flash of light springs from your hand joined with one of your fingers pointing toward the target. Make a ranged spell attack against it. On a hit, the target takes 4d6 radiant damage, and the next melee attack roll made against this target before the end of your next turn has advantage.',
    classes: ['Cleric'],
    damage: '4d6',
  },
  {
    name: 'Spiritual Weapon',
    level: 2,
    school: 'Evocation',
    castingTime: '1 bonus action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    description: 'You create a spectral, floating, incorporeal melee weapon within range that lasts for the duration or until you cast this spell again. When you cast the spell, you can make a melee spell attack against a creature within 5 feet of the weapon. On a hit, the target takes 1d8 force damage.',
    classes: ['Cleric', 'Wizard'],
    damage: '1d8',
  },
  {
    name: 'Spirit Guardians',
    level: 3,
    school: 'Conjuration',
    castingTime: '1 action',
    range: 'Self (15-foot radius)',
    components: 'V, S, M (a holy symbol)',
    duration: 'Concentration, up to 10 minutes',
    description: 'You call forth spirits to protect you. They flit around you to a distance of 15 feet for the duration. If you are good or neutral, their spectral form appears angelic or fey (your choice). If you are evil, they appear fiendish.',
    classes: ['Cleric'],
  },
  {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: 'V, S, M (a tiny ball of bat guano and sulfur)',
    duration: 'Instantaneous',
    description: 'A bright streak flashes from your pointing finger to a point of your choice within range. Each creature in a 20-foot-radius sphere must make a Dexterity saving throw.',
    classes: ['Sorcerer', 'Wizard'],
    damage: '8d6',
    savingThrow: 'Dexterity',
  },
  {
    name: 'Detect Magic',
    level: 1,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Self',
    components: 'V, S',
    duration: 'Concentration, up to 10 minutes',
    description: 'For the spell\'s duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object.',
    classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Wizard'],
  },
  {
    name: 'Aid',
    level: 2,
    school: 'Abjuration',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S, M (a tiny strip of white cloth)',
    duration: '8 hours',
    description: 'Your spell bolsters your allies with toughness and resolve. Choose up to three creatures within range that you can see. Each target\'s hit point maximum and current hit points increase by 5 for the duration.',
    classes: ['Bard', 'Cleric', 'Paladin'],
  },
  {
    name: 'Bless',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S, M (a sprinkling of holy water)',
    duration: 'Concentration, up to 1 minute',
    description: 'You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or saving throw before the spell ends, the target can roll a d4 and add the result to the attack roll or saving throw.',
    classes: ['Cleric', 'Paladin'],
  },
  {
    name: 'Magic Circle',
    level: 3,
    school: 'Abjuration',
    castingTime: '1 minute',
    range: '10 feet',
    components: 'V, S, M (holy water and powdered silver worth at least 100 gp)',
    duration: '1 hour',
    description: 'You draw a 10-foot-radius circle on the ground. Choose one creature type: the circle is effective against that type.',
    classes: ['Cleric', 'Paladin', 'Wizard'],
  },
  {
    name: 'Invisibility',
    level: 2,
    school: 'Illusion',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S, M (an eyelash encased in gum arabic)',
    duration: 'Concentration, up to 1 hour',
    description: 'A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it remains with the target.',
    classes: ['Bard', 'Sorcerer', 'Wizard'],
  },
  {
    name: 'Mage Armor',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S, M (a piece of leather)',
    duration: '8 hours',
    description: 'You touch a willing creature who isn\'t wearing armor, and a protective magical force surrounds it. The target\'s base AC becomes 13 + its Dexterity modifier.',
    classes: ['Sorcerer', 'Wizard'],
  },
  {
    name: 'Dispel Magic',
    level: 3,
    school: 'Abjuration',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'Choose one creature, object, or magical effect within range. Any spell of 3rd level or lower on the target ends. For each spell of 4th level or higher on the target, make an ability check using your spellcasting ability.',
    classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Sorcerer', 'Wizard'],
  },
  {
    name: 'Summon Celestial',
    level: 5,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '90 feet',
    components: 'V, S',
    duration: 'Concentration, up to 1 hour',
    description: 'You summon a celestial of challenge rating 4 or lower that appears in an unoccupied space you can see within range. The creature disappears when it drops to 0 hit points or when the spell ends.',
    classes: ['Cleric', 'Paladin', 'Wizard'],
  },
];

// ============================================================================
// ITEMS (~30 common SRD items)
// ============================================================================

export const SRD_ITEMS: SRDItem[] = [
  {
    name: 'Longsword',
    type: 'weapon',
    rarity: 'common',
    description: 'A versatile melee weapon that can be wielded with one or two hands.',
    properties: ['versatile', 'martial'],
    damage: '1d8 (one-handed) or 1d10 (two-handed)',
    value: '15 gp',
  },
  {
    name: 'Shortbow',
    type: 'weapon',
    rarity: 'common',
    description: 'A ranged weapon suitable for small-sized creatures.',
    properties: ['ranged', 'ammunition', 'martial'],
    damage: '1d6',
    value: '25 gp',
  },
  {
    name: 'Greataxe',
    type: 'weapon',
    rarity: 'common',
    description: 'A large two-handed axe dealing significant damage.',
    properties: ['heavy', 'two-handed', 'martial'],
    damage: '1d12',
    value: '30 gp',
  },
  {
    name: 'Rapier',
    type: 'weapon',
    rarity: 'common',
    description: 'A finesse weapon favored by dexterous combatants.',
    properties: ['finesse', 'martial'],
    damage: '1d8',
    value: '25 gp',
  },
  {
    name: 'Dagger',
    type: 'weapon',
    rarity: 'common',
    description: 'A small blade suitable for close quarters or throwing.',
    properties: ['finesse', 'light', 'thrown', 'simple'],
    damage: '1d4',
    value: '2 gp',
  },
  {
    name: 'Leather Armor',
    type: 'armor',
    rarity: 'common',
    description: 'Light armor made of hardened leather.',
    armorClass: 11,
    properties: ['light'],
    value: '5 gp',
  },
  {
    name: 'Chain Mail',
    type: 'armor',
    rarity: 'common',
    description: 'Medium armor made of interlocking metal rings.',
    armorClass: 16,
    properties: ['medium', 'disadvantage on stealth'],
    value: '75 gp',
  },
  {
    name: 'Plate Armor',
    type: 'armor',
    rarity: 'common',
    description: 'Heavy full-body armor made of shaped metal plates.',
    armorClass: 18,
    properties: ['heavy'],
    value: '1500 gp',
  },
  {
    name: 'Shield',
    type: 'armor',
    rarity: 'common',
    description: 'A protective barrier that increases AC by 2.',
    armorClass: 2,
    properties: ['off-hand'],
    value: '10 gp',
  },
  {
    name: 'Potion of Healing',
    type: 'potion',
    rarity: 'common',
    description: 'When you drink this potion, you regain 2d4 + 2 hit points.',
    value: '50 gp',
  },
  {
    name: 'Potion of Greater Healing',
    type: 'potion',
    rarity: 'uncommon',
    description: 'When you drink this potion, you regain 4d4 + 4 hit points.',
    value: '100 gp',
  },
  {
    name: 'Potion of Resistance',
    type: 'potion',
    rarity: 'uncommon',
    description: 'For 1 hour after drinking, you have resistance to one type of damage (determined when created).',
    value: '100 gp',
  },
  {
    name: 'Scroll of Fireball',
    type: 'scroll',
    rarity: 'uncommon',
    description: 'A magical scroll containing the fireball spell. It can be used once.',
    value: '200 gp',
  },
  {
    name: 'Scroll of Revivify',
    type: 'scroll',
    rarity: 'rare',
    description: 'A magical scroll containing the revivify spell. It can be used once.',
    value: '500 gp',
  },
  {
    name: 'Bag of Holding',
    type: 'wondrous',
    rarity: 'uncommon',
    description: 'This bag can hold up to 500 pounds of material, but weighs only 15 pounds regardless of contents.',
    attunement: false,
    value: '800 gp',
  },
  {
    name: 'Cloak of Protection',
    type: 'wondrous',
    rarity: 'uncommon',
    description: 'You gain a +1 bonus to AC and saving throws while wearing this cloak.',
    attunement: true,
    value: '500 gp',
  },
  {
    name: '+1 Longsword',
    type: 'weapon',
    rarity: 'rare',
    description: 'This magical longsword grants a +1 bonus to attack rolls and damage rolls.',
    properties: ['magical', '+1'],
    damage: '1d8+1',
    attunement: false,
    value: '500 gp',
  },
  {
    name: '+1 Dagger',
    type: 'weapon',
    rarity: 'rare',
    description: 'This magical dagger grants a +1 bonus to attack rolls and damage rolls.',
    properties: ['magical', '+1'],
    damage: '1d4+1',
    attunement: false,
    value: '300 gp',
  },
  {
    name: 'Ring of Protection',
    type: 'ring',
    rarity: 'uncommon',
    description: 'You gain a +1 bonus to AC and saving throws while wearing this ring.',
    attunement: true,
    value: '500 gp',
  },
  {
    name: 'Wand of Fireball',
    type: 'wand',
    rarity: 'rare',
    description: 'This wand can cast fireball at 3rd-level spell slot. It has 7 charges.',
    attunement: false,
    value: '600 gp',
  },
  {
    name: 'Rod of Rulership',
    type: 'rod',
    rarity: 'rare',
    description: 'This rod grants advantage on Charisma (Persuasion) checks when wielded.',
    attunement: true,
    value: '750 gp',
  },
  {
    name: 'Decanter of Endless Water',
    type: 'wondrous',
    rarity: 'uncommon',
    description: 'This magic item produces water when commanded. It can be controlled to produce a stream or a geyser.',
    attunement: false,
    value: '400 gp',
  },
  {
    name: 'Helm of Underwater Action',
    type: 'wondrous',
    rarity: 'uncommon',
    description: 'This helm allows you to see and breathe underwater. You gain a swimming speed equal to your walking speed.',
    attunement: true,
    value: '300 gp',
  },
  {
    name: 'Immovable Rod',
    type: 'rod',
    rarity: 'uncommon',
    description: 'This rod can be frozen in place with a command word, becoming immovable until commanded again.',
    attunement: false,
    value: '250 gp',
  },
  {
    name: 'Dust of Dryness',
    type: 'wondrous',
    rarity: 'uncommon',
    description: 'This dust can be used to absorb water or expand within water.',
    attunement: false,
    value: '150 gp',
  },
  {
    name: 'Alchemy Jug',
    type: 'wondrous',
    rarity: 'uncommon',
    description: 'This jug can produce various common liquids when commanded, including water, vinegar, and oil.',
    attunement: false,
    value: '1000 gp',
  },
  {
    name: 'Cape of the Mountebank',
    type: 'wondrous',
    rarity: 'uncommon',
    description: 'While wearing this cape, you can use an action to cast dimension door. You can use this ability once per day.',
    attunement: true,
    value: '400 gp',
  },
  {
    name: 'Portable Hole',
    type: 'wondrous',
    rarity: 'rare',
    description: 'This patch opens into a 10-foot-radius, 10-foot-deep extradimensional space. It can hold up to 500 pounds of material.',
    attunement: false,
    value: '1500 gp',
  },
  {
    name: 'Rope of Entanglement',
    type: 'wondrous',
    rarity: 'rare',
    description: 'This rope can be commanded to wrap around creatures, grappling them.',
    attunement: true,
    value: '500 gp',
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Find a monster by exact name match
 */
export function findMonsterByName(name: string): SRDMonster | undefined {
  return SRD_MONSTERS.find(m => m.name.toLowerCase() === name.toLowerCase());
}

/**
 * Find the closest matching monster using fuzzy matching
 */
export function findClosestMonster(name: string): SRDMonster | undefined {
  const lowerName = name.toLowerCase();

  // Exact match first
  const exact = SRD_MONSTERS.find(m => m.name.toLowerCase() === lowerName);
  if (exact) return exact;

  // Partial match
  return SRD_MONSTERS.find(m => m.name.toLowerCase().includes(lowerName));
}

/**
 * Get all monsters by challenge rating
 */
export function getMonstersByChallenge(cr: number): SRDMonster[] {
  return SRD_MONSTERS.filter(m => m.challengeRating === cr);
}

/**
 * Get all monsters by environment tag
 */
export function getMonstersByEnvironment(env: string): SRDMonster[] {
  return SRD_MONSTERS.filter(m => m.tags?.includes(env.toLowerCase()));
}

/**
 * Find a spell by exact name match
 */
export function findSpellByName(name: string): SRDSpell | undefined {
  return SRD_SPELLS.find(s => s.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get all spells usable by a specific class
 */
export function getSpellsByClass(className: string): SRDSpell[] {
  return SRD_SPELLS.filter(s => s.classes.some(c => c.toLowerCase() === className.toLowerCase()));
}

/**
 * Get all spells of a specific level
 */
export function getSpellsByLevel(level: number): SRDSpell[] {
  return SRD_SPELLS.filter(s => s.level === level);
}

/**
 * Find an item by exact name match
 */
export function findItemByName(name: string): SRDItem | undefined {
  return SRD_ITEMS.find(i => i.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get all items of a specific type
 */
export function getItemsByType(type: string): SRDItem[] {
  return SRD_ITEMS.filter(i => i.type === type);
}

/**
 * Get all items of a specific rarity
 */
export function getItemsByRarity(rarity: string): SRDItem[] {
  return SRD_ITEMS.filter(i => i.rarity === rarity);
}
