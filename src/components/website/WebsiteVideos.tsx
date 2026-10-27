"use client";

import { Modal } from "@/components/ui/Modal";
import { officialVideoPlaylist, websiteVideos } from "@/lib/website/community";
import { ArrowUpRight, ExternalLink, Play, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function WebsiteVideos() {
  const [selected, setSelected] = useState<(typeof websiteVideos)[number] | null>(null);
  return <section id="videos" className="web-section web-videos" aria-labelledby="web-videos-title">
    <div className="web-container">
      <div className="web-section-heading"><div><p className="web-eyebrow">Videos · The vision behind IBMV</p><h2 id="web-videos-title">Supporting students.<br /><em>Sharing sacred knowledge.</em></h2></div><div><p>Learn about the Mahavidyalaya&apos;s service to students of Sanskrit and Srimad-Bhagavatam, and hear Vaishnava leaders speak about the value of supporting scriptural education.</p><a className="web-text-link" href={officialVideoPlaylist} target="_blank" rel="noopener noreferrer">Watch the official playlist<ArrowUpRight size={17} aria-hidden="true" /></a></div></div>
      <div className="web-video-grid">{websiteVideos.map((video, index) => <article className="web-video-card" key={video.id}>
        <button type="button" className="web-video-thumbnail" onClick={() => setSelected(video)} aria-label={`Watch video: ${video.title}`} aria-haspopup="dialog"><Image src={video.image} alt="" width={960} height={540} sizes="(min-width: 1024px) 400px, (min-width: 768px) 45vw, 90vw" /><span className="web-video-play"><Play size={24} fill="currentColor" aria-hidden="true" /></span><span className="web-video-number">0{index + 1} / IBMV FILMS</span></button>
        <div className="web-video-caption"><p className="web-eyebrow">Perspectives on IBMV</p><h3>{video.speaker}</h3><p>Speaking about ISKCON Bhagavata Mahavidyalaya</p><button type="button" className="web-text-link" onClick={() => setSelected(video)} aria-label={`Play ${video.speaker} video`}>Watch video<Play size={14} aria-hidden="true" /></button></div>
      </article>)}</div>
      <p className="web-video-privacy"><ShieldCheck size={16} aria-hidden="true" />Thumbnails are hosted here. YouTube loads only after you choose a video; playback is not automatic.</p>
    </div>
    <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.title ?? "IBMV video"} size="lg" className="web-video-dialog">
      {selected && <><div className="web-video-frame"><iframe key={selected.id} src={`https://www.youtube-nocookie.com/embed/${selected.id}?rel=0`} title={selected.title} allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div><p className="web-video-dialog-note">YouTube is an external service and may process playback data. If playback is unavailable here, <a href={`https://www.youtube.com/watch?v=${selected.id}`} target="_blank" rel="noopener noreferrer">watch on YouTube<ExternalLink size={13} aria-hidden="true" /></a>.</p></>}
    </Modal>
  </section>;
}
