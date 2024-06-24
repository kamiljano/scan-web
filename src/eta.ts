export const startEta = (total: number) => {
  const start = Date.now();

  return {
    get(processed: number) {
      const elapsed = Date.now() - start;
      const remaining = (total - processed) * (elapsed / processed);

      return {
        elapsed,
        remaining,
      };
    },
  };
};
