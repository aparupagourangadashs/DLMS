"use client";

import { useState } from "react";
import { BookOpen, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { collections, filterPublicCourses, publicCourses, type CollectionSlug } from "@/lib/website/content";
import { PublicCourseCard, WebsiteIntro } from "./WebsiteUi";

export function WebsiteCatalog({ slug }: { slug: CollectionSlug }) {
  const collection = collections.find((item) => item.slug === slug)!;
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [format, setFormat] = useState("all");
  const [teacher, setTeacher] = useState("all");
  const [limit, setLimit] = useState(12);
  const items = publicCourses.filter((course) => course.collection === slug);
  const filtered = filterPublicCourses(items, { query, language, format, teacher });
  function reset() { setQuery(""); setLanguage("all"); setFormat("all"); setTeacher("all"); setLimit(12); }
  return <>
    <WebsiteIntro eyebrow="Course collections" title={collection.title} description={collection.description} />
    <section className="web-section web-container">
      <div className="web-catalog-toolbar"><label className="web-search"><Search size={20} aria-hidden="true" /><span className="sr-only">Search courses</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(12); }} placeholder="Find a subject that speaks to you…" /></label><span className="web-preview-label">Official IBMV listings · Enroll on the official site</span></div>
      <div className="web-catalog-layout">
        <aside className="web-filters" aria-label="Course filters">
          <h2><SlidersHorizontal size={18} aria-hidden="true" />Refine your search</h2>
          <details open><summary>Language</summary><label><span>Listed course language</span><select value={language} onChange={(event) => { setLanguage(event.target.value); setLimit(12); }}><option value="all">All languages</option>{[...new Set(items.map((course) => course.language))].map((value) => <option key={value}>{value}</option>)}</select></label><p className="web-filter-note">Only languages explicitly named in course titles are classified. Confirm other languages on the official page.</p></details>
          <details open><summary>Format</summary><label><span>Study format</span><select value={format} onChange={(event) => { setFormat(event.target.value); setLimit(12); }}><option value="all">All formats</option>{[...new Set(items.map((course) => course.mode))].map((value) => <option key={value}>{value}</option>)}</select></label></details>
          <details open><summary>Teachers</summary><label><span>Listed teaching team</span><select value={teacher} onChange={(event) => { setTeacher(event.target.value); setLimit(12); }}><option value="all">All teams</option>{[...new Set(items.map((course) => course.instructor))].map((name) => <option key={name}>{name}</option>)}</select></label></details>
          <button className="web-text-button" onClick={reset}><RotateCcw size={15} aria-hidden="true" />Reset filters</button>
        </aside>
        <div><p className="web-results" role="status">{filtered.length} {filtered.length === 1 ? "course" : "courses"} found</p>{filtered.length ? <><div className="web-course-grid web-catalog-grid">{filtered.slice(0, limit).map((course) => <PublicCourseCard key={course.slug} course={course} />)}</div>{filtered.length > limit && <div className="web-load-more"><p>Showing {limit} of {filtered.length} courses</p><button className="web-btn" onClick={() => setLimit((value) => value + 12)}>Show more courses</button></div>}</> : <div className="web-empty"><BookOpen size={42} aria-hidden="true" /><h2>A different path, perhaps?</h2><p>No courses match these filters. Try a different search or reset your choices.</p><button className="web-btn" onClick={reset}>Clear filters</button></div>}</div>
      </div>
    </section>
  </>;
}
