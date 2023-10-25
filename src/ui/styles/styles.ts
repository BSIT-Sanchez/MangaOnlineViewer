import { svgToUrl } from '../../utils/svgs';
import { IconPalette, IconPhoto, IconPhotoOff } from '../components/icons';
import colors from '../../utils/colors';
import styles from './main.css?inline';
import icons from './icons.css?inline';
import simplenormalize from './simplenormalize.css?inline';
import media from './media.css?inline';
import animation from './animation.css?inline';
import header from './header.css?inline';
import keybindings from './keybindings.css?inline';
import page from './page.css?inline';
import settings from './settings.css?inline';
import thumbnails from './thumbnails.css?inline';
import bookmarks from './bookmarks.css?inline';

// Language=CSS
export default `
    :root,
    .dark,
    .dark .default,
    [data-theme='dark'] {
        --theme-body-background: ${colors.dark['600']};
        --theme-body-text-color: ${colors.dark['50']};
        --theme-text-color: ${colors.dark['50']};
        --theme-primary-color: ${colors.dark['700']};
        --theme-primary-text-color: ${colors.dark['50']};
        --theme-background-color: ${colors.dark['600']};
        --theme-hightlight-color: ${colors.dark['500']};
        --theme-border-color: ${colors.dark['400']};
    }

    .light,
    .light .default,
    [data-theme='light'] {
        --theme-body-background: ${colors.gray['50']};
        --theme-body-text-color: ${colors.gray['900']};
        --theme-text-color: ${colors.gray['900']};
        --theme-primary-color: ${colors.gray['300']};
        --theme-primary-text-color: ${colors.gray['900']};
        --theme-background-color: ${colors.gray['50']};
        --theme-hightlight-color: ${colors.gray['500']};
        --theme-border-color: ${colors.gray['100']};
    }

    #MangaOnlineViewer .PageContent .PageImg[src=""],
    #MangaOnlineViewer .PageContent .PageImg:not([src]) {
        background-image: url("${svgToUrl(IconPhoto)}");
    }

    #MangaOnlineViewer .PageContent .PageImg.imgBroken {
        background-image: url("${svgToUrl(IconPhotoOff)}");
    }

    #MangaOnlineViewer .Thumbnail .ThumbnailImg[src=""],
    #MangaOnlineViewer .Thumbnail .ThumbnailImg:not([src]) {
        background-image: url("${svgToUrl(IconPhoto)}");
    }

    #MangaOnlineViewer .ThemeRadio.custom {
            /*background-image: url("${svgToUrl(IconPalette)}");*/
    }
    ${simplenormalize}
    ${styles}
    ${header}
    ${icons}
    ${keybindings}
    ${page}
    ${settings}
    ${thumbnails}
    ${bookmarks}
    ${media}
    ${animation}
`;
