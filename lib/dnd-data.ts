import { getAbilityModifier } from './utils';

/**
 * D&D 5e SRD Reference Data for Character Creation
 * Comprehensive race, class, background, and mechanics data.
 */

// ─── Types ────────────────────────────────────────────────────────

export type AbilityName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export interface RaceData {
  id: string;
  name: string;
  description: string;
  abilityBonuses: Partial<Record<AbilityName, number>>;
  /** Some races let you choose where to put +1 or +2 */
  bonusChoices?: { count: number; amount: number; from: AbilityName[] };
  speed: number;
  size: 'Small' | 'Medium';
  traits: string[];
  languages: string[];
}

export interface ClassData {
  id: string;
  name: string;
  hitDie: number;
  primaryAbility: AbilityName;
  description: string;
  savingThrows: AbilityName[];
  /** Skills the player can pick from */
  skillChoices: string[];
  /** How many skills to pick */
  numSkillChoices: number;
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  startingEquipment: string[];
  spellcastingAbility?: AbilityName;
}

export interface BackgroundData {
  id: string;
  name: string;
  description: string;
  skills: string[];
  toolProficiencies: string[];
  languages: number; // number of extra languages
  equipment: string[];
  feature: string;
}

// ─── Races ────────────────────────────────────────────────────────

