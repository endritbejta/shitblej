import { Link } from "react-router-dom";
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Container from "../components/ui/Container";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { CATEGORIES } from "../constants";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-gray-200 bg-gray-50 pt-16 pb-8 dark:border-zinc-900 dark:bg-zinc-950">
      <Container>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="text-2xl font-extrabold tracking-tighter text-brand-500">
              SHITBLEJ
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {t("footer.tagline")}
            </p>
            <div className="mt-5 flex gap-2.5">
              <SocialLink href="#" icon={<FaFacebook />} label="Facebook" />
              <SocialLink href="#" icon={<FaTwitter />} label="Twitter" />
              <SocialLink href="#" icon={<FaInstagram />} label="Instagram" />
              <SocialLink href="#" icon={<FaLinkedin />} label="LinkedIn" />
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              Shop
            </h3>
            <ul className="space-y-2.5">
              {CATEGORIES.slice(0, 5).map((c) => (
                <FooterLink key={c.id} to={`/collections/${c.id}`} text={c.label} />
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              {t("footer.quick_links")}
            </h3>
            <ul className="space-y-2.5">
              <FooterLink to="/sell" text={t("footer.sell_item")} />
              <FooterLink to="/login" text={t("footer.login")} />
              <FooterLink to="#" text={t("footer.help_center")} />
              <FooterLink to="#" text={t("footer.terms_of_service")} />
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              {t("footer.stay_connected")}
            </h3>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {t("footer.newsletter_text")}
            </p>
            <form
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-white p-1 pl-4 dark:border-zinc-700 dark:bg-zinc-900"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder={t("footer.email_placeholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 dark:border-zinc-800 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Shitblej. {t("footer.all_rights_reserved")}
          </p>
          <div className="flex items-center gap-6">
            <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-500">
              <Link to="#" className="transition-colors hover:text-brand-500">{t("footer.privacy")}</Link>
              <Link to="#" className="transition-colors hover:text-brand-500">{t("footer.terms")}</Link>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </Container>
    </footer>
  );
};

const SocialLink = ({ href, icon, label }) => (
  <a
    href={href}
    aria-label={label}
    className="grid h-9 w-9 place-items-center rounded-full bg-gray-200 text-gray-600 transition-all duration-250 hover:bg-brand-500 hover:text-white dark:bg-zinc-800 dark:text-gray-400"
  >
    {icon}
  </a>
);

const FooterLink = ({ to, text }) => (
  <li>
    <Link
      to={to}
      className="text-sm text-gray-500 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
    >
      {text}
    </Link>
  </li>
);

export default Footer;
