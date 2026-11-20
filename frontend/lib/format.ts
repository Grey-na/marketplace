// 224910 -> "Rs. 2,249.10" and 250000 -> "Rs. 2,500"
export const formatPrice = (paisa: number): string => {
  const text = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: paisa % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paisa / 100);
  return `Rs. ${text}`;
};