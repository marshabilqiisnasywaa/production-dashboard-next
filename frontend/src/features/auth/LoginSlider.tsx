"use client";
import { useEffect, useState } from "react";

const slides = [
  {
    image: "/assets/login/slide-1.jpg",
    position: "60% center",
    eyebrow: "Production Dashboard",
    title: "Morning Meeting & Production KPI",
    lead: "Satu tempat untuk membaca KPI produksi dan menjalankan morning meeting harian.",
  },
  {
    image: "/assets/login/slide-2.jpg",
    position: "78% center",
    eyebrow: "Morning Meeting",
    title: "Mulai Hari dengan Prioritas yang Jelas",
    lead: "Bahas KPI tiap area, catat abnormality, dan tetapkan follow-up dalam satu alur meeting.",
  },
  {
    image: "/assets/login/slide-3.jpg",
    position: "72% center",
    eyebrow: "Production KPI",
    title: "Pantau Kinerja Produksi per Area",
    lead: "Lihat capaian terhadap target dan temukan area yang perlu segera ditindaklanjuti.",
  },
];

const SLIDE_DURATION = 5000;

export default function LoginSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % slides.length), SLIDE_DURATION);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <section className="mml-login__brand" aria-roledescription="carousel" aria-label="Tentang Production Dashboard">
      {slides.map((slide, index) => (
        <div
          key={slide.image}
          className={`mml-login__bg${index === active ? " mml-login__bg--active" : ""}`}
          style={{ backgroundImage: `url(${slide.image})`, backgroundPosition: slide.position }}
          aria-hidden="true"
        />
      ))}
      <img className="mml-login__logo" src="/assets/oppo-logo-dark.png" alt="OPPO Indonesia Manufacturing" />
      <div className="mml-login__brand-bottom">
        <div className="mml-login__slides">
          {slides.map((slide, index) => (
            <div
              key={slide.image}
              className={`mml-login__brand-copy${index === active ? " mml-login__brand-copy--active" : ""}`}
              aria-hidden={index !== active}
            >
              <p className="mml-login__eyebrow">{slide.eyebrow}</p>
              <h1 className="mml-login__title">{slide.title}</h1>
              <p className="mml-login__lead">{slide.lead}</p>
            </div>
          ))}
        </div>
        <div className="mml-login__dots">
          {slides.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              className={`mml-login__dot${index === active ? " mml-login__dot--active" : ""}`}
              onClick={() => setActive(index)}
              aria-label={`Tampilkan slide ${index + 1}`}
              aria-current={index === active}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