export const DND_RACES: RaceData[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Versatile and adaptable',
    abilityBonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Extra Language'],
    languages: ['Common', 'One extra'],
  },
  {
    id: 'high-elf',
    name: 'High Elf',
    description: 'Magical aptitude and keen senses',
    abilityBonuses: { dexterity: 2, intelligence: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance', 'Elf Weapon Training', 'Cantrip'],
    languages: ['Common', 'Elvish', 'One extra'],
  },
  {
    id: 'wood-elf',
    name: 'Wood Elf',
    description: 'Swift and stealthy forest dwellers',
    abilityBonuses: { dexterity: 2, wisdom: 1 },
    speed: 35,
    size: 'Medium',
    traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance', 'Elf Weapon Training', 'Fleet of Foot', 'Mask of the Wild'],
    languages: ['Common', 'Elvish'],
  },
  {
    id: 'dark-elf',
    name: 'Drow',
    description: 'Subterranean elves with innate magic',
    abilityBonuses: { dexterity: 2, charisma: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Superior Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance', 'Sunlight Sensitivity', 'Drow Magic', 'Drow Weapon Training'],
    languages: ['Common', 'Elvish'],
  },
  {
    id: 'hill-dwarf',
    name: 'Hill Dwarf',
    description: 'Wise, tough, and deeply connected to the earth',
    abilityBonuses: { constitution: 2, wisdom: 1 },
    speed: 25,
    size: 'Medium',
    traits: ['Darkvision', 'Dwarven Resilience', 'Dwarven Combat Training', 'Stonecunning', 'Dwarven Toughness'],
    languages: ['Common', 'Dwarvish'],
  },
  {
    id: 'mountain-dwarf',
    name: 'Mountain Dwarf',
    description: 'Strong and armored warriors',
    abilityBonuses: { constitution: 2, strength: 2 },
    speed: 25,
    size: 'Medium',
    traits: ['Darkvision', 'Dwarven Resilience', 'Dwarven Combat Training', 'Stonecunning', 'Dwarven Armor Training'],
    languages: ['Common', 'Dwarvish'],
  },
  {
    id: 'lightfoot-halfling',
    name: 'Lightfoot Halfling',
    description: 'Stealthy and social small folk',
    abilityBonuses: { dexterity: 2, charisma: 1 },
    speed: 25,
    size: 'Small',
    traits: ['Lucky', 'Brave', 'Halfling Nimbleness', 'Naturally Stealthy'],
    languages: ['Common', 'Halfling'],
  },
  {
    id: 'stout-halfling',
    name: 'Stout Halfling',
    description: 'Hardy and poison-resistant small folk',
    abilityBonuses: { dexterity: 2, constitution: 1 },
    speed: 25,
    size: 'Small',
    traits: ['Lucky', 'Brave', 'Halfling Nimbleness', 'Stout Resilience'],
    languages: ['Common', 'Halfling'],
  },
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    description: 'Proud warriors with draconic heritage',
    abilityBonuses: { strength: 2, charisma: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
    languages: ['Common', 'Draconic'],
  },
  {
    id: 'rock-gnome',
    name: 'Rock Gnome',
    description: 'Clever inventors with a knack for illusion',
    abilityBonuses: { intelligence: 2, constitution: 1 },
    speed: 25,
    size: 'Small',
    traits: ['Darkvision', 'Gnome Cunning', "Artificer's Lore", 'Tinker'],
    languages: ['Common', 'Gnomish'],
  },
  {
    id: 'forest-gnome',
    name: 'Forest Gnome',
    description: 'Nature-loving gnomes with minor illusion',
    abilityBonuses: { intelligence: 2, dexterity: 1 },
    speed: 25,
    size: 'Small',
    traits: ['Darkvision', 'Gnome Cunning', 'Natural Illusionist', 'Speak with Small Beasts'],
    languages: ['Common', 'Gnomish'],
  },
  {
    id: 'half-elf',
    name: 'Half-Elf',
    description: 'Charismatic diplomats with elven grace',
    abilityBonuses: { charisma: 2 },
    bonusChoices: { count: 2, amount: 1, from: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom'] },
    speed: 30,
    size: 'Medium',
    traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
    languages: ['Common', 'Elvish', 'One extra'],
  },
  {
    id: 'half-orc',
    name: 'Half-Orc',
    description: 'Strong and fierce warriors',
    abilityBonuses: { strength: 2, constitution: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Darkvision', 'Menacing', 'Relentless Endurance', 'Savage Attacks'],
    languages: ['Common', 'Orc'],
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    description: 'Cunning beings with infernal bloodline',
    abilityBonuses: { charisma: 2, intelligence: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
    languages: ['Common', 'Infernal'],
  },
  {
    id: 'aasimar',
    name: 'Aasimar',
    description: 'Celestial heritage with healing light',
    abilityBonuses: { charisma: 2, wisdom: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Darkvision', 'Celestial Resistance', 'Healing Hands', 'Light Bearer'],
    languages: ['Common', 'Celestial'],
  },
  {
    id: 'goliath',
    name: 'Goliath',
    description: 'Mountain-dwelling giants of great endurance',
    abilityBonuses: { strength: 2, constitution: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Natural Athlete', "Stone's Endurance", 'Powerful Build', 'Mountain Born'],
    languages: ['Common', 'Giant'],
  },
  {
    id: 'tabaxi',
    name: 'Tabaxi',
    description: 'Curious feline humanoids',
    abilityBonuses: { dexterity: 2, charisma: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Darkvision', 'Feline Agility', "Cat's Claws", "Cat's Talent"],
    languages: ['Common', 'One extra'],
  },
  {
    id: 'kenku',
    name: 'Kenku',
    description: 'Raven-like mimics cursed to copy',
    abilityBonuses: { dexterity: 2, wisdom: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Expert Forgery', 'Kenku Training', 'Mimicry'],
    languages: ['Common', 'Auran'],
  },
  {
    id: 'triton',
    name: 'Triton',
    description: 'Noble ocean dwellers and guardians',
    abilityBonuses: { strength: 1, constitution: 1, charisma: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Amphibious', 'Control Air and Water', 'Emissary of the Sea', 'Guardians of the Depths'],
    languages: ['Common', 'Primordial'],
  },
  {
    id: 'firbolg',
    name: 'Firbolg',
    description: 'Gentle forest guardians with fey magic',
    abilityBonuses: { wisdom: 2, strength: 1 },
    speed: 30,
    size: 'Medium',
    traits: ['Firbolg Magic', 'Hidden Step', 'Powerful Build', 'Speech of Beast and Leaf'],
    languages: ['Common', 'Elvish', 'Giant'],
  },
];

// ─── Classes ──────────────────────────────────────────────────────

export const DND_CLASSES: ClassData[] = [
  {
    id: 'barbarian',
    name: 'Barbarian',
    hitDie: 12,
    primaryAbility: 'strength',
    description: 'Fierce warriors fueled by primal rage',
    savingThrows: ['strength', 'constitution'],
    skillChoices: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    numSkillChoices: 2,
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    toolProficiencies: [],
    startingEquipment: ['Greataxe', 'Two handaxes', "Explorer's pack", 'Four javelins'],
  },
  {
    id: 'bard',
    name: 'Bard',
    hitDie: 8,
    primaryAbility: 'charisma',
    description: 'Magical performers and inspiring storytellers',
    savingThrows: ['dexterity', 'charisma'],
    skillChoices: ['acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival'],
    numSkillChoices: 3,
    armorProficiencies: ['Light armor'],
    weaponProficiencies: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    toolProficiencies: ['Three musical instruments'],
    startingEquipment: ['Rapier', 'Leather armor', 'Dagger', "Diplomat's pack", 'Lute'],
    spellcastingAbility: 'charisma',
  },
  {
    id: 'cleric',
    name: 'Cleric',
    hitDie: 8,
    primaryAbility: 'wisdom',
    description: 'Divine spellcasters empowered by their deity',
    savingThrows: ['wisdom', 'charisma'],
    skillChoices: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    numSkillChoices: 2,
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields'],
    weaponProficiencies: ['Simple weapons'],
    toolProficiencies: [],
    startingEquipment: ['Mace', 'Scale mail', 'Light crossbow and 20 bolts', 'Shield', "Priest's pack", 'Holy symbol'],
    spellcastingAbility: 'wisdom',
  },
  {
    id: 'druid',
    name: 'Druid',
    hitDie: 8,
    primaryAbility: 'wisdom',
    description: 'Nature magic wielder and shapeshifter',
    savingThrows: ['intelligence', 'wisdom'],
    skillChoices: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    numSkillChoices: 2,
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields (non-metal)'],
    weaponProficiencies: ['Clubs', 'Daggers', 'Darts', 'Javelins', 'Maces', 'Quarterstaffs', 'Scimitars', 'Sickles', 'Slings', 'Spears'],
    toolProficiencies: ['Herbalism kit'],
    startingEquipment: ['Wooden shield', 'Scimitar', 'Leather armor', "Explorer's pack", 'Druidic focus'],
    spellcastingAbility: 'wisdom',
  },
  {
    id: 'fighter',
    name: 'Fighter',
    hitDie: 10,
    primaryAbility: 'strength',
    description: 'Versatile martial combat masters',
    savingThrows: ['strength', 'constitution'],
    skillChoices: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    numSkillChoices: 2,
    armorProficiencies: ['All armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    toolProficiencies: [],
    startingEquipment: ['Chain mail', 'Martial weapon and shield', 'Light crossbow and 20 bolts', "Dungeoneer's pack"],
  },
  {
    id: 'monk',
    name: 'Monk',
    hitDie: 8,
    primaryAbility: 'dexterity',
    description: 'Martial artists harnessing ki energy',
    savingThrows: ['strength', 'dexterity'],
    skillChoices: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    numSkillChoices: 2,
    armorProficiencies: [],
    weaponProficiencies: ['Simple weapons', 'Shortswords'],
    toolProficiencies: ["One artisan's tool or musical instrument"],
    startingEquipment: ['Shortsword', "Dungeoneer's pack", '10 darts'],
  },
  {
    id: 'paladin',
    name: 'Paladin',
    hitDie: 10,
    primaryAbility: 'strength',
    description: 'Holy warriors bound by a sacred oath',
    savingThrows: ['wisdom', 'charisma'],
    skillChoices: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    numSkillChoices: 2,
    armorProficiencies: ['All armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    toolProficiencies: [],
    startingEquipment: ['Martial weapon and shield', 'Five javelins', "Priest's pack", 'Chain mail', 'Holy symbol'],
    spellcastingAbility: 'charisma',
  },
  {
    id: 'ranger',
    name: 'Ranger',
    hitDie: 10,
    primaryAbility: 'dexterity',
    description: 'Skilled wilderness hunters and trackers',
    savingThrows: ['strength', 'dexterity'],
    skillChoices: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    numSkillChoices: 3,
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    toolProficiencies: [],
    startingEquipment: ['Scale mail', 'Two shortswords', "Dungeoneer's pack", 'Longbow and 20 arrows'],
    spellcastingAbility: 'wisdom',
  },
  {
    id: 'rogue',
    name: 'Rogue',
    hitDie: 8,
    primaryAbility: 'dexterity',
    description: 'Cunning tricksters, scouts, and assassins',
    savingThrows: ['dexterity', 'intelligence'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'],
    numSkillChoices: 4,
    armorProficiencies: ['Light armor'],
    weaponProficiencies: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    toolProficiencies: ["Thieves' tools"],
    startingEquipment: ['Rapier', 'Shortbow and 20 arrows', "Burglar's pack", 'Leather armor', "Two daggers", "Thieves' tools"],
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    hitDie: 6,
    primaryAbility: 'charisma',
    description: 'Innate spellcasters with raw magical power',
    savingThrows: ['constitution', 'charisma'],
    skillChoices: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    numSkillChoices: 2,
    armorProficiencies: [],
    weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    toolProficiencies: [],
    startingEquipment: ['Light crossbow and 20 bolts', 'Arcane focus', "Dungeoneer's pack", 'Two daggers'],
    spellcastingAbility: 'charisma',
  },
  {
    id: 'warlock',
    name: 'Warlock',
    hitDie: 8,
    primaryAbility: 'charisma',
    description: 'Pact-bound wielders of eldritch power',
    savingThrows: ['wisdom', 'charisma'],
    skillChoices: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    numSkillChoices: 2,
    armorProficiencies: ['Light armor'],
    weaponProficiencies: ['Simple weapons'],
    toolProficiencies: [],
    startingEquipment: ['Light crossbow and 20 bolts', 'Arcane focus', "Scholar's pack", 'Leather armor', 'Any simple weapon', 'Two daggers'],
    spellcastingAbility: 'charisma',
  },
  {
    id: 'wizard',
    name: 'Wizard',
    hitDie: 6,
    primaryAbility: 'intelligence',
    description: 'Scholarly masters of arcane knowledge',
    savingThrows: ['intelligence', 'wisdom'],
    skillChoices: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    numSkillChoices: 2,
    armorProficiencies: [],
    weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    toolProficiencies: [],
    startingEquipment: ['Quarterstaff', 'Arcane focus', "Scholar's pack", 'Spellbook'],
    spellcastingAbility: 'intelligence',
  },
  {
    id: 'artificer',
    name: 'Artificer',
    hitDie: 8,
    primaryAbility: 'intelligence',
    description: 'Magical inventors who infuse items with power',
    savingThrows: ['constitution', 'intelligence'],
    skillChoices: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleightOfHand'],
    numSkillChoices: 2,
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields'],
    weaponProficiencies: ['Simple weapons'],
    toolProficiencies: ["Thieves' tools", "Tinker's tools", "One artisan's tool"],
    startingEquipment: ['Any two simple weapons', 'Light crossbow and 20 bolts', 'Studded leather armor', "Thieves' tools", "Dungeoneer's pack"],
    spellcastingAbility: 'intelligence',
  },
];

// ─── Backgrounds ──────────────────────────────────────────────────

export const DND_BACKGROUNDS: BackgroundData[] = [
  {
    id: 'acolyte',
    name: 'Acolyte',
    description: 'Temple servant devoted to a higher power',
    skills: ['insight', 'religion'],
    toolProficiencies: [],
    languages: 2,
    equipment: ['Holy symbol', 'Prayer book', '5 sticks of incense', 'Vestments', 'Common clothes', '15 gp'],
    feature: 'Shelter of the Faithful',
  },
  {
    id: 'charlatan',
    name: 'Charlatan',
    description: 'Smooth-talking con artist',
    skills: ['deception', 'sleightOfHand'],
    toolProficiencies: ['Disguise kit', 'Forgery kit'],
    languages: 0,
    equipment: ['Fine clothes', 'Disguise kit', 'Con tools', '15 gp'],
    feature: 'False Identity',
  },
  {
    id: 'criminal',
    name: 'Criminal',
    description: 'Experienced outlaw and underworld contact',
    skills: ['deception', 'stealth'],
    toolProficiencies: ["Thieves' tools", 'One gaming set'],
    languages: 0,
    equipment: ['Crowbar', 'Dark common clothes with hood', '15 gp'],
    feature: 'Criminal Contact',
  },
  {
    id: 'entertainer',
    name: 'Entertainer',
    description: 'Crowd-pleasing performer',
    skills: ['acrobatics', 'performance'],
    toolProficiencies: ['Disguise kit', 'One musical instrument'],
    languages: 0,
    equipment: ['Musical instrument', 'Favor of an admirer', 'Costume', '15 gp'],
    feature: 'By Popular Demand',
  },
  {
    id: 'folk-hero',
    name: 'Folk Hero',
    description: 'Champion of the common people',
    skills: ['animalHandling', 'survival'],
    toolProficiencies: ["One artisan's tools", 'Vehicles (land)'],
    languages: 0,
    equipment: ["Artisan's tools", 'Shovel', 'Iron pot', 'Common clothes', '10 gp'],
    feature: 'Rustic Hospitality',
  },
  {
    id: 'guild-artisan',
    name: 'Guild Artisan',
    description: 'Skilled craftsperson and guild member',
    skills: ['insight', 'persuasion'],
    toolProficiencies: ["One artisan's tools"],
    languages: 1,
    equipment: ["Artisan's tools", 'Letter of introduction from guild', "Traveler's clothes", '15 gp'],
    feature: 'Guild Membership',
  },
  {
    id: 'hermit',
    name: 'Hermit',
    description: 'Recluse who lived in seclusion',
    skills: ['medicine', 'religion'],
    toolProficiencies: ['Herbalism kit'],
    languages: 1,
    equipment: ['Scroll case with notes', 'Winter blanket', 'Common clothes', 'Herbalism kit', '5 gp'],
    feature: 'Discovery',
  },
  {
    id: 'noble',
    name: 'Noble',
    description: 'Aristocrat of wealth and privilege',
    skills: ['history', 'persuasion'],
    toolProficiencies: ['One gaming set'],
    languages: 1,
    equipment: ['Fine clothes', 'Signet ring', 'Scroll of pedigree', '25 gp'],
    feature: 'Position of Privilege',
  },
  {
    id: 'outlander',
    name: 'Outlander',
    description: 'Wilderness survivor far from civilization',
    skills: ['athletics', 'survival'],
    toolProficiencies: ['One musical instrument'],
    languages: 1,
    equipment: ['Staff', 'Hunting trap', 'Animal trophy', "Traveler's clothes", '10 gp'],
    feature: 'Wanderer',
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Scholar devoted to learning',
    skills: ['arcana', 'history'],
    toolProficiencies: [],
    languages: 2,
    equipment: ['Bottle of black ink', 'Quill', 'Small knife', 'Letter from dead colleague', 'Common clothes', '10 gp'],
    feature: 'Researcher',
  },
  {
    id: 'sailor',
    name: 'Sailor',
    description: 'Experienced seafarer',
    skills: ['athletics', 'perception'],
    toolProficiencies: ["Navigator's tools", 'Vehicles (water)'],
    languages: 0,
    equipment: ['Belaying pin (club)', '50 feet of silk rope', 'Lucky charm', 'Common clothes', '10 gp'],
    feature: "Ship's Passage",
  },
  {
    id: 'soldier',
    name: 'Soldier',
    description: 'Military veteran who served in the ranks',
    skills: ['athletics', 'intimidation'],
    toolProficiencies: ['One gaming set', 'Vehicles (land)'],
    languages: 0,
    equipment: ['Insignia of rank', 'Trophy from fallen enemy', 'Dice set', 'Common clothes', '10 gp'],
    feature: 'Military Rank',
  },
  {
    id: 'urchin',
    name: 'Urchin',
    description: 'Street survivor who grew up on the streets',
    skills: ['sleightOfHand', 'stealth'],
    toolProficiencies: ['Disguise kit', "Thieves' tools"],
    languages: 0,
    equipment: ['Small knife', 'Map of home city', 'Pet mouse', 'Token from parents', 'Common clothes', '10 gp'],
    feature: 'City Secrets',
  },
];

// ─── Alignments ───────────────────────────────────────────────────

export const DND_ALIGNMENTS = [
  { id: 'lawful-good', name: 'Lawful Good', short: 'LG', description: 'Follows rules to help others' },
  { id: 'neutral-good', name: 'Neutral Good', short: 'NG', description: 'Does good without bias' },
  { id: 'chaotic-good', name: 'Chaotic Good', short: 'CG', description: 'Rebel with a heart of gold' },
  { id: 'lawful-neutral', name: 'Lawful Neutral', short: 'LN', description: 'Order above all' },
  { id: 'true-neutral', name: 'True Neutral', short: 'N', description: 'Balance in all things' },
  { id: 'chaotic-neutral', name: 'Chaotic Neutral', short: 'CN', description: 'Freedom above all' },
  { id: 'lawful-evil', name: 'Lawful Evil', short: 'LE', description: 'Uses law for selfish ends' },
  { id: 'neutral-evil', name: 'Neutral Evil', short: 'NE', description: 'Self-interest above all' },
  { id: 'chaotic-evil', name: 'Chaotic Evil', short: 'CE', description: 'Destructive and selfish' },
] as const;

// ─── Ability Scores ───────────────────────────────────────────────

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const ABILITY_NAMES: AbilityName[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

// ─── Skill ↔ Ability Mapping ─────────────────────────────────────

export const SKILL_ABILITY_MAP: Record<string, AbilityName> = {
  acrobatics: 'dexterity',
  animalHandling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleightOfHand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
};

// Prettier display names for skill keys
export const SKILL_DISPLAY_NAMES: Record<string, string> = {
  acrobatics: 'Acrobatics',
  animalHandling: 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  sleightOfHand: 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
};

// ─── Calculation Helpers ──────────────────────────────────────────

/** Hit die average (rounded up) used for HP at levels 2+ */
const HIT_DIE_AVERAGE: Record<number, number> = {
  6: 4,   // d6  → 3.5 → 4
  8: 5,   // d8  → 4.5 → 5
  10: 6,  // d10 → 5.5 → 6
  12: 7,  // d12 → 6.5 → 7
};

/**
 * Calculate HP for any class at any level.
 * Level 1: hit die max + CON mod
 * Level 2+: add (hit die avg rounded up + CON mod) per level
 */
export function calculateHP(classId: string, level: number, constitutionScore: number): number {
  const classInfo = DND_CLASSES.find(c => c.id === classId);
  const hitDie = classInfo?.hitDie || 8;
  const conMod = getAbilityModifier(constitutionScore);
  const avg = HIT_DIE_AVERAGE[hitDie] || 5;

  // Level 1: max hit die + CON mod
  let hp = hitDie + conMod;

  // Levels 2+: average + CON mod each
  if (level > 1) {
    hp += (avg + conMod) * (level - 1);
  }

  return Math.max(1, hp);
}

/** Kept for backwards compatibility — just calls calculateHP at level 1 */
export function calculateStartingHP(classId: string, constitutionScore: number): number {
  return calculateHP(classId, 1, constitutionScore);
}

/** Proficiency bonus by character level */
export function getProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

/** Base AC (unarmored) = 10 + DEX mod */
export function calculateBaseAC(dexterityScore: number): number {
  return 10 + getAbilityModifier(dexterityScore);
}

/** Spell save DC = 8 + proficiency bonus + spellcasting ability modifier */
export function calculateSpellSaveDC(level: number, spellcastingAbilityScore: number): number {
  return 8 + getProficiencyBonus(level) + getAbilityModifier(spellcastingAbilityScore);
}

/** Spell attack bonus = proficiency bonus + spellcasting ability modifier */
export function calculateSpellAttackBonus(level: number, spellcastingAbilityScore: number): number {
  return getProficiencyBonus(level) + getAbilityModifier(spellcastingAbilityScore);
}

/** Get hit dice string for a class at a level (e.g. "5d10") */
export function getHitDiceString(classId: string, level: number): string {
  const classInfo = DND_CLASSES.find(c => c.id === classId);
  const hitDie = classInfo?.hitDie || 8;
  return `${level}d${hitDie}`;
}

/** Apply racial ability score bonuses to base scores */
export function applyRacialBonuses(
  baseScores: Record<AbilityName, number>,
  raceId: string,
  bonusChoiceSelections?: AbilityName[],
): Record<AbilityName, number> {
  const race = DND_RACES.find(r => r.id === raceId);
  if (!race) return { ...baseScores };

  const result = { ...baseScores };

  // Apply fixed bonuses
  for (const [ability, bonus] of Object.entries(race.abilityBonuses)) {
    result[ability as AbilityName] += bonus;
  }

  // Apply chosen bonuses (e.g., Half-Elf picks 2 abilities for +1)
  if (race.bonusChoices && bonusChoiceSelections) {
    const { amount } = race.bonusChoices;
    for (const ability of bonusChoiceSelections) {
      result[ability] += amount;
    }
  }

  return result;
}

/** Look up a race by ID */
export function getRaceData(raceId: string): RaceData | undefined {
  return DND_RACES.find(r => r.id === raceId);
}

/** Look up a class by ID */
export function getClassData(classId: string): ClassData | undefined {
  return DND_CLASSES.find(c => c.id === classId);
}

/** Look up a background by ID */
export function getBackgroundData(bgId: string): BackgroundData | undefined {
  return DND_BACKGROUNDS.find(b => b.id === bgId);
}

// ═══════════════════════════════════════════════════════════════
// SPELL SLOT PROGRESSION (D&D 5e SRD)
// ═══════════════════════════════════════════════════════════════

// Full casters: Bard, Cleric, Druid, Sorcerer, Wizard
// Half casters: Paladin, Ranger (start at level 2)
// Pact casters: Warlock (unique progression)
// Third casters: Artificer (start at level 1 but slower)

type SpellSlotTable = Record<number, Record<number, number>>; // level → { slotLevel → count }

const FULL_CASTER_SLOTS: SpellSlotTable = {
  1:  { 1: 2 },
  2:  { 1: 3 },
  3:  { 1: 4, 2: 2 },
  4:  { 1: 4, 2: 3 },
  5:  { 1: 4, 2: 3, 3: 2 },
  6:  { 1: 4, 2: 3, 3: 3 },
  7:  { 1: 4, 2: 3, 3: 3, 4: 1 },
  8:  { 1: 4, 2: 3, 3: 3, 4: 2 },
  9:  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

const HALF_CASTER_SLOTS: SpellSlotTable = {
  2:  { 1: 2 },
  3:  { 1: 3 },
  4:  { 1: 3 },
  5:  { 1: 4, 2: 2 },
  6:  { 1: 4, 2: 2 },
  7:  { 1: 4, 2: 3 },
  8:  { 1: 4, 2: 3 },
  9:  { 1: 4, 2: 3, 3: 2 },
  10: { 1: 4, 2: 3, 3: 2 },
  11: { 1: 4, 2: 3, 3: 3 },
  12: { 1: 4, 2: 3, 3: 3 },
  13: { 1: 4, 2: 3, 3: 3, 4: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 2 },
  16: { 1: 4, 2: 3, 3: 3, 4: 2 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
};

// Warlock Pact Magic — fewer slots but they're all at highest level and recharge on short rest
const WARLOCK_SLOTS: SpellSlotTable = {
  1:  { 1: 1 },
  2:  { 1: 2 },
  3:  { 2: 2 },
  4:  { 2: 2 },
  5:  { 3: 2 },
  6:  { 3: 2 },
  7:  { 4: 2 },
  8:  { 4: 2 },
  9:  { 5: 2 },
  10: { 5: 2 },
  11: { 5: 3 },
  12: { 5: 3 },
  13: { 5: 3 },
  14: { 5: 3 },
  15: { 5: 3 },
  16: { 5: 3 },
  17: { 5: 4 },
  18: { 5: 4 },
  19: { 5: 4 },
  20: { 5: 4 },
};

const CLASS_CASTER_TYPE: Record<string, 'full' | 'half' | 'warlock' | 'none'> = {
  bard: 'full', cleric: 'full', druid: 'full', sorcerer: 'full', wizard: 'full',
  paladin: 'half', ranger: 'half', artificer: 'half',
  warlock: 'warlock',
  barbarian: 'none', fighter: 'none', monk: 'none', rogue: 'none',
};

/** Get spell slots for a given class and level */
export function getSpellSlots(className: string, level: number): Record<number, { max: number; used: number }> {
  const casterType = CLASS_CASTER_TYPE[className.toLowerCase()] || 'none';
  if (casterType === 'none') return {};

  const table = casterType === 'full' ? FULL_CASTER_SLOTS
    : casterType === 'half' ? HALF_CASTER_SLOTS
    : WARLOCK_SLOTS;

  const slots = table[level];
  if (!slots) return {};

  const result: Record<number, { max: number; used: number }> = {};
  for (const [slotLevel, count] of Object.entries(slots)) {
    result[Number(slotLevel)] = { max: count, used: 0 };
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// CANTRIPS AND SPELLS KNOWN BY CLASS/LEVEL
// ═══════════════════════════════════════════════════════════════

interface SpellProgression {
  cantripsKnown: Record<number, number>;  // level → number of cantrips
  /** For "known" casters (Bard, Sorcerer, Ranger, Warlock) */
  spellsKnown?: Record<number, number>;   // level → total spells known
  /** For "prepared" casters (Cleric, Druid, Paladin, Wizard) — use ability mod + level */
  preparedFormula?: 'wis+level' | 'int+level' | 'cha+level';
}

const SPELL_PROGRESSION: Record<string, SpellProgression> = {
  bard: {
    cantripsKnown: { 1: 2, 4: 3, 10: 4 },
    spellsKnown: { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 14, 11: 15, 13: 16, 14: 18, 15: 19, 17: 20, 18: 22 },
  },
  cleric: {
    cantripsKnown: { 1: 3, 4: 4, 10: 5 },
    preparedFormula: 'wis+level',
  },
  druid: {
    cantripsKnown: { 1: 2, 4: 3, 10: 4 },
    preparedFormula: 'wis+level',
  },
  paladin: {
    cantripsKnown: {},
    preparedFormula: 'cha+level',
  },
  ranger: {
    cantripsKnown: {},
    spellsKnown: { 2: 2, 3: 3, 5: 4, 7: 5, 9: 6, 11: 7, 13: 8, 15: 9, 17: 10, 19: 11 },
  },
  sorcerer: {
    cantripsKnown: { 1: 4, 4: 5, 10: 6 },
    spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 13: 13, 15: 14, 17: 15 },
  },
  warlock: {
    cantripsKnown: { 1: 2, 4: 3, 10: 4 },
    spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 11: 11, 13: 12, 15: 13, 17: 14, 19: 15 },
  },
  wizard: {
    cantripsKnown: { 1: 3, 4: 4, 10: 5 },
    preparedFormula: 'int+level',
  },
  artificer: {
    cantripsKnown: { 1: 2, 10: 3, 14: 4 },
    preparedFormula: 'int+level',
  },
};

/** Get number of cantrips known for a class at a given level */
export function getCantripsKnown(className: string, level: number): number {
  const prog = SPELL_PROGRESSION[className.toLowerCase()];
  if (!prog) return 0;
  let count = 0;
  for (const [lvl, num] of Object.entries(prog.cantripsKnown)) {
    if (level >= Number(lvl)) count = num;
  }
  return count;
}

/** Get number of spells known (for "known" casters) or max prepared (for "prepared" casters) */
export function getSpellsKnownOrPrepared(
  className: string, level: number, abilityMod?: number
): number {
  const prog = SPELL_PROGRESSION[className.toLowerCase()];
  if (!prog) return 0;
  if (prog.spellsKnown) {
    let count = 0;
    for (const [lvl, num] of Object.entries(prog.spellsKnown)) {
      if (level >= Number(lvl)) count = num;
    }
    return count;
  }
  if (prog.preparedFormula && abilityMod !== undefined) {
    // Half-casters use half-level (minimum 1)
    const casterType = CLASS_CASTER_TYPE[className.toLowerCase()];
    const effectiveLevel = casterType === 'half' ? Math.floor(level / 2) : level;
    return Math.max(1, abilityMod + effectiveLevel);
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════
// CLASS FEATURES (D&D 5e SRD)
// ═══════════════════════════════════════════════════════════════

export interface ClassFeature {
  name: string;
  level: number;
  description: string;
  /** Optional: resource uses per rest */
  uses?: string;
}

export const CLASS_FEATURES: Record<string, ClassFeature[]> = {
  barbarian: [
    { name: 'Rage', level: 1, description: 'Enter a battle rage for bonus damage, resistance to physical damage, and advantage on Strength checks/saves. Cannot cast spells while raging.', uses: '2/long rest (increases with level)' },
    { name: 'Unarmored Defense', level: 1, description: 'AC = 10 + DEX mod + CON mod when not wearing armor.' },
    { name: 'Reckless Attack', level: 2, description: 'Gain advantage on melee attack rolls using Strength, but attacks against you have advantage until your next turn.' },
    { name: 'Danger Sense', level: 2, description: 'Advantage on DEX saving throws against effects you can see (traps, spells, etc.).' },
    { name: 'Extra Attack', level: 5, description: 'Attack twice when you take the Attack action.' },
    { name: 'Fast Movement', level: 5, description: '+10 feet speed when not wearing heavy armor.' },
    { name: 'Brutal Critical', level: 9, description: 'Roll one additional damage die on a critical hit with a melee attack.' },
    { name: 'Relentless Rage', level: 11, description: 'If you drop to 0 HP while raging, make a DC 10 CON save to drop to 1 HP instead. DC increases by 5 each time.' },
  ],
  bard: [
    { name: 'Bardic Inspiration', level: 1, description: 'Grant an ally a d6 bonus die they can add to an ability check, attack roll, or saving throw within 10 minutes.', uses: 'CHA mod/long rest' },
    { name: 'Jack of All Trades', level: 2, description: 'Add half your proficiency bonus to any ability check you aren\'t proficient in.' },
    { name: 'Song of Rest', level: 2, description: 'Allies who spend hit dice during a short rest regain an extra 1d6 HP.' },
    { name: 'Expertise', level: 3, description: 'Double your proficiency bonus for two skill proficiencies of your choice.' },
    { name: 'Font of Inspiration', level: 5, description: 'Bardic Inspiration recharges on short rest instead of long rest.' },
    { name: 'Countercharm', level: 6, description: 'Allies within 30 feet have advantage on saves against being frightened or charmed.' },
  ],
  cleric: [
    { name: 'Divine Domain', level: 1, description: 'Choose a divine domain (Life, Light, War, etc.) that grants bonus spells and features.' },
    { name: 'Channel Divinity', level: 2, description: 'Channel divine energy for powerful effects. Turn Undead: undead within 30 ft must make WIS save or flee for 1 minute.', uses: '1/short rest (2 at 6th, 3 at 18th)' },
    { name: 'Destroy Undead', level: 5, description: 'Undead of CR 1/2 or lower that fail Turn Undead save are instantly destroyed.' },
    { name: 'Divine Intervention', level: 10, description: 'Call upon your deity for aid. Roll percentile dice; if you roll ≤ your cleric level, the deity intervenes.', uses: '1/long rest' },
  ],
  druid: [
    { name: 'Druidic', level: 1, description: 'You know Druidic, the secret language of druids.' },
    { name: 'Wild Shape', level: 2, description: 'Transform into a beast you\'ve seen. CR limit starts at 1/4 (no flying/swimming). Lasts hours equal to half your druid level.', uses: '2/short rest' },
    { name: 'Timeless Body', level: 18, description: 'You age 10x slower and cannot be aged magically.' },
  ],
  fighter: [
    { name: 'Fighting Style', level: 1, description: 'Choose a fighting style: Archery (+2 ranged), Defense (+1 AC), Dueling (+2 damage), Great Weapon (reroll 1s and 2s), Protection, or Two-Weapon Fighting.' },
    { name: 'Second Wind', level: 1, description: 'Regain 1d10 + fighter level HP as a bonus action.', uses: '1/short rest' },
    { name: 'Action Surge', level: 2, description: 'Take one additional action on your turn.', uses: '1/short rest (2 at 17th)' },
    { name: 'Extra Attack', level: 5, description: 'Attack twice when you take the Attack action (3 at 11th, 4 at 20th).' },
    { name: 'Indomitable', level: 9, description: 'Reroll a failed saving throw.', uses: '1/long rest (2 at 13th, 3 at 17th)' },
  ],
  monk: [
    { name: 'Unarmored Defense', level: 1, description: 'AC = 10 + DEX mod + WIS mod when not wearing armor or shield.' },
    { name: 'Martial Arts', level: 1, description: 'Use DEX instead of STR for unarmed strikes and monk weapons. Bonus action unarmed strike after attacking. Martial arts die starts at d4.' },
    { name: 'Ki', level: 2, description: 'Harness mystical energy. Spend ki for Flurry of Blows (2 bonus unarmed strikes), Patient Defense (Dodge as bonus action), or Step of the Wind (Disengage/Dash as bonus action).', uses: 'Monk level/short rest' },
    { name: 'Unarmored Movement', level: 2, description: '+10 feet speed (increases with level) when not wearing armor or shield.' },
    { name: 'Deflect Missiles', level: 3, description: 'Reduce ranged attack damage by 1d10 + DEX mod + monk level. If reduced to 0, catch and throw it back.' },
    { name: 'Slow Fall', level: 4, description: 'Reduce falling damage by 5× your monk level as a reaction.' },
    { name: 'Extra Attack', level: 5, description: 'Attack twice when you take the Attack action.' },
    { name: 'Stunning Strike', level: 5, description: 'Spend 1 ki when you hit with a melee attack. Target must make CON save or be stunned until end of your next turn.' },
    { name: 'Evasion', level: 7, description: 'DEX saves for half damage: take no damage on success, half on failure.' },
  ],
  paladin: [
    { name: 'Divine Sense', level: 1, description: 'Detect celestials, fiends, and undead within 60 feet.', uses: '1 + CHA mod/long rest' },
    { name: 'Lay on Hands', level: 1, description: 'Heal by touch from a pool of HP equal to 5× your paladin level. Can also cure diseases/poisons (5 HP per cure).', uses: '5×level HP pool/long rest' },
    { name: 'Fighting Style', level: 2, description: 'Choose a fighting style: Defense, Dueling, Great Weapon, or Protection.' },
    { name: 'Divine Smite', level: 2, description: 'Expend a spell slot when you hit with a melee attack to deal extra 2d8 radiant damage (+1d8 per slot level above 1st, +1d8 vs undead/fiends). Max 5d8.' },
    { name: 'Divine Health', level: 3, description: 'Immune to disease.' },
    { name: 'Extra Attack', level: 5, description: 'Attack twice when you take the Attack action.' },
    { name: 'Aura of Protection', level: 6, description: 'You and allies within 10 feet add your CHA mod to saving throws.' },
  ],
  ranger: [
    { name: 'Favored Enemy', level: 1, description: 'Choose a type of favored enemy. Advantage on Survival checks to track them and INT checks to recall info about them.' },
    { name: 'Natural Explorer', level: 1, description: 'Choose a favored terrain. Benefits: double proficiency for INT/WIS checks, difficult terrain doesn\'t slow your group, always alert.' },
    { name: 'Fighting Style', level: 2, description: 'Choose: Archery (+2 ranged), Defense (+1 AC), Dueling (+2 damage), or Two-Weapon Fighting.' },
    { name: 'Primeval Awareness', level: 3, description: 'Spend a spell slot to sense aberrations, celestials, dragons, elementals, fey, fiends, and undead within 1 mile.' },
    { name: 'Extra Attack', level: 5, description: 'Attack twice when you take the Attack action.' },
    { name: 'Land\'s Stride', level: 8, description: 'Move through nonmagical difficult terrain at no extra cost. Advantage on saves vs plants that impede movement.' },
  ],
  rogue: [
    { name: 'Expertise', level: 1, description: 'Double your proficiency bonus for two skill proficiencies or one skill and thieves\' tools.' },
    { name: 'Sneak Attack', level: 1, description: 'Once per turn, deal extra 1d6 damage when you hit with a finesse/ranged weapon and have advantage OR an ally within 5 feet of the target. Damage increases by 1d6 every odd level.' },
    { name: 'Thieves\' Cant', level: 1, description: 'You know the secret language of thieves and can hide messages in normal conversation.' },
    { name: 'Cunning Action', level: 2, description: 'Dash, Disengage, or Hide as a bonus action.' },
    { name: 'Uncanny Dodge', level: 5, description: 'Halve the damage of an attack you can see as a reaction.' },
    { name: 'Evasion', level: 7, description: 'DEX saves for half damage: take no damage on success, half on failure.' },
    { name: 'Reliable Talent', level: 11, description: 'Treat any d20 roll of 9 or lower as a 10 for skills you\'re proficient in.' },
  ],
  sorcerer: [
    { name: 'Sorcerous Origin', level: 1, description: 'Choose the source of your power: Draconic Bloodline or Wild Magic.' },
    { name: 'Font of Magic', level: 2, description: 'You have sorcery points equal to your sorcerer level. Convert spell slots to sorcery points or vice versa.' },
    { name: 'Metamagic', level: 3, description: 'Choose 2 Metamagic options to alter spells: Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, or Twinned Spell.' },
  ],
  warlock: [
    { name: 'Otherworldly Patron', level: 1, description: 'Choose your patron: The Archfey, The Fiend, or The Great Old One. Grants expanded spells and features.' },
    { name: 'Pact Magic', level: 1, description: 'Cast using Pact Magic slots that recharge on a short rest (unlike other casters).' },
    { name: 'Eldritch Invocations', level: 2, description: 'Choose 2 invocations that grant special abilities, enhanced Eldritch Blast, at-will spells, or other benefits. Gain more at higher levels.' },
    { name: 'Pact Boon', level: 3, description: 'Choose: Pact of the Chain (improved familiar), Pact of the Blade (summon magical weapon), or Pact of the Tome (extra cantrips from any class).' },
  ],
  wizard: [
    { name: 'Arcane Recovery', level: 1, description: 'Once per day during a short rest, recover spell slots with combined level ≤ half your wizard level (rounded up).', uses: '1/long rest' },
    { name: 'Arcane Tradition', level: 2, description: 'Choose a school of magic to specialize in (Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, or Transmutation).' },
    { name: 'Spell Mastery', level: 18, description: 'Choose a 1st-level and 2nd-level spell. Cast them at lowest level without expending a spell slot.' },
  ],
  artificer: [
    { name: 'Magical Tinkering', level: 1, description: 'Imbue a Tiny nonmagical object with a minor magical property (light, sound, odor, or visual effect).' },
    { name: 'Infuse Item', level: 2, description: 'Infuse mundane items with magical properties. Choose from a list of infusions.', uses: '2 infusions known (increases with level)' },
    { name: 'The Right Tool for the Job', level: 3, description: 'Create a set of artisan\'s tools in an unoccupied space during a short or long rest.' },
    { name: 'Tool Expertise', level: 6, description: 'Double your proficiency bonus for any ability check using a tool you\'re proficient with.' },
  ],
};

/** Get class features available at or below a given level */
export function getClassFeaturesAtLevel(className: string, level: number): ClassFeature[] {
  const features = CLASS_FEATURES[className.toLowerCase()] || [];
  return features.filter(f => f.level <= level);
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT STARTING SPELLS BY CLASS
// ═══════════════════════════════════════════════════════════════
// These are sensible defaults for level 1 characters. Players can
// swap them out later. Based on SRD spells available to each class.

export const DEFAULT_STARTING_SPELLS: Record<string, { cantrips: string[]; spells: string[] }> = {
  bard: {
    cantrips: ['Vicious Mockery', 'Mage Hand'],
    spells: ['Healing Word', 'Thunderwave', 'Faerie Fire', 'Dissonant Whispers'],
  },
  cleric: {
    cantrips: ['Sacred Flame', 'Guidance', 'Spare the Dying'],
    spells: ['Cure Wounds', 'Guiding Bolt', 'Shield of Faith', 'Bless'],
  },
  druid: {
    cantrips: ['Produce Flame', 'Druidcraft'],
    spells: ['Cure Wounds', 'Entangle', 'Thunderwave', 'Faerie Fire'],
  },
  paladin: {
    cantrips: [],
    spells: ['Shield of Faith', 'Cure Wounds'],
  },
  ranger: {
    cantrips: [],
    spells: ['Hunter\'s Mark', 'Cure Wounds'],
  },
  sorcerer: {
    cantrips: ['Fire Bolt', 'Mage Hand', 'Prestidigitation', 'Ray of Frost'],
    spells: ['Shield', 'Magic Missile'],
  },
  warlock: {
    cantrips: ['Eldritch Blast', 'Mage Hand'],
    spells: ['Hex', 'Hellish Rebuke'],
  },
  wizard: {
    cantrips: ['Fire Bolt', 'Mage Hand', 'Prestidigitation'],
    spells: ['Shield', 'Magic Missile', 'Mage Armor', 'Find Familiar', 'Detect Magic', 'Sleep'],
  },
  artificer: {
    cantrips: ['Mending', 'Fire Bolt'],
    spells: ['Cure Wounds', 'Faerie Fire'],
  },
};
