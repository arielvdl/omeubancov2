"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

const mascots = [
  "fox_loop.mp4",
  "lion_loop.mp4",
  "cat_loop.mp4",
  "dino_loop.mp4",
  "unicorn_loop.mp4",
  "cow_loop.mp4",
  "spitz_loop.mp4",
  "giraffe_loop.mp4",
];

const BASE_URL =
  "https://storage.googleapis.com/omeubanco-assets/characters/";

const rotations = [-2, 1.5, -1, 2.5, -1.5, 1, -2.5, 2];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % mascots.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Show 3 cards: previous (behind left), current (front center), next (behind right)
  const prev = (current - 1 + mascots.length) % mascots.length;
  const next = (current + 1) % mascots.length;

  return (
    <div className="relative h-[240px] w-[300px] sm:h-[280px] sm:w-[340px]">
      {/* Previous card - behind left */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`prev-${prev}`}
          className="absolute left-0 top-[20px] h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]"
          initial={{ opacity: 0, x: -30, scale: 0.7, rotate: -5 }}
          animate={{ opacity: 0.5, x: 0, scale: 0.75, rotate: rotations[prev] }}
          exit={{ opacity: 0, x: -40, scale: 0.6 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <div className="h-full w-full rounded-2xl bg-white p-2.5 shadow-md">
            <video
              src={`${BASE_URL}${mascots[prev]}`}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full rounded-xl object-contain"
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Next card - behind right */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`next-${next}`}
          className="absolute right-0 top-[20px] h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]"
          initial={{ opacity: 0, x: 30, scale: 0.7, rotate: 5 }}
          animate={{ opacity: 0.5, x: 0, scale: 0.75, rotate: rotations[next] }}
          exit={{ opacity: 0, x: 40, scale: 0.6 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <div className="h-full w-full rounded-2xl bg-white p-2.5 shadow-md">
            <video
              src={`${BASE_URL}${mascots[next]}`}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full rounded-xl object-contain"
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Current card - front center */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`current-${current}`}
          className="absolute left-1/2 top-0 h-[240px] w-[240px] sm:h-[280px] sm:w-[280px]"
          style={{ marginLeft: "-120px" }}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: rotations[current],
          }}
          exit={{ opacity: 0, scale: 0.85, y: -30 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="h-full w-full rounded-2xl bg-white p-3 shadow-xl">
            <video
              src={`${BASE_URL}${mascots[current]}`}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full rounded-xl object-contain"
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="absolute -bottom-8 left-1/2 flex -translate-x-1/2 gap-1.5">
        {mascots.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 bg-black/70"
                : "w-2 bg-black/20 hover:bg-black/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
