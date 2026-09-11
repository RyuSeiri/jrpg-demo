// Game_Switches: a flat bank of named boolean flags used by event-style
// scripting. Mirrors RPG Maker MV's $gameSwitches / $gameVariables idea
// in a much smaller, typed form.
class GameSwitchesImpl {
  private flags = new Map<string, boolean>();
  private vars = new Map<string, number>();

  set(key: string, value: boolean) {
    this.flags.set(key, value);
  }

  get(key: string): boolean {
    return this.flags.get(key) ?? false;
  }

  setVar(key: string, value: number) {
    this.vars.set(key, value);
  }

  getVar(key: string): number {
    return this.vars.get(key) ?? 0;
  }
}

export const GameSwitches = new GameSwitchesImpl();
