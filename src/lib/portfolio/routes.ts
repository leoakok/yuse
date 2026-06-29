export function portfolioPath(id: string) {
  return `/portfolios/${id}`;
}

export function isPortfolioPath(pathname: string) {
  return pathname === "/portfolios" || pathname.startsWith("/portfolios/");
}
