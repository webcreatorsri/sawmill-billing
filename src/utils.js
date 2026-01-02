// src/utils.js - THIS IS COMPULSORY
export function totalUnitsForItem(item) {
  const l = Number(item.length) || 0;
  const b = Number(item.breadth) || 0;
  const h = Number(item.height) || 0;
  const n = Number(item.nos) || 0;

  if (l === 0 || b === 0 || n === 0) {
    return 0;
  }

  if (item.bill_type === "Sizes") {
    return (l * b * h / 144) * n;
  } else if (item.bill_type === "Planks") {
    return (l * b / 12) * n;
  } else if (item.bill_type === "None") {
    return 0;
  } else {
    return 0;
  }
}

export function roundTwo(x) {
  return Math.round((Number(x) + Number.EPSILON) * 100) / 100;
}