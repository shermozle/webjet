// Wait for the assets used by the final, mounted hero before revealing it.
// This is separate from SDK readiness: a decision alone does not mean the
// browser has loaded the font or decoded the CSS background image.
export async function waitForHeroPresentation(hero: HTMLElement, timeoutMs = 3500) {
  const headline = hero.querySelector('h1')!;
  const font = getComputedStyle(headline);
  const assets: Promise<unknown>[] = [
    document.fonts.load(`${font.fontWeight} ${font.fontSize} ${font.fontFamily}`),
  ];
  const background = getComputedStyle(hero).backgroundImage;
  for (const match of background.matchAll(/url\(["']?(.*?)["']?\)/g)) {
    const image = new Image();
    image.src = match[1];
    assets.push(image.decode());
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.allSettled(assets).then(() => document.fonts.ready),
      new Promise<void>(resolve => { timer = setTimeout(resolve, timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  // Give styles and font metrics a complete layout/paint cycle while hidden.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
