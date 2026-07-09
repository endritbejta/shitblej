import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaPaperPlane } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer className="bg-gray-100 dark:bg-zinc-900 pt-16 pb-8 border-t border-gray-200 dark:border-zinc-800 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <Link to="/" className="text-2xl font-bold text-green-500 tracking-tighter">
                            SHITBLEJ
                        </Link>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            {t('footer.tagline')}
                        </p>
                        <div className="flex gap-4 pt-2">
                            <SocialLink href="#" icon={<FaFacebook />} />
                            <SocialLink href="#" icon={<FaTwitter />} />
                            <SocialLink href="#" icon={<FaInstagram />} />
                            <SocialLink href="#" icon={<FaLinkedin />} />
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t('footer.quick_links')}</h3>
                        <ul className="space-y-2">
                            <FooterLink to="/" text={t('footer.home')} />
                            <FooterLink to="/sell" text={t('footer.sell_item')} />
                            <FooterLink to="/login" text={t('footer.login')} />
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t('footer.support')}</h3>
                        <ul className="space-y-2">
                            <FooterLink to="#" text={t('footer.help_center')} />
                            <FooterLink to="#" text={t('footer.terms_of_service')} />
                            <FooterLink to="#" text={t('footer.privacy_policy')} />
                            <FooterLink to="#" text={t('footer.cookie_policy')} />
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t('footer.stay_connected')}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                            {t('footer.newsletter_text')}
                        </p>
                        <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                            <input
                                type="email"
                                placeholder={t('footer.email_placeholder')}
                                className="flex-1 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                            />
                            <button
                                type="submit"
                                className="w-10 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors duration-200"
                                aria-label="Subscribe"
                            >
                                <FaPaperPlane className="text-sm" />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                        &copy; {new Date().getFullYear()} Shitblej. {t('footer.all_rights_reserved')}
                    </p>
                    <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-500">
                        <Link to="#" className="hover:text-green-500 transition-colors">{t('footer.privacy')}</Link>
                        <Link to="#" className="hover:text-green-500 transition-colors">{t('footer.terms')}</Link>
                        <Link to="#" className="hover:text-green-500 transition-colors">{t('footer.sitemap')}</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

const SocialLink = ({ href, icon }) => (
    <a
        href={href}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-green-500 hover:text-white dark:hover:bg-green-500 dark:hover:text-white transition-all duration-300"
    >
        {icon}
    </a>
);

const FooterLink = ({ to, text }) => (
    <li>
        <Link
            to={to}
            className="text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 text-sm transition-colors duration-200"
        >
            {text}
        </Link>
    </li>
);

export default Footer;