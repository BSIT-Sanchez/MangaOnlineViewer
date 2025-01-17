import NProgress from 'nprogress';
import imagesLoaded from 'imagesloaded';
import { logScript } from '../utils/tampermonkey';
import { getUserSettings } from '../core/settings';
import {
  type IManga,
  type IMangaImages,
  type IMangaPages,
  isBruteforceManga,
  isImagesManga,
  isPagesManga,
  type ZoomMode,
} from '../types';
import { getElementAttribute } from '../utils/request';
import lazyLoad from '../utils/lazyLoad';
import sequence from '../utils/sequence';
import { html } from '../utils/code-tag';

// After pages load apply default Zoom
function applyZoom(
  zoom: number | ZoomMode = getUserSettings().zoomMode,
  pages = '.PageContent img',
) {
  const pg = [...document.querySelectorAll<HTMLImageElement>(pages)];
  pg.forEach((img) => {
    img.removeAttribute('width');
    img.removeAttribute('height');
    img.removeAttribute('style');
    if (zoom === 'width') {
      // Fit width
      img.style.width = `${window.innerWidth}px`;
    } else if (zoom === 'height') {
      // Fit height
      const chapter = document.querySelector('#Chapter');
      const fluid =
        chapter?.classList.contains('FluidLTR') || chapter?.classList.contains('FluidRTL');
      const nextHeight = window.innerHeight + (getUserSettings().showThumbnails || fluid ? -30 : 0);
      img.style.height = `${nextHeight}px`;
      img.style.minWidth = 'unset';
    } else if (zoom === 'percent') {
      img.style.width = `${img.naturalWidth * (getUserSettings().defaultZoom / 100)}px`;
    } else if (zoom >= 0 && zoom !== 100) {
      img.style.width = `${img.naturalWidth * (zoom / 100)}px`;
    }
  });
}

function invalidateImageCache(src: string, repeat: number) {
  const url = src.replace(/[?&]cache=\d+$/, '');
  const symbol = !url.includes('?') ? '?' : '&';
  return `${url + symbol}cache=${repeat}`;
}

function getRepeatValue(src: string | undefined): number {
  let repeat = 1;
  const cache = src?.match(/cache=(\d+)$/);
  if (cache?.at(1)) {
    repeat = parseInt(cache[1], 10) + 1;
  }

  return repeat;
}

// Force reload the image
function reloadImage(img: HTMLImageElement) {
  const src = img.getAttribute('src');
  if (!src) {
    return;
  }

  img.removeAttribute('src');
  img.setAttribute('src', invalidateImageCache(src, getRepeatValue(src)));
}

function onImagesDone() {
  logScript('Images Loading Complete');
  if (getUserSettings().downloadZip) {
    document.getElementById('download')?.dispatchEvent(new Event('click'));
  }

  document.getElementById('download')?.classList.remove('disabled');
}

function updateProgress() {
  const total = document.querySelectorAll('.PageContent .PageImg').length;
  const loaded = document.querySelectorAll('.PageContent .PageImg.imgLoaded').length;
  const percentage = Math.floor((loaded / total) * 100);
  const title = document.querySelector('title');
  if (title) {
    title.innerHTML = html`(${percentage}%) ${document.querySelector('#MangaTitle')?.textContent}`;
  }

  document.querySelectorAll('#Counters i, #NavigationCounters i').forEach((ele) => {
    ele.textContent = loaded.toString();
  });
  NProgress.configure({
    showSpinner: false,
  }).set(loaded / total);
  logScript(`Progress: ${percentage}%`);
  if (loaded === total) {
    onImagesDone();
  }
}

function onImagesSuccess(instance: ImagesLoaded.ImagesLoaded) {
  instance.images.forEach((image) => {
    image.img.classList.add('imgLoaded');
    image.img.classList.remove('imgBroken');
    const thumbId = image.img.id.replace('PageImg', 'ThumbnailImg');
    const thumb = document.getElementById(thumbId);
    if (thumb) {
      thumb.setAttribute('src', image.img.getAttribute('src')!);
    }

    applyZoom(getUserSettings().zoomMode, `#${image.img.id}`);
    updateProgress();
  });
}

function onImagesFail(instance: ImagesLoaded.ImagesLoaded) {
  instance.images.forEach((image) => {
    image.img.classList.add('imgBroken');
    const src = image.img.getAttribute('src');
    if (src && getRepeatValue(src) <= getUserSettings().maxReload) {
      setTimeout(() => {
        reloadImage(image.img);
        const imgLoad = imagesLoaded(image.img.parentElement!);
        imgLoad.on('done', onImagesSuccess);
        imgLoad.on('fail', onImagesFail);
      }, 2000);
    }
  });
}

