// A documented review is not a provider permission or a publication grant.
export function personalAllowed(config, provider, now=Date.now()) {
 const p=config?.providers?.[provider];
 return config?.scope==='personal-private' && p?.decision==='limited-personal-browser' &&
  Number.isFinite(Date.parse(p.reviewedAt)) && Date.parse(p.reviewedAt)<=now &&
  Number.isFinite(Date.parse(p.reviewBy)) && now<Date.parse(p.reviewBy);
}
