export default class Batch<T> {
  private items: T[] = [];

  constructor(
    private readonly batchSize: number,
    private readonly process: (batch: T[]) => Promise<void>,
  ) {}

  async add(items: T[]) {
    this.items.push(...items);
    if (this.items.length > this.batchSize) {
      await this.process(items);
      this.items = [];
      return;
    }
  }

  async finish() {
    if (this.items.length) {
      await this.process(this.items);
    }
  }
}
