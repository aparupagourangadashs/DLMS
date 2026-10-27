import { publishedCommunityFigures, testimonials, testimonialSource } from "@/lib/website/community";
import { ArrowUpRight, Globe2, Quote } from "lucide-react";
import Image from "next/image";

export function WebsiteTestimonials() {
  return <section id="testimonials" className="web-section web-testimonials" aria-labelledby="web-testimonials-title">
    <div className="web-container">
      <div className="web-section-heading"><div><p className="web-eyebrow">Testimonials</p><h2 id="web-testimonials-title">A shared commitment<br /><em>to Bhagavata study.</em></h2></div><div><p>Hear from Vaishnava teachers about the Mahavidyalaya&apos;s contribution to scriptural study, its students and its service to the wider devotee community.</p><a className="web-text-link" href={testimonialSource} target="_blank" rel="noopener noreferrer">Read the full testimonials<ArrowUpRight size={17} aria-hidden="true" /></a></div></div>
      <div className="web-community-figures">{publishedCommunityFigures.map((figure) => <div className={`web-community-figure web-art-${figure.color}`} key={figure.label}><strong>{figure.value}</strong><span>{figure.label}</span></div>)}</div>
      <p className="web-figure-note"><Globe2 size={14} aria-hidden="true" />Figures previously published by IBMV, not live enrollment counts. The course total covers more than the listings shown here.</p>
      <div className="web-testimonial-grid">{testimonials.map((testimonial) => <figure className="web-testimonial-card" key={testimonial.name}>
        <div className="web-testimonial-top"><Image src={testimonial.image} alt={testimonial.name} width={131} height={131} sizes="80px" /><Quote size={32} strokeWidth={1.3} aria-hidden="true" /></div>
        <blockquote><p>&ldquo;{testimonial.excerpt}&rdquo;</p></blockquote>
        <figcaption><strong>{testimonial.name}</strong><span>Excerpt · IBMV testimonial</span></figcaption>
      </figure>)}</div>
    </div>
  </section>;
}
