import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en/translation.json';
import sqTranslation from './locales/sq/translation.json';
import srTranslation from './locales/sr/translation.json';

const resources = {
    en: {
        translation: enTranslation
    },
    sq: {
        translation: sqTranslation
    },
    sr: {
        translation: srTranslation
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem('language') || 'en', // default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
