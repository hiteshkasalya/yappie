"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";

export interface CollegeItem {
  id: string;
  name: string;
  short: string;
  aliases: string[];
}

export const COLLEGES: CollegeItem[] = [
  { id: "AIT Pune", name: "Army Institute of Technology, Pune", short: "AIT", aliases: ["AIT", "Army"] },
  { id: "COEP", name: "COEP Technological University, Pune", short: "COEP", aliases: ["COEP"] },
  { id: "Cummins", name: "Cummins College of Engineering, Pune", short: "CCOEW", aliases: ["Cummins", "CCOEW"] },
  { id: "DY Patil", name: "D. Y. Patil College of Engineering, Pune", short: "DYP", aliases: ["DY Patil", "DYP", "D.Y. Patil"] },
  { id: "MITAOE", name: "MIT Academy of Engineering, Pune", short: "MITAOE", aliases: ["MITAOE"] },
  { id: "MIT WPU", name: "MIT World Peace University, Pune", short: "MIT-WPU", aliases: ["MIT", "MIT WPU", "MIT-WPU", "WPU"] },
  { id: "PICT", name: "Pune Institute of Computer Technology, Pune", short: "PICT", aliases: ["PICT", "Pune Institute"] },
  { id: "Symbiosis", name: "Symbiosis International University, Pune", short: "SIU", aliases: ["Symbiosis", "SIU", "Symbi"] },
  { id: "VIT Pune", name: "Vishwakarma Institute of Technology, Pune", short: "VIT", aliases: ["VIT", "Vishwakarma"] },
  { id: "Other", name: "Other / Not Listed", short: "Global stream", aliases: ["Other", "Global"] },
];

interface CollegeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedValue: string;
  onChange: (value: string) => void;
}

function getSearchScore(college: CollegeItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const name = college.name.toLowerCase();
  const id = college.id.toLowerCase();
  const aliases = college.aliases.map((a) => a.toLowerCase());
  if (aliases.includes(q) || id === q) return 100;
  if (aliases.some((a) => a.startsWith(q)) || id.startsWith(q)) return 80;
  if (name === q) return 90;
  if (name.startsWith(q)) return 70;
  if (aliases.some((a) => a.includes(q)) || id.includes(q)) return 60;
  if (name.includes(q)) return 50;
  return 0;
}

export function CollegeSelectorModal({
  isOpen,
  onClose,
  selectedValue,
  onChange,
}: CollegeSelectorModalProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      document.body.style.overflow = "hidden";
    } else {
      setSearch("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const filteredColleges = useMemo(() => {
    const q = search.trim();
    if (!q) {
      return [...COLLEGES].sort((a, b) => {
        if (a.id === "Other") return 1;
        if (b.id === "Other") return -1;
        return a.name.localeCompare(b.name);
      });
    }
    return COLLEGES.map((c) => ({ college: c, score: getSearchScore(c, q) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.college.name.localeCompare(b.college.name)))
      .map((item) => item.college);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div
      className="cs-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Select college"
    >
      <div className="cs-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Handle bar (mobile) */}
        <div className="cs-handle" />

        {/* Header */}
        <div className="cs-header">
          <div>
            <h3 className="cs-title">Choose your college</h3>
            <p className="cs-subtitle">Pune colleges listed — search or pick below</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cs-close"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="cs-search-wrap">
          <Search className="cs-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name or code — e.g. PICT, VIT, MIT…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cs-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); inputRef.current?.focus(); }}
              className="cs-search-clear"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* List */}
        <div className="cs-list">
          {filteredColleges.length > 0 ? (
            filteredColleges.map((c) => {
              const isSelected = selectedValue === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); onClose(); }}
                  className={`cs-item${isSelected ? " cs-item--selected" : ""}`}
                >
                  <div className="cs-item-text">
                    <span className="cs-item-name">{c.name}</span>
                    <span className="cs-item-short">{c.short}</span>
                  </div>
                  {isSelected && (
                    <div className="cs-item-check">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="cs-empty">
              <p className="cs-empty-text">No colleges match &ldquo;{search}&rdquo;</p>
              <button
                type="button"
                onClick={() => { onChange("Other"); onClose(); }}
                className="cs-empty-btn"
              >
                Select &ldquo;Other&rdquo; — Global stream
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
