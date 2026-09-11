// Input: tracks currently-held keys and single-press "trigger" events.
// Mirrors RPG Maker MV's Input static class.

class InputImpl {
  private held = new Set<string>();
  private triggered = new Set<string>();

  init() {
    window.addEventListener("keydown", (e) => {
      if (!this.held.has(e.key)) this.triggered.add(e.key);
      this.held.add(e.key);
    });
    window.addEventListener("keyup", (e) => {
      this.held.delete(e.key);
    });
  }

  isPressed(key: string): boolean {
    return this.held.has(key);
  }

  isTriggered(key: string): boolean {
    return this.triggered.has(key);
  }

  // Call once per frame after scenes have read triggers.
  clearFrame() {
    this.triggered.clear();
  }
}

export const Input = new InputImpl();