// Corrects urls
function normalizeUrl(url = ''): string {
  let uri = url.trim();
  if (uri.startsWith('//')) {
    uri = `https:${uri}`;
  }

  return uri;
}

// Adds an image to the place-holder div
function addImg(manga: IMangaImages, index: number, imageSrc: string, position: number) {
  const relativePosition = position - manga.begin;
  const src = normalizeUrl(imageSrc);
  const img = document.querySelector<HTMLImageElement>(`#PageImg${index}`);
  if (img) {
    if (!getUserSettings().lazyLoadImages || relativePosition <= getUserSettings().lazyStart) {
      setTimeout(
        () => {
          const imgLoad = imagesLoaded(img.parentElement!);
          imgLoad.on('done', onImagesSuccess);
          imgLoad.on('fail', onImagesFail);
          img.setAttribute('src', src);
          logScript('Loaded Image:', index, 'Source:', src);
        },
        (manga.timer ?? getUserSettings().throttlePageLoad) * relativePosition,
      );
    } else {
      img.setAttribute('data-src', src);

      lazyLoad(img, () => {
        const imgLoad = imagesLoaded(img.parentElement!);
        imgLoad.on('done', onImagesSuccess);
        imgLoad.on('fail', onImagesFail);
        logScript('Lazy Image: ', index, ' Source: ', img.getAttribute('src'));
      });
    }
  }
}

function findPage(
  manga: IMangaPages,
  index: number,
  pageUrl: string,
  lazy: boolean,
): () => Promise<void> {
  return async () => {
    const src = await getElementAttribute(pageUrl, manga.img, manga.lazyAttr ?? 'src');
    const img = document.querySelector<HTMLImageElement>(`#PageImg${index}`);
    if (src && img) {
      img.style.width = 'auto';
      const imgLoad = imagesLoaded(img.parentElement!);
      imgLoad.on('done', onImagesSuccess);
      imgLoad.on('fail', onImagesFail);
      img.setAttribute('src', src);
      logScript(`${lazy && 'Lazy '}Page: `, index, ' Source: ', img.getAttribute('src'));
    }
  };
}

// Adds a page to the place-holder div
async function addPage(manga: IMangaPages, index: number, pageUrl: string, position: number) {
  const relativePosition = position - manga.begin;
  const img = document.querySelector<HTMLImageElement>(`#PageImg${index}`);
  if (img) {
    if (!getUserSettings().lazyLoadImages || relativePosition <= getUserSettings().lazyStart) {
      setTimeout(
        () => {
          findPage(manga, index, pageUrl, false)().catch(logScript);
        },
        (manga.timer ?? getUserSettings().throttlePageLoad) * relativePosition,
      );
    } else {
      img.setAttribute(
        'data-src',
        'data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
      );
      lazyLoad(img, findPage(manga, index, pageUrl, true));
    }
  }
}

// Use a list of pages to fill the viewer
function loadMangaPages(begin: number, manga: IMangaPages) {
  sequence(manga.pages, begin).forEach((index, position) => {
    addPage(manga, index, manga.listPages[index - 1], position).catch(logScript);
  });
}

// Use a list of images to fill the viewer
function loadMangaImages(begin: number, manga: IMangaImages) {
  sequence(manga.pages, begin).forEach((index, position) => {
    addImg(manga, index, manga.listImages[index - 1], position);
  });
}

// Entry point for loading hte Manga pages
function loadManga(manga: IManga, begin = 1) {
  getUserSettings().lazyLoadImages = manga.lazy ?? getUserSettings().lazyLoadImages;
  logScript('Loading Images');
  logScript(`Intervals: ${manga.timer ?? getUserSettings().throttlePageLoad ?? 'Default(1000)'}`);
  logScript(
    `Lazy: ${getUserSettings().lazyLoadImages}, Starting from: ${getUserSettings().lazyStart}`,
  );
  if (isImagesManga(manga)) {
    logScript('Method: Images:', manga.listImages);
    loadMangaImages(begin, manga);
  } else if (isPagesManga(manga)) {
    logScript('Method: Pages:', manga.listPages);
    loadMangaPages(begin, manga);
  } else if (isBruteforceManga(manga)) {
    logScript('Method: Brute Force');
    manga.bruteForce({
      begin,
      addImg,
      loadImages(list: string[]) {
        loadMangaImages(begin, { ...manga, listImages: list });
      },
      loadPages(list: string[], img: string, lazyAttr: string | undefined) {
        loadMangaPages(begin, {
          ...manga,
          listPages: list,
          img,
          lazyAttr,
        });
      },
      wait: getUserSettings().throttlePageLoad,
    });
  } else {
    logScript('No Loading Method Found');
  }
}

export { loadManga, applyZoom, reloadImage };
