"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Check, GraduationCap } from "lucide-react";

export interface CollegeItem {
  id: string;
  name: string;
  aliases: string[];
}

export const COLLEGES: CollegeItem[] = [
  { id: "AIT Pune", name: "Army Institute of Technology (AIT)", aliases: ["AIT", "Army"] },
  { id: "COEP", name: "COEP Technological University", aliases: ["COEP"] },
  { id: "Cummins", name: "Cummins College of Engineering", aliases: ["Cummins", "CCOEW"] },
  { id: "DY Patil", name: "D. Y. Patil College of Engineering", aliases: ["DY Patil", "DYP", "D.Y. Patil"] },
  { id: "MITAOE", name: "MIT Academy of Engineering (MITAOE)", aliases: ["MITAOE"] },
  { id: "MIT WPU", name: "MIT-WPU", aliases: ["MIT", "MIT WPU", "MIT-WPU", "WPU"] },
  { id: "PICT", name: "Pune Institute of Computer Technology (PICT)", aliases: ["PICT", "Pune Institute"] },
  { id: "Symbiosis", name: "Symbiosis International University (SIU)", aliases: ["Symbiosis", "SIU", "Symbi"] },
  { id: "VIT Pune", name: "Vishwakarma Institute of Technology (VIT)", aliases: ["VIT", "Vishwakarma"] },
  { id: "Other", name: "Other", aliases: ["Other", "Global"] }
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
  const aliases = college.aliases.map(a => a.toLowerCase());

  // Exact abbreviation or code match -> Highest Rank (100)
  if (aliases.includes(q) || id === q) return 100;

  // Starts-with abbreviation or code match -> Rank 80
  if (aliases.some(a => a.startsWith(q)) || id.startsWith(q)) return 80;

  // Exact full name match -> Rank 90
  if (name === q) return 90;

  // Starts-with full name match -> Rank 70
  if (name.startsWith(q)) return 70;

  // Includes abbreviation/alias match -> Rank 60
  if (aliases.some(a => a.includes(q)) || id.includes(q)) return 60;

  // Includes name match -> Rank 50
  if (name.includes(q)) return 50;

  return 0;
}

export function CollegeSelectorModal({
  isOpen,
  onClose,
  selectedValue,
  onChange
}: CollegeSelectorModalProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      document.body.style.overflow = "hidden"; // Prevent background body scroll
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
      // Sort alphabetically, but keep "Other" at the bottom
      return [...COLLEGES].sort((a, b) => {
        if (a.id === "Other") return 1;
        if (b.id === "Other") return -1;
        return a.name.localeCompare(b.name);
      });
    }

    return COLLEGES.map(c => ({
      college: c,
      score: getSearchScore(c, q)
    }))
      .filter(item => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.college.name.localeCompare(b.college.name);
      })
      .map(item => item.college);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-[440px] bg-[#0d0e12] border-t sm:border border-zinc-800/80 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[75vh] animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Select College</h3>
              <p className="text-[10px] text-zinc-500 font-medium">Choose your university stream</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-zinc-900">
          <div className="relative flex items-center bg-zinc-950/70 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus-within:border-purple-500/50 transition">
            <Search className="h-4 w-4 text-zinc-500 shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name or abbreviation (e.g. PICT)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none text-white text-xs w-full focus:outline-none placeholder-zinc-600"
            />
            {search && (
              <button 
                type="button" 
                onClick={() => {
                  setSearch("");
                  inputRef.current?.focus();
                }}
                className="p-0.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white shrink-0 ml-1.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* List of Colleges */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
          {filteredColleges.length > 0 ? (
            filteredColleges.map((c) => {
              const isSelected = selectedValue === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between text-left px-4 py-3.5 rounded-xl transition duration-150 active:scale-[0.99] border ${
                    isSelected 
                      ? "bg-purple-950/20 border-purple-500/40 text-purple-200" 
                      : "bg-zinc-900/30 border-transparent hover:bg-zinc-900/70 hover:border-zinc-800/80 text-zinc-300"
                  }`}
                >
                  <span className="font-sans text-xs font-bold tracking-normal leading-snug">
                    {c.name}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-purple-400 shrink-0 ml-3" />
                  )}
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 px-4 text-zinc-500">
              <p className="text-xs font-medium mb-1">No colleges found matching &ldquo;{search}&rdquo;</p>
              <p className="text-[10px] text-zinc-600">Try searching with other keywords or select &ldquo;Other&rdquo; below.</p>
              
              <button
                type="button"
                onClick={() => {
                  onChange("Other");
                  onClose();
                }}
                className="mt-4 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold rounded-lg transition active:scale-95"
              >
                Select &ldquo;Other&rdquo; (Global Stream)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
