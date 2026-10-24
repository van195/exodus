export const formatMoney = (n) => `${Number(n).toLocaleString("en-US")} ETB`;

export const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const isOverdue = (iso) => new Date(`${iso}T23:59:59`) < new Date();
