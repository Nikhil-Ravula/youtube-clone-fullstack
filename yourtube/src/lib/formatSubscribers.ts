export const formatSubscribers = (count: number): string => {
  if (count === undefined || count === null || count <= 0) {
    return "No subscribers";
  }
  if (count === 1) {
    return "1 subscriber";
  }
  if (count < 1000) {
    return `${count} subscribers`;
  }
  if (count < 1000000) {
    const k = (count / 1000).toFixed(count % 1000 < 100 ? 0 : 1);
    return `${k}K subscribers`;
  }
  const m = (count / 1000000).toFixed(count % 1000000 < 100000 ? 0 : 1);
  return `${m}M subscribers`;
};
