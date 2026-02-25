declare module '@3d-dice/dice-box-threejs' {
  interface DiceBoxConfig {
    assetPath?: string;
    framerate?: number;
    sounds?: boolean;
    volume?: number;
    color_spotlight?: number;
    shadows?: boolean;
    theme_surface?: string;
    sound_dieMaterial?: string;
    theme_customColorset?: any;
    theme_colorset?: string;
    theme_texture?: string;
    theme_material?: 'none' | 'metal' | 'wood' | 'glass' | 'plastic';
    gravity_multiplier?: number;
    light_intensity?: number;
    baseScale?: number;
    strength?: number;
    iterationLimit?: number;
    onRollComplete?: (results: any) => void;
    onRerollComplete?: (results: any) => void;
    onAddDiceComplete?: (results: any) => void;
    onRemoveDiceComplete?: (results: any) => void;
  }

  class DiceBox {
    constructor(selector: string, config?: DiceBoxConfig);
    initialized: boolean;
    initialize(): Promise<void>;
    roll(notation: string): Promise<any>;
    add(notation: string): Promise<any>;
    remove(indices: number[]): Promise<any>;
    clearDice(): void;
    enableShadows(): void;
    disableShadows(): void;
    updateConfig(config: Partial<DiceBoxConfig>): Promise<void>;
  }

  export default DiceBox;
}
