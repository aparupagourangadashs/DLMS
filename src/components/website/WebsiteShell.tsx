"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronDown, ExternalLink, Heart, Menu, Play, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Modal } from "@/components/ui/Modal";
import { collections, institutionLinks } from "@/lib/website/content";
import { officialVideoPlaylist } from "@/lib/website/community";

const groups = [
  { label: "Courses", links: collections },
  { label: "Publications", links: [{ slug: "books", title: "Books" }, { slug: "e-magazines", title: "E-Magazines" }] },
  { label: "About us", links: institutionLinks },
];

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
      <div className="web-utility"><div className="web-container"><span><Sparkles size={12} aria-hidden="true" />Rooted in wisdom. Connected through learning.</span><div className="web-utility-links"><Link href="/website#testimonials">Testimonials</Link><Link href="/website#videos">Videos</Link><Link href="/">All portals <ArrowUpRight size={12} aria-hidden="true" /></Link></div></div></div>
      <header ref={headerRef} className="web-header" data-over-hero={path === "/website" ? "" : undefined}>
        <div className="web-container web-header-inner">
          <Link href="/website" className="web-brand web-header-brand" aria-label="IBMV public website home"><span className="web-logo"><Logo size={46} decorative /></span><span className="web-header-wordmark"><span className="web-header-title">ISKCON</span><span className="web-brand-subtitle">Bhagavata Mahavidyalaya</span></span></Link>
          <nav className="web-desktop-nav" aria-label="Public website">
            <Link href="/website" aria-current={path === "/website" ? "page" : undefined}>Home</Link>
            {groups.map((group) => <details className="web-dropdown" name="public-navigation" key={group.label} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.currentTarget.removeAttribute("open"); event.currentTarget.querySelector("summary")?.focus(); } }}><summary>{group.label}<ChevronDown size={13} aria-hidden="true" /></summary><div>{group.links.map((item) => <Link href={`/website/${item.slug}`} key={item.slug} aria-current={path === `/website/${item.slug}` ? "page" : undefined} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>{item.title}<ArrowRight size={14} aria-hidden="true" /></Link>)}</div></details>)}
            <Link href="/website/contact" aria-current={path === "/website/contact" ? "page" : undefined}>Contact</Link>
          </nav>
          <div className="web-header-actions"><Link href="/website/account" className="web-btn web-btn-gold web-btn-small">Learner access <ArrowRight size={15} aria-hidden="true" /></Link><button className="web-menu-button" type="button" aria-label="Open website navigation" aria-expanded={menu} aria-haspopup="dialog" onClick={() => setMenu(true)}><Menu size={23} aria-hidden="true" /></button></div>
        </div>
      </header>
      <main id="website-main">{children}</main>
      <footer className="web-footer">
        <div className="web-container web-footer-invitation"><div><p className="web-eyebrow"><Sparkles size={14} aria-hidden="true" />Your next chapter begins with a question</p><h2>Stay curious.<br /><em>Keep growing.</em></h2></div><div><p>Find a subject that stays with you, a book to return to, or a community of thoughtful learners.</p><Link className="web-btn web-btn-gold" href="/website/self-study">Find your learning path<ArrowUpRight size={18} aria-hidden="true" /></Link></div></div>
        <div className="web-container web-footer-grid">
          <div><Link href="/website" className="web-brand"><span className="web-logo"><Logo size={38} decorative /></span><span>IBMV<span className="web-brand-subtitle">Bhagavata Mahavidyalaya</span></span></Link><p>A space for thoughtful study, meaningful questions and a deeper connection with wisdom.</p><div className="web-footer-principles"><span><BookOpen size={14} aria-hidden="true" />Study with purpose</span><span><Heart size={14} aria-hidden="true" />Grow through service</span></div><span className="web-footer-note">Public website design preview</span></div>
          <div><h2>Find your path</h2>{collections.map((item) => <Link key={item.slug} href={`/website/${item.slug}`}>{item.title}</Link>)}</div>
          <div><h2>Discover IBMV</h2>{institutionLinks.map((item) => <Link key={item.slug} href={`/website/${item.slug}`}>{item.title}</Link>)}<Link href="/website/contact">Contact us</Link></div>
          <div><h2>Keep exploring</h2><Link href="/website/books">Books & publications</Link><Link href="/website/e-magazines">E-Magazines</Link><Link href="/website#testimonials">Testimonials</Link><Link href="/website#videos">Videos</Link><a href={officialVideoPlaylist} target="_blank" rel="noopener noreferrer"><Play size={12} aria-hidden="true" />Official video playlist<ExternalLink size={12} aria-hidden="true" /></a><Link href="/website/account">Learner access</Link><a href="https://www.ibmedu.org/" target="_blank" rel="noopener noreferrer">Official IBMV website <ExternalLink size={12} aria-hidden="true" /></a></div>
        </div>
        <div className="web-container web-footer-bottom"><span>IBMV · Study. Reflect. Grow.<span className="web-footer-disclaimer">Enrollment and payments remain on the official site.</span></span><div><Link href="/website/privacy">Privacy notice</Link><Link href="/website/terms">Preview terms</Link><Link href="/">Portal selector</Link></div></div>
      </footer>
      <Modal open={menu} onClose={() => setMenu(false)} title="Explore IBMV" variant="drawer" side="right">
        <nav aria-label="Mobile public website" className="web-mobile-links"><Link href="/website" onClick={() => setMenu(false)}>Home</Link>{groups.map((group) => <details key={group.label} open><summary>{group.label}</summary>{group.links.map((item) => <Link key={item.slug} href={`/website/${item.slug}`} onClick={() => setMenu(false)}>{item.title}</Link>)}</details>)}<Link href="/website#testimonials" onClick={() => setMenu(false)}>Testimonials</Link><Link href="/website#videos" onClick={() => setMenu(false)}>Videos</Link><Link href="/website/contact" onClick={() => setMenu(false)}>Contact us</Link><Link href="/website/account" onClick={() => setMenu(false)}>Learner access</Link></nav>
      </Modal>
    </div>
  );
}
