"use client";

import { Logo } from "@/components/Logo";
import { Modal } from "@/components/ui/Modal";
import { officialVideoPlaylist } from "@/lib/website/community";
import { collections, institutionLinks } from "@/lib/website/content";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronDown, ExternalLink, Heart, Mail, Menu, Phone, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const groups = [
  { label: "Courses", links: collections },
  { label: "Publications", links: [{ slug: "books", title: "Books" }, { slug: "e-magazines", title: "E-Magazines" }] },
  { label: "About us", links: institutionLinks },
];

const socialLinks = [
  { icon: "instagram", label: "Instagram", href: "https://www.instagram.com/ibmedu/" },
  { icon: "facebook", label: "Facebook", href: "https://www.facebook.com/ibmedu.org/" },
  { icon: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/iskcon-bhagavata-mahavidyalaya-b160a4250" },
  { icon: "x", label: "X (Twitter)", href: "https://twitter.com/IskconBhagavata" },
  { icon: "whatsapp", label: "WhatsApp", href: "https://wa.me/+919528006565" },
  { icon: "youtube", label: "YouTube", href: "https://www.youtube.com/channel/UCCumR1TKFJMqL0J88tnB53A" },
];

function SocialLinks({ className = "" }: { className?: string }) {
  return <nav className={`web-social-links ${className}`} aria-label="IBMV social media">
    {socialLinks.map((social) => <a key={social.icon} data-social={social.icon} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`}>
      <span className="web-social-icon" style={{ maskImage: `url(/website/social-${social.icon}.svg)` }} aria-hidden="true" />
      <span className="web-social-tooltip" aria-hidden="true">{social.label}</span>
    </a>)}
  </nav>;
}

export function WebsiteShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const path = usePathname();
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeader = () => {
      const hero = document.querySelector(".web-hero");
      header.toggleAttribute("data-over-hero", path === "/website" && !!hero && hero.getBoundingClientRect().bottom > header.getBoundingClientRect().bottom);
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);
    return () => {
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, [path]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenu(false); };
    desktop.addEventListener("change", closeOnDesktop);
    window.addEventListener("resize", closeOnDesktop);
    const closeDropdowns = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".web-dropdown")) {
        document.querySelectorAll<HTMLDetailsElement>(".web-dropdown[open]").forEach((item) => { item.open = false; });
      }
    };
    document.addEventListener("pointerdown", closeDropdowns);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      window.removeEventListener("resize", closeOnDesktop);
      document.removeEventListener("pointerdown", closeDropdowns);
    };
  }, []);
  return (
    <div className="website-portal" data-website-portal data-theme="light">
      <a href="#website-main" className="web-skip">Skip to content</a>
      <div className="web-topbar">
        <div className="web-container web-topbar-inner">
          <div className="web-topbar-contact">
            <a href="mailto:info@iskconbm.org"><Mail size={17} aria-hidden="true" /><span>info@iskconbm.org</span></a>
            <a href="tel:+919528006565"><Phone size={17} aria-hidden="true" /><span>+91 95280 06565</span></a>
          </div>
          <SocialLinks />
          <a className="web-topbar-donate" href="https://donation.ibmedu.org/" target="_blank" rel="noopener noreferrer" aria-label="Donate (opens in a new tab)"><Heart size={16} aria-hidden="true" />Donate<ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
      </div>
      <header ref={headerRef} className="web-header" data-over-hero={path === "/website" ? "" : undefined}>
        <div className="web-container web-header-inner">
          <Link href="/website" className="web-brand web-header-brand" aria-label="IBMV public website home"><span className="web-logo"><Logo size={46} decorative /></span><span className="web-header-wordmark"><span className="web-header-title">ISKCON</span><span className="web-brand-subtitle">Bhagavata Mahavidyalaya</span></span></Link>
          <nav className="web-desktop-nav" aria-label="Public website">
            <Link href="/website" aria-current={path === "/website" ? "page" : undefined}>Home</Link>
            {groups.map((group) => <details className="web-dropdown" name="public-navigation" key={group.label} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.currentTarget.removeAttribute("open"); event.currentTarget.querySelector("summary")?.focus(); } }}><summary>{group.label}<ChevronDown size={13} aria-hidden="true" /></summary><div>{group.links.map((item) => <Link href={`/website/${item.slug}`} key={item.slug} aria-current={path === `/website/${item.slug}` ? "page" : undefined} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>{item.title}<ArrowRight size={14} aria-hidden="true" /></Link>)}</div></details>)}
            <Link href="/website/contact" aria-current={path === "/website/contact" ? "page" : undefined}>Contact</Link>
          </nav>
          <div className="web-header-actions">
            <a className="web-auth-button web-auth-signup" href="https://www.ibmedu.org/" target="_blank" rel="noopener noreferrer">Sign up<ExternalLink size={14} aria-hidden="true" /></a>
            <a className="web-auth-button web-auth-login" href="https://www.ibmedu.org/" target="_blank" rel="noopener noreferrer">Log in<ExternalLink size={14} aria-hidden="true" /></a>
            <button className="web-menu-button" type="button" aria-label="Open website navigation" aria-expanded={menu} aria-haspopup="dialog" onClick={() => setMenu(true)}><Menu size={23} aria-hidden="true" /></button>
          </div>
        </div>
      </header>
      <main id="website-main">{children}</main>
      <footer className="web-footer">
        <div className="web-container web-footer-invitation"><div><p className="web-eyebrow"><Sparkles size={14} aria-hidden="true" />Vedic education for a life of devotion</p><h2>Study the shastras.<br /><em>Share their wisdom.</em></h2></div><div><p>Begin with the Bhagavad-gita, deepen your study of Srimad-Bhagavatam, or explore the wider Vaishnava tradition through IBMV&apos;s courses and publications.</p><Link className="web-btn web-btn-gold" href="/website/self-study">Find your learning path<ArrowUpRight size={18} aria-hidden="true" /></Link></div></div>
        <div className="web-container web-footer-grid">
          <div><Link href="/website" className="web-brand"><span className="web-logo"><Logo size={38} decorative /></span><span>IBMV<span className="web-brand-subtitle">Bhagavata Mahavidyalaya</span></span></Link><p>A college of Vedic studies in Sri Govardhan dhama, dedicated to scriptural learning, practical application and sharing Srila Prabhupada&apos;s teachings.</p><div className="web-footer-principles"><span><BookOpen size={14} aria-hidden="true" />Study with purpose</span><span><Heart size={14} aria-hidden="true" />Grow through service</span></div><span className="web-footer-note">Public website design preview</span></div>
          <div><h2>Find your path</h2>{collections.map((item) => <Link key={item.slug} href={`/website/${item.slug}`}>{item.title}</Link>)}</div>
          <div><h2>Discover IBMV</h2>{institutionLinks.map((item) => <Link key={item.slug} href={`/website/${item.slug}`}>{item.title}</Link>)}<Link href="/website/contact">Contact us</Link></div>
          <div><h2>Keep exploring</h2><Link href="/website/books">Books & publications</Link><Link href="/website/e-magazines">E-Magazines</Link><Link href="/website#testimonials">Testimonials</Link><Link href="/website#videos">Videos</Link><a href={officialVideoPlaylist} target="_blank" rel="noopener noreferrer"><Play size={12} aria-hidden="true" />Official video playlist<ExternalLink size={12} aria-hidden="true" /></a><Link href="/website/account">Learner access</Link><a href="https://www.ibmedu.org/" target="_blank" rel="noopener noreferrer">Official IBMV website <ExternalLink size={12} aria-hidden="true" /></a></div>
        </div>
        <div className="web-container web-footer-bottom"><span>IBMV · Study. Reflect. Grow.<span className="web-footer-disclaimer">Enrollment and payments remain on the official site.</span></span><div><Link href="/website/privacy">Privacy notice</Link><Link href="/website/terms">Preview terms</Link><Link href="/">Portal selector</Link></div></div>
      </footer>
      <Modal open={menu} onClose={() => setMenu(false)} title="Explore IBMV" variant="drawer" side="right">
        <nav aria-label="Mobile public website" className="web-mobile-links"><Link href="/website" onClick={() => setMenu(false)}>Home</Link>{groups.map((group) => <details key={group.label} open><summary>{group.label}</summary>{group.links.map((item) => <Link key={item.slug} href={`/website/${item.slug}`} onClick={() => setMenu(false)}>{item.title}</Link>)}</details>)}<Link href="/website#testimonials" onClick={() => setMenu(false)}>Testimonials</Link><Link href="/website#videos" onClick={() => setMenu(false)}>Videos</Link><Link href="/website/contact" onClick={() => setMenu(false)}>Contact us</Link><div className="web-mobile-auth"><a href="https://www.ibmedu.org/" target="_blank" rel="noopener noreferrer">Sign up<ExternalLink size={15} aria-hidden="true" /></a><a href="https://www.ibmedu.org/" target="_blank" rel="noopener noreferrer">Log in<ExternalLink size={15} aria-hidden="true" /></a></div></nav>
        <div className="web-social-drawer"><p className="web-eyebrow">Follow IBMV</p><SocialLinks /></div>
      </Modal>
    </div>
  );
}
