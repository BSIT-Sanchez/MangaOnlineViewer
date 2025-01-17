// == ReaperScans ==================================================================================
export default {
  name: 'ReaperScans',
  url: /https?:\/\/(www\.)?reapercomics\.com\/comics\/.+\/chapters\/.+/,
  homepage: 'https://reapercomics.com/',
  language: ['English'],
  category: 'manga',
  waitEle: 'main img',
  run() {
    const images = [...document.querySelectorAll('main img')];
    return {
      title: document.querySelector('title')?.textContent?.trim(),
      series: document.querySelector('.fa-list')?.parentElement?.getAttribute('href'),
      pages: images.length,
      prev: document.querySelector('.fa-arrow-left-long')?.parentElement?.getAttribute('href'),
      next: document.querySelector('.fa-arrow-right-long')?.parentElement?.getAttribute('href'),
      listImages: images.map((img) => img.getAttribute('data-src') ?? img.getAttribute('src')),
    };
  },
};
