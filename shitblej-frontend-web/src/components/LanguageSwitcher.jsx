import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'sq', label: 'Shqip' },
    // { code: 'sr', label: 'Српски' },
];

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

    const changeLanguage = (langCode) => {
        i18n.changeLanguage(langCode);
        localStorage.setItem('language', langCode);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium uppercase text-gray-600 transition-colors hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700 dark:text-gray-300 dark:hover:border-brand-400 dark:hover:text-brand-400"
            >
                {currentLanguage.code}
            </button>

            {isOpen && (
                <div className="absolute bottom-full right-0 z-50 mb-2 w-36 origin-bottom animate-scale-in rounded-2xl border border-gray-200 bg-white p-1.5 shadow-overlay dark:border-zinc-800 dark:bg-zinc-900">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                                i18n.language === lang.code
                                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <span className="text-sm font-medium">{lang.label}</span>
                            <span className="text-xs uppercase text-gray-400">{lang.code}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
